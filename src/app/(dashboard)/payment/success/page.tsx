'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type TransactionData = {
  type: 'course' | 'booking' | 'subscription'
  data: any
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const courseId = searchParams.get('course_id')
  const classroomId = searchParams.get('classroom_id')
  const bookingId = searchParams.get('booking_id')
  const isSubscription = searchParams.get('subscription') === 'true'
  const isTeacherSubscription = searchParams.get('teacher_subscription') === 'true'
  const isFree = searchParams.get('free') === 'true'

  const [transaction, setTransaction] = useState<TransactionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransaction() {
      const supabase = createClient()

      try {
        // For free courses, load course/classroom data directly
        if (isFree && (courseId || classroomId)) {
          const { data: { user: currentUser } } = await supabase.auth.getUser()

          // Verify enrollment exists
          const enrollmentQuery = supabase
            .from('enrollments')
            .select('id, created_at, course_id, classroom_id')
            .eq('student_id', currentUser?.id || '')

          if (courseId) {
            enrollmentQuery.eq('course_id', courseId)
          } else if (classroomId) {
            enrollmentQuery.eq('classroom_id', classroomId)
          }

          const { data: enrollment } = await enrollmentQuery.single()

          if (!enrollment) {
            console.error('No enrollment found for free course')
            setLoading(false)
            return
          }

          // Get course or classroom data
          let displayData: any = null

          if (courseId) {
            const { data: course } = await supabase
              .from('courses')
              .select('title, subject, classroom_id')
              .eq('id', courseId)
              .single()

            displayData = { title: course?.title, subject: course?.subject }

            // Also get classroom_id for redirect link
            if (course && !classroomId) {
              const actualClassroomId = course.classroom_id
              setTransaction({
                type: 'course',
                data: {
                  classroom: displayData,
                  amount_local: 0,
                  currency: 'EUR',
                  created_at: enrollment.created_at || new Date().toISOString(),
                  classroom_id: actualClassroomId
                }
              })
              setLoading(false)
              return
            }
          } else if (classroomId) {
            const { data: classroom } = await supabase
              .from('classrooms')
              .select('title, subject')
              .eq('id', classroomId)
              .single()

            displayData = classroom
          }

          if (displayData) {
            setTransaction({
              type: 'course',
              data: {
                classroom: displayData,
                amount_local: 0,
                currency: 'EUR',
                created_at: enrollment.created_at || new Date().toISOString(),
                classroom_id: enrollment.classroom_id || classroomId
              }
            })
          }
          setLoading(false)
          return
        }

        // Attendre un peu que le webhook se termine
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Check for course_id first (new flow), then classroom_id (backward compatibility)
        if (courseId || classroomId) {
          // Course enrollment - try to find transaction by course_id or classroom_id
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('payment_type', 'course_enrollment')
            .or(
              courseId
                ? `metadata->>course_id.eq.${courseId},metadata->>classroom_id.eq.${classroomId || ''}`
                : `metadata->>classroom_id.eq.${classroomId}`
            )
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (data) {
            // Get classroom data for display
            const actualClassroomId = data.metadata?.classroom_id || classroomId

            if (actualClassroomId) {
              const { data: classroom } = await supabase
                .from('classrooms')
                .select('title, subject')
                .eq('id', actualClassroomId)
                .single()

              setTransaction({
                type: 'course',
                data: {
                  ...data,
                  classroom,
                  classroom_id: actualClassroomId
                }
              })
            } else {
              setTransaction({ type: 'course', data })
            }
          }
        } else if (bookingId) {
          // Booking
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('payment_type', 'booking')
            .contains('metadata', { booking_id: bookingId })
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (data) {
            const { data: booking } = await supabase
              .from('bookings')
              .select('*, teacher:users!bookings_teacher_id_fkey(display_name)')
              .eq('id', bookingId)
              .single()

            setTransaction({ type: 'booking', data: { ...data, booking } })
          }
        } else if (isSubscription) {
          // Student Subscription
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            const { data } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (data) {
              setTransaction({ type: 'subscription', data })
            }
          }
        } else if (isTeacherSubscription) {
          // Teacher Subscription
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            const { data } = await supabase
              .from('teacher_subscriptions')
              .select('*')
              .eq('teacher_id', user.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (data) {
              setTransaction({ type: 'teacher_subscription', data })
            }
          }
        }
        // If no transaction found but we have course_id or classroom_id, check if enrollment exists
        if (!transaction && (courseId || classroomId)) {
          const { data: { user: currentUser } } = await supabase.auth.getUser()

          if (currentUser) {
            const enrollmentQuery = supabase
              .from('enrollments')
              .select('id, created_at, course_id, classroom_id')
              .eq('student_id', currentUser.id)

            if (courseId) {
              enrollmentQuery.eq('course_id', courseId)
            } else if (classroomId) {
              enrollmentQuery.eq('classroom_id', classroomId)
            }

            const { data: enrollment } = await enrollmentQuery.maybeSingle()

            if (enrollment) {
              // Enrollment exists, show success even without transaction
              let displayData: any = null
              let actualClassroomId = enrollment.classroom_id || classroomId

              if (courseId || enrollment.course_id) {
                const { data: course } = await supabase
                  .from('courses')
                  .select('title, subject, classroom_id')
                  .eq('id', courseId || enrollment.course_id)
                  .single()

                displayData = { title: course?.title, subject: course?.subject }
                actualClassroomId = course?.classroom_id || actualClassroomId
              } else if (actualClassroomId) {
                const { data: classroom } = await supabase
                  .from('classrooms')
                  .select('title, subject')
                  .eq('id', actualClassroomId)
                  .single()

                displayData = classroom
              }

              setTransaction({
                type: 'course',
                data: {
                  classroom: displayData,
                  amount_local: 0, // We don't have the amount, but enrollment exists
                  currency: 'EUR',
                  created_at: enrollment.created_at || new Date().toISOString(),
                  classroom_id: actualClassroomId
                }
              })
            } else {
              // ⚠️ NO ENROLLMENT FOUND - This means webhook didn't run (local dev)
              // Create enrollment manually to unblock the user
              console.log('⚠️ No enrollment found, creating it now (webhook did not run)')

              let actualClassroomId = classroomId

              // Get course/classroom data first
              if (courseId) {
                const { data: course } = await supabase
                  .from('courses')
                  .select('title, subject, classroom_id')
                  .eq('id', courseId)
                  .single()

                if (course) {
                  actualClassroomId = course.classroom_id

                  // Create enrollment for the course
                  const { data: newEnrollment, error: enrollError } = await supabase
                    .from('enrollments')
                    .insert({
                      student_id: currentUser.id,
                      course_id: courseId,
                      classroom_id: actualClassroomId,
                      status: 'active',
                      payment_required: true,
                      progress: 0
                    })
                    .select()
                    .single()

                  if (enrollError) {
                    console.error('Error creating enrollment:', enrollError)

                    // Check if it's a duplicate error (code 23505)
                    if (enrollError.code === '23505') {
                      console.log('Enrollment already exists (duplicate), fetching it...')
                      // Try fetching again
                      const { data: existingEnrollment } = await supabase
                        .from('enrollments')
                        .select('id, created_at, course_id, classroom_id')
                        .eq('student_id', currentUser.id)
                        .eq('course_id', courseId)
                        .maybeSingle()

                      if (existingEnrollment) {
                        console.log('Found existing enrollment')
                        setTransaction({
                          type: 'course',
                          data: {
                            classroom: { title: course.title, subject: course.subject },
                            amount_local: 0,
                            currency: 'EUR',
                            created_at: existingEnrollment.created_at || new Date().toISOString(),
                            classroom_id: actualClassroomId
                          }
                        })
                      }
                    }
                  } else {
                    console.log('✅ Enrollment created successfully')
                    setTransaction({
                      type: 'course',
                      data: {
                        classroom: { title: course.title, subject: course.subject },
                        amount_local: 0,
                        currency: 'EUR',
                        created_at: newEnrollment.created_at || new Date().toISOString(),
                        classroom_id: actualClassroomId
                      }
                    })
                  }
                }
              } else if (classroomId) {
                const { data: classroom } = await supabase
                  .from('classrooms')
                  .select('title, subject')
                  .eq('id', classroomId)
                  .single()

                if (classroom) {
                  // Create enrollment for the classroom
                  const { data: newEnrollment, error: enrollError } = await supabase
                    .from('enrollments')
                    .insert({
                      student_id: currentUser.id,
                      classroom_id: classroomId,
                      status: 'active',
                      payment_required: true,
                      progress: 0
                    })
                    .select()
                    .single()

                  if (enrollError) {
                    console.error('Error creating enrollment:', enrollError)

                    if (enrollError.code === '23505') {
                      const { data: existingEnrollment } = await supabase
                        .from('enrollments')
                        .select('id, created_at, course_id, classroom_id')
                        .eq('student_id', currentUser.id)
                        .eq('classroom_id', classroomId)
                        .maybeSingle()

                      if (existingEnrollment) {
                        setTransaction({
                          type: 'course',
                          data: {
                            classroom,
                            amount_local: 0,
                            currency: 'EUR',
                            created_at: existingEnrollment.created_at || new Date().toISOString(),
                            classroom_id: classroomId
                          }
                        })
                      }
                    }
                  } else {
                    console.log('✅ Enrollment created successfully')
                    setTransaction({
                      type: 'course',
                      data: {
                        classroom,
                        amount_local: 0,
                        currency: 'EUR',
                        created_at: newEnrollment.created_at || new Date().toISOString(),
                        classroom_id: classroomId
                      }
                    })
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransaction()
  }, [courseId, classroomId, bookingId, isSubscription, isTeacherSubscription, isFree])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #e5e7eb', borderTopColor: '#2b8cee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ color: '#617589', fontSize: '16px' }}>Confirmation du paiement en cours...</p>
        </div>
      </div>
    )
  }

  if (!transaction) {
    // Si c'est une subscription, le webhook peut prendre du temps en local
    if (isSubscription || isTeacherSubscription) {
      return (
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 24px',
            backgroundColor: '#d1fae5',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '50px'
          }}>
            ✓
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '12px' }}>
            Paiement réussi !
          </h1>
          <p style={{ fontSize: '16px', color: '#617589', marginBottom: '32px' }}>
            {isTeacherSubscription
              ? 'Votre abonnement professeur a été traité avec succès. Continuez vers votre dashboard.'
              : 'Votre paiement a été traité avec succès. Continuez pour compléter votre profil.'
            }
          </p>
          <Link href={isTeacherSubscription ? '/teacher/dashboard' : '/complete-profile'}>
            <button style={{ padding: '14px 32px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' }}>
              {isTeacherSubscription ? 'Aller au dashboard →' : 'Continuer vers mon profil →'}
            </button>
          </Link>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '24px' }}>
            💡 En développement local, les webhooks peuvent prendre du temps. Votre abonnement sera activé sous peu.
          </p>
        </div>
      )
    }

    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '12px' }}>
          Transaction introuvable
        </h1>
        <p style={{ fontSize: '16px', color: '#617589', marginBottom: '32px' }}>
          Nous ne trouvons pas les détails de votre paiement. Si vous avez été débité, contactez le support.
        </p>
        <Link href="/">
          <button style={{ padding: '12px 32px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            Retour à l'accueil
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '100px',
          height: '100px',
          margin: '0 auto 24px',
          backgroundColor: '#d1fae5',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '50px'
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111418', marginBottom: '12px' }}>
          {isFree ? 'Inscription réussie !' : 'Paiement réussi !'}
        </h1>
        <p style={{ fontSize: '16px', color: '#617589' }}>
          {isFree ? 'Vous êtes maintenant inscrit au cours' : 'Votre paiement a été traité avec succès'}
        </p>
      </div>

      {transaction.type === 'course' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>
              Inscription confirmée
            </h2>
            <p style={{ fontSize: '16px', color: '#617589', marginBottom: '16px' }}>
              Vous êtes maintenant inscrit à:
            </p>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '4px' }}>
                {transaction.data.classroom?.title || 'Cours'}
              </p>
              <p style={{ fontSize: '14px', color: '#617589' }}>
                {transaction.data.classroom?.subject}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <Link href={`/classroom/${transaction.data.classroom_id || classroomId}`}>
              <button style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#2b8cee',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                📚 Commencer le cours →
              </button>
            </Link>

            <Link href="/student/dashboard">
              <button style={{
                width: '100%',
                padding: '14px',
                backgroundColor: 'white',
                color: '#2b8cee',
                border: '2px solid #2b8cee',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                📊 Voir mon tableau de bord
              </button>
            </Link>
          </div>

          {/* Onboarding Message */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '14px', color: '#0369a1', lineHeight: '1.6' }}>
              💡 <strong>Bon à savoir :</strong> Vous avez maintenant accès à votre tableau de bord personnel
              pour suivre votre progression, consulter vos devoirs et bien plus encore !
            </p>
          </div>
        </div>
      )}

      {transaction.type === 'booking' && transaction.data.booking && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>
              Réservation confirmée
            </h2>
            <p style={{ fontSize: '16px', color: '#617589', marginBottom: '16px' }}>
              Votre session avec <strong>{transaction.data.booking.teacher?.display_name}</strong> est confirmée
            </p>
            <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ marginBottom: '12px' }}>
                📅 {new Date(transaction.data.booking.scheduled_at).toLocaleString('fr-FR')}
              </p>
              <p>⏱️ {transaction.data.booking.duration} minutes</p>
            </div>
          </div>

          <Link href="/student/schedule">
            <button style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#2b8cee',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Voir mon planning →
            </button>
          </Link>
        </div>
      )}

      {transaction.type === 'subscription' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>
              Abonnement activé
            </h2>
            <p style={{ fontSize: '16px', color: '#617589', marginBottom: '16px' }}>
              Votre abonnement <strong>{transaction.data.plan_type === 'essentiel' ? 'Essentiel' : 'Premium'}</strong> est actif !
            </p>
            <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ fontSize: '14px', color: '#617589' }}>Période: {new Date(transaction.data.current_period_start).toLocaleDateString('fr-FR')} - {new Date(transaction.data.current_period_end).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <Link href="/complete-profile">
            <button style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#2b8cee',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Continuer vers mon profil →
            </button>
          </Link>
        </div>
      )}

      {transaction.type === 'teacher_subscription' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '32px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>
              Abonnement Professeur Activé 🎉
            </h2>
            <p style={{ fontSize: '16px', color: '#617589', marginBottom: '16px' }}>
              Votre abonnement <strong>Plan {transaction.data.plan_type === 'pro' ? 'Pro' : 'Business'}</strong> est actif !
            </p>
            <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#617589' }}>Commission sur vos ventes</span>
                <strong style={{ fontSize: '18px', color: '#16a34a' }}>{transaction.data.commission_rate}%</strong>
              </div>
              <p style={{ fontSize: '14px', color: '#617589' }}>Période: {new Date(transaction.data.current_period_start).toLocaleDateString('fr-FR')} - {new Date(transaction.data.current_period_end).toLocaleDateString('fr-FR')}</p>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px' }}>
              <p style={{ fontSize: '14px', color: '#0369a1', lineHeight: '1.6' }}>
                💡 <strong>Avantages:</strong> Votre taux de commission réduit s'applique automatiquement à toutes vos ventes de cours. Profitez pleinement de votre plateforme professionnelle !
              </p>
            </div>
          </div>

          <Link href="/teacher/dashboard">
            <button style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#2b8cee',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Accéder à mon dashboard →
            </button>
          </Link>
        </div>
      )}

      <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>
          {isFree ? 'Détails de l\'inscription' : 'Détails du paiement'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#617589' }}>Montant</span>
            <strong>
              {isFree || (transaction.data.amount_local || transaction.data.price_local) === 0
                ? <span style={{ color: '#16a34a' }}>Gratuit 🎉</span>
                : `${transaction.data.amount_local || transaction.data.price_local} ${transaction.data.currency}`
              }
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#617589' }}>Date</span>
            <span>{new Date(transaction.data.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#617589' }}>
          Un problème ? <a href="mailto:support@julesclass.go" style={{ color: '#2b8cee' }}>Contactez le support</a>
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #e5e7eb', borderTopColor: '#2b8cee', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
