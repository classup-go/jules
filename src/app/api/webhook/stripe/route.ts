import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import type { Transaction, PaymentType } from '@/types/database'
import { calculatePlatformFee } from '@/lib/payment/platform-fees'
import { handleWebhookWithRetry, createWebhookResponse, logWebhook } from '@/lib/webhook-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vérifier que le webhook secret est configuré
if (!process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET === 'whsec_xxx' ||
    process.env.STRIPE_WEBHOOK_SECRET.includes('VOTRE_')) {
  console.error('❌ STRIPE_WEBHOOK_SECRET non configuré correctement')
  console.error('   Configurez-le depuis: https://dashboard.stripe.com/webhooks')
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`📨 Webhook received: ${event.type} (${event.id})`)

  // Utiliser handleWebhookWithRetry pour gérer les erreurs intelligemment
  const result = await handleWebhookWithRetry(
    event.type,
    event.id,
    async () => {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break

        case 'invoice.payment_succeeded':
          await handleSubscriptionPayment(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice)
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
          break

        default:
          console.log(`ℹ️  Unhandled event type: ${event.type}`)
      }
    }
  )

  const duration = Date.now() - startTime
  console.log(`✅ Webhook processed in ${duration}ms`)

  // Toujours retourner 200 pour les erreurs permanentes (ne pas retry)
  // Les erreurs temporaires lanceront une exception avant d'arriver ici
  return NextResponse.json(createWebhookResponse(result.success))
}

// ============================================
// Handler: Checkout Session Completed
// ============================================
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata
  if (!metadata) {
    console.error('No metadata in checkout session')
    return
  }

  const paymentType = metadata.payment_type as PaymentType

  console.log(`Processing checkout for payment type: ${paymentType}`)

  // Créer la transaction (universel pour tous les types)
  const transaction = await createTransaction({
    payment_type: paymentType,
    student_id: metadata.student_id!,
    teacher_id: metadata.teacher_id || null,
    amount_eur: parseFloat(metadata.amount_eur!),
    amount_local: parseFloat(metadata.amount_local!),
    currency: metadata.currency!,
    exchange_rate: parseFloat(metadata.exchange_rate!),
    payment_provider: 'stripe',
    provider_transaction_id: session.id,
    provider_payment_intent: session.payment_intent as string,
    status: 'completed',
    metadata: metadata,
  })

  if (!transaction) {
    throw new Error('Failed to create transaction')
  }

  // Traitement spécifique au type de paiement
  switch (paymentType) {
    case 'course_enrollment':
      await handleCourseEnrollment(
        transaction,
        metadata.classroom_id!,
        metadata.course_id || null
      )
      break

    case 'booking':
      await handleBookingConfirmation(transaction, metadata.booking_id!)
      break

    case 'subscription':
      await handleSubscriptionActivation(
        transaction,
        metadata.plan_type!,
        session.subscription as string
      )
      break

    case 'teacher_subscription':
      await handleTeacherSubscriptionActivation(
        transaction,
        metadata.plan_type!,
        metadata.commission_rate!,
        session.subscription as string
      )
      break

    default:
      console.error(`Unknown payment type: ${paymentType}`)
  }
}

// ============================================
// Handler: Subscription Payment (Renouvellement)
// ============================================
async function handleSubscriptionPayment(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscriptionId = invoice.subscription as string

  // Récupérer l'abonnement depuis Supabase
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error(`Subscription not found: ${subscriptionId}`)
    return
  }

  // Créer une transaction pour ce paiement récurrent
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)

  await createTransaction({
    payment_type: 'subscription',
    student_id: subscription.user_id,
    teacher_id: null,
    amount_eur: invoice.amount_paid / 100, // Stripe amount is in cents
    amount_local: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    exchange_rate: 1, // Same currency
    payment_provider: 'stripe',
    provider_transaction_id: invoice.id,
    provider_payment_intent: invoice.payment_intent as string,
    status: 'completed',
    metadata: {
      subscription_id: subscriptionId,
      invoice_id: invoice.id,
      plan_type: subscription.plan_type,
    },
  })

  // Mettre à jour les dates de période
  await supabaseAdmin
    .from('subscriptions')
    .update({
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      status: 'active',
    })
    .eq('id', subscription.id)

  // Mettre à jour users.plan_expires_at
  await supabaseAdmin
    .from('users')
    .update({
      plan_expires_at: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', subscription.user_id)

  console.log(`Subscription renewed: ${subscriptionId}`)
}

// ============================================
// Handler: Payment Failed
// ============================================
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscriptionId = invoice.subscription as string

  // Mettre à jour le statut de l'abonnement
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId)

  // Créer une notification pour l'utilisateur
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription) {
    await supabaseAdmin.rpc('create_notification', {
      p_user_id: subscription.user_id,
      p_type: 'payment',
      p_title: 'Échec du paiement',
      p_message: 'Votre paiement d\'abonnement a échoué. Veuillez mettre à jour vos informations de paiement.',
      p_data: { subscription_id: subscriptionId },
    })
  }

  console.log(`Payment failed for subscription: ${subscriptionId}`)
}

// ============================================
// Handler: Subscription Updated
// ============================================
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const subscriptionId = stripeSubscription.id

  // Récupérer l'abonnement depuis Supabase
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error(`Subscription not found: ${subscriptionId}`)
    return
  }

  // Mettre à jour le statut et les dates
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: stripeSubscription.status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    })
    .eq('id', subscription.id)

  console.log(`Subscription updated: ${subscriptionId}`)
}

// ============================================
// Handler: Subscription Cancelled
// ============================================
async function handleSubscriptionCancelled(stripeSubscription: Stripe.Subscription) {
  const subscriptionId = stripeSubscription.id

  // Mettre à jour le statut
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  // Récupérer l'utilisateur pour mettre à jour son plan
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription) {
    // Repasser en plan gratuit
    await supabaseAdmin
      .from('users')
      .update({
        plan: 'free',
        plan_expires_at: null,
      })
      .eq('id', subscription.user_id)
  }

  console.log(`Subscription cancelled: ${subscriptionId}`)
}

// ============================================
// Type-Specific Handlers
// ============================================

async function handleCourseEnrollment(
  transaction: Partial<Transaction>,
  classroomId: string,
  courseId: string | null = null
) {
  // Build enrollment data
  const enrollmentData: any = {
    classroom_id: classroomId,
    student_id: transaction.student_id!,
    payment_id: transaction.id,
    payment_completed_at: new Date().toISOString(),
    payment_required: true,
    status: 'active',
    progress: 0,
  }

  // Add course_id if it's a course-level enrollment
  if (courseId) {
    enrollmentData.course_id = courseId
  }

  // Créer ou mettre à jour l'enrollment
  const { error: enrollError } = await supabaseAdmin
    .from('enrollments')
    .upsert(enrollmentData)

  if (enrollError) {
    console.error('Failed to create enrollment:', enrollError)
    throw enrollError
  }

  // Incrémenter le compteur d'inscriptions
  if (courseId) {
    // Increment course enrolled_count (will be handled by trigger)
    console.log(`Course enrollment created for course ${courseId}`)
  } else {
    // Backward compatibility: increment classroom enrolled_count
    await supabaseAdmin.rpc('increment_enrolled_count', {
      classroom_id: classroomId,
    })
  }

  // Récupérer les informations du cours ou de la classe
  let title: string
  let teacherId: string

  if (courseId) {
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('title, teacher_id')
      .eq('id', courseId)
      .single()

    if (!course) {
      console.error(`Course not found: ${courseId}`)
      return
    }
    title = course.title
    teacherId = course.teacher_id
  } else {
    const { data: classroom } = await supabaseAdmin
      .from('classrooms')
      .select('title, teacher_id')
      .eq('id', classroomId)
      .single()

    if (!classroom) {
      console.error(`Classroom not found: ${classroomId}`)
      return
    }
    title = classroom.title
    teacherId = classroom.teacher_id
  }

  // Notification pour le professeur
  await supabaseAdmin.rpc('create_notification', {
    p_user_id: teacherId,
    p_type: 'payment',
    p_title: 'Nouveau paiement reçu',
    p_message: `Vous avez reçu ${transaction.amount_local} ${transaction.currency} pour le cours "${title}"`,
    p_data: {
      classroom_id: classroomId,
      course_id: courseId,
      transaction_id: transaction.id,
      amount: transaction.amount_local,
      currency: transaction.currency,
    },
  })

  // Notification pour l'étudiant
  await supabaseAdmin.rpc('create_notification', {
    p_user_id: transaction.student_id!,
    p_type: 'enrollment',
    p_title: 'Inscription confirmée',
    p_message: `Votre paiement a été confirmé pour "${title}". Bon apprentissage !`,
    p_data: {
      classroom_id: classroomId,
      course_id: courseId,
      transaction_id: transaction.id,
    },
  })

  // Create teacher earnings with platform fee
  if (teacherId && transaction.id) {
    try {
      const feeBreakdown = await calculatePlatformFee(
        transaction.amount_eur!,
        transaction.currency as any
      )

      // Calculate available_at: 14 days from now
      const availableAt = new Date()
      availableAt.setDate(availableAt.getDate() + 14)

      const { error: earningsError } = await supabaseAdmin
        .from('teacher_earnings')
        .insert({
          teacher_id: teacherId,
          transaction_id: transaction.id,
          gross_amount: feeBreakdown.grossAmount,
          platform_fee_amount: feeBreakdown.platformFeeAmount,
          platform_fee_percentage: feeBreakdown.platformFeePercentage,
          net_amount: feeBreakdown.netAmount,
          currency: transaction.currency,
          status: 'pending',
          available_at: availableAt.toISOString()
        })

      if (earningsError) {
        console.error('Failed to create teacher earnings:', earningsError)
      } else {
        console.log(`Teacher earnings created for transaction ${transaction.id}: ${feeBreakdown.netAmount} ${transaction.currency}`)
      }
    } catch (error) {
      console.error('Error calculating platform fee:', error)
    }
  }

  if (courseId) {
    console.log(`Course enrollment completed: course ${courseId} in classroom ${classroomId}`)
  } else {
    console.log(`Course enrollment completed: classroom ${classroomId}`)
  }
}

async function handleBookingConfirmation(
  transaction: Partial<Transaction>,
  bookingId: string
) {
  // Mettre à jour le booking
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({
      payment_id: transaction.id,
      status: 'confirmed',
    })
    .eq('id', bookingId)

  if (bookingError) {
    console.error('Failed to update booking:', bookingError)
    throw bookingError
  }

  // Récupérer les détails du booking
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*, teacher:users!bookings_teacher_id_fkey(display_name), student:users!bookings_student_id_fkey(display_name, email)')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    console.error(`Booking not found: ${bookingId}`)
    return
  }

  // Créer une session live pour ce booking
  const { data: liveSession, error: sessionError } = await supabaseAdmin
    .from('live_sessions')
    .insert({
      teacher_id: booking.teacher_id,
      title: `Session 1-to-1 avec ${booking.teacher.display_name}`,
      scheduled_at: booking.scheduled_at,
      duration: booking.duration,
      status: 'scheduled',
      session_type: 'one_to_one',
    })
    .select()
    .single()

  if (!sessionError && liveSession) {
    // Lier la session au booking
    await supabaseAdmin
      .from('bookings')
      .update({ live_session_id: liveSession.id })
      .eq('id', bookingId)
  }

  // Notification pour le professeur
  await supabaseAdmin.rpc('create_notification', {
    p_user_id: booking.teacher_id,
    p_type: 'booking',
    p_title: 'Nouvelle réservation',
    p_message: `${booking.student.display_name} a réservé une session de ${booking.duration} minutes`,
    p_data: {
      booking_id: bookingId,
      scheduled_at: booking.scheduled_at,
      student_name: booking.student.display_name,
    },
  })

  // Notification pour l'étudiant
  await supabaseAdmin.rpc('create_notification', {
    p_user_id: booking.student_id,
    p_type: 'booking',
    p_title: 'Réservation confirmée',
    p_message: `Votre session avec ${booking.teacher.display_name} est confirmée pour le ${new Date(booking.scheduled_at).toLocaleDateString('fr-FR')}`,
    p_data: {
      booking_id: bookingId,
      scheduled_at: booking.scheduled_at,
      teacher_name: booking.teacher.display_name,
    },
  })

  // Create teacher earnings with platform fee
  if (booking.teacher_id && transaction.id) {
    try {
      const feeBreakdown = await calculatePlatformFee(
        transaction.amount_eur!,
        transaction.currency as any,
        'bookings'
      )

      // Calculate available_at: 14 days from now
      const availableAt = new Date()
      availableAt.setDate(availableAt.getDate() + 14)

      const { error: earningsError } = await supabaseAdmin
        .from('teacher_earnings')
        .insert({
          teacher_id: booking.teacher_id,
          transaction_id: transaction.id,
          gross_amount: feeBreakdown.grossAmount,
          platform_fee_amount: feeBreakdown.platformFeeAmount,
          platform_fee_percentage: feeBreakdown.platformFeePercentage,
          net_amount: feeBreakdown.netAmount,
          currency: transaction.currency,
          status: 'pending',
          available_at: availableAt.toISOString()
        })

      if (earningsError) {
        console.error('Failed to create teacher earnings:', earningsError)
      } else {
        console.log(`Teacher earnings created for booking ${bookingId}: ${feeBreakdown.netAmount} ${transaction.currency}`)
      }
    } catch (error) {
      console.error('Error calculating platform fee:', error)
    }
  }

  console.log(`Booking confirmed: ${bookingId}`)
}

async function handleSubscriptionActivation(
  transaction: Partial<Transaction>,
  planType: string,
  stripeSubscriptionId: string
) {
  // Récupérer l'abonnement Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId
  )

  // Créer l'enregistrement subscription dans Supabase
  const { error: subscriptionError } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: transaction.student_id!,
      plan_type: planType,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeSubscription.customer as string,
      current_period_start: new Date(
        stripeSubscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString(),
      status: stripeSubscription.status,
      price_eur: transaction.amount_eur!,
      price_local: transaction.amount_local!,
      currency: transaction.currency!,
    })

  if (subscriptionError) {
    console.error('Failed to create subscription:', subscriptionError)
    throw subscriptionError
  }

  // Mettre à jour le plan de l'utilisateur
  await supabaseAdmin
    .from('users')
    .update({
      plan: planType,
      plan_expires_at: new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('id', transaction.student_id!)

  // Notification pour l'utilisateur
  await supabaseAdmin.rpc('create_notification', {
    p_user_id: transaction.student_id!,
    p_type: 'subscription',
    p_title: 'Abonnement activé',
    p_message: `Votre abonnement ${planType === 'essentiel' ? 'Essentiel' : 'Premium'} est maintenant actif !`,
    p_data: {
      plan_type: planType,
      subscription_id: stripeSubscriptionId,
    },
  })

  console.log(`Subscription activated: ${stripeSubscriptionId}`)
}

async function handleTeacherSubscriptionActivation(
  transaction: Partial<Transaction>,
  planType: string,
  commissionRate: string,
  stripeSubscriptionId: string
) {
  // Récupérer l'abonnement Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId
  )

  // Créer l'enregistrement teacher_subscription dans Supabase
  const { error: subscriptionError } = await supabaseAdmin
    .from('teacher_subscriptions')
    .insert({
      teacher_id: transaction.student_id!, // student_id contient en fait le teacher_id
      plan_type: planType,
      commission_rate: parseFloat(commissionRate),
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeSubscription.customer as string,
      current_period_start: new Date(
        stripeSubscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString(),
      status: stripeSubscription.status,
      price_eur: transaction.amount_eur!,
      price_local: transaction.amount_local!,
      currency: transaction.currency!,
    })

  if (subscriptionError) {
    console.error('Failed to create teacher subscription:', subscriptionError)
    throw subscriptionError
  }

  // Mettre à jour le plan et la commission du professeur
  await supabaseAdmin
    .from('users')
    .update({
      plan: planType,
      commission_rate: parseFloat(commissionRate),
      plan_expires_at: new Date(
        stripeSubscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('id', transaction.student_id!)

  // Notification pour le professeur
  await supabaseAdmin.rpc('create_notification', {
    p_user_id: transaction.student_id!,
    p_type: 'subscription',
    p_title: 'Abonnement professeur activé',
    p_message: `Votre abonnement ${planType === 'pro' ? 'Pro' : 'Business'} est maintenant actif ! Commission: ${commissionRate}%`,
    p_data: {
      plan_type: planType,
      commission_rate: commissionRate,
      subscription_id: stripeSubscriptionId,
    },
  })

  console.log(`Teacher subscription activated: ${stripeSubscriptionId}`)
}

// ============================================
// Utility: Create Transaction
// ============================================
async function createTransaction(data: {
  payment_type: PaymentType
  student_id: string
  teacher_id: string | null
  amount_eur: number
  amount_local: number
  currency: string
  exchange_rate: number
  payment_provider: string
  provider_transaction_id: string
  provider_payment_intent: string
  status: string
  metadata: any
}): Promise<Partial<Transaction> | null> {
  // Générer idempotency key
  const idempotencyKey = `${data.payment_provider}-${data.provider_transaction_id}`

  // Vérifier si la transaction existe déjà
  const { data: existing } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .single()

  if (existing) {
    console.log(`Transaction already exists: ${idempotencyKey}`)
    return existing
  }

  // Créer la transaction
  const { data: transaction, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      payment_type: data.payment_type,
      student_id: data.student_id,
      teacher_id: data.teacher_id,
      amount_eur: data.amount_eur,
      amount_local: data.amount_local,
      currency: data.currency,
      exchange_rate: data.exchange_rate,
      payment_provider: data.payment_provider,
      provider_transaction_id: data.provider_transaction_id,
      provider_payment_intent: data.provider_payment_intent,
      status: data.status,
      metadata: data.metadata,
      idempotency_key: idempotencyKey,
      completed_at: data.status === 'completed' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create transaction:', error)
    return null
  }

  console.log(`Transaction created: ${transaction.id}`)
  return transaction
}
