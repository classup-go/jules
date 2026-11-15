import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// Fonction utilitaire pour calculer le montant Stripe selon la devise
function getStripeAmount(price: number, currency: string): number {
  if (currency === 'TND') {
    return Math.round(price * 1000) // Millimes
  } else if (currency === 'XOF' || currency === 'XAF') {
    return Math.round(price) // Pas de subdivision
  } else {
    return Math.round(price * 100) // Centimes
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      teacher_id,
      scheduled_at,
      duration,
      student_notes,
      currency = 'EUR',
      exchangeRate = 1,
    } = body

    // Validation des paramètres
    if (!teacher_id || !scheduled_at || !duration) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    // Valider la durée
    const validDurations = [30, 60, 90, 120]
    if (!validDurations.includes(duration)) {
      return NextResponse.json(
        { error: 'Durée invalide. Choisissez 30, 60, 90 ou 120 minutes.' },
        { status: 400 }
      )
    }

    // Vérifier que la date est dans le futur
    const scheduledDate = new Date(scheduled_at)
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'La date doit être dans le futur' },
        { status: 400 }
      )
    }

    // Vérifier qu'il n'y a pas de chevauchement (le même prof au même moment)
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('teacher_id', teacher_id)
      .eq('scheduled_at', scheduled_at)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .single()

    if (existingBooking) {
      return NextResponse.json(
        { error: 'Ce créneau est déjà réservé' },
        { status: 409 }
      )
    }

    // Récupérer le hourly_rate du professeur
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('hourly_rate, display_name, email')
      .eq('id', teacher_id)
      .eq('role', 'teacher')
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    if (!teacher.hourly_rate || teacher.hourly_rate <= 0) {
      return NextResponse.json(
        { error: 'Ce professeur n\'a pas défini son tarif horaire' },
        { status: 400 }
      )
    }

    // Calculer le prix total en EUR
    const totalPriceEur = (teacher.hourly_rate * duration) / 60

    // Conversion en devise locale
    const validCurrencies = ['EUR', 'TND', 'USD', 'XOF', 'XAF']
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: 'Devise non supportée' },
        { status: 400 }
      )
    }

    const localPrice = totalPriceEur * exchangeRate

    // Arrondir selon la devise
    let roundedPrice = localPrice
    if (currency === 'XOF' || currency === 'XAF') {
      roundedPrice = Math.ceil(localPrice / 25) * 25
    } else if (currency === 'TND') {
      roundedPrice = Math.ceil(localPrice * 2) / 2
    } else {
      roundedPrice = Math.round(localPrice * 100) / 100
    }

    // Créer le booking avec status 'pending' (en attente du paiement)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: user.id,
        teacher_id,
        scheduled_at,
        duration,
        hourly_rate_eur: teacher.hourly_rate,
        total_price_eur: totalPriceEur,
        status: 'pending',
        student_notes: student_notes || null,
      })
      .select()
      .single()

    if (bookingError || !booking) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la réservation' },
        { status: 500 }
      )
    }

    // Calculer le montant Stripe
    const stripeAmount = getStripeAmount(roundedPrice, currency)

    // Créer une session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Session 1-to-1 avec ${teacher.display_name}`,
              description: `${duration} minutes - ${scheduledDate.toLocaleString('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}`,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?booking_id=${booking.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/${teacher_id}`,
      metadata: {
        payment_type: 'booking',
        booking_id: booking.id,
        student_id: user.id,
        teacher_id,
        amount_eur: totalPriceEur.toString(),
        amount_local: roundedPrice.toString(),
        currency,
        exchange_rate: exchangeRate.toString(),
      },
    })

    return NextResponse.json({
      url: session.url,
      booking_id: booking.id,
      amount_local: roundedPrice,
      currency,
    })
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la réservation' },
      { status: 500 }
    )
  }
}

// GET: Récupérer les réservations de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'student' ou 'teacher'

    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_student_id_fkey(id, display_name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey(id, display_name, email, avatar_url)
      `)
      .order('scheduled_at', { ascending: true })

    // Filtrer selon le rôle
    if (role === 'teacher') {
      query = query.eq('teacher_id', user.id)
    } else {
      query = query.eq('student_id', user.id)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Get bookings error:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des réservations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('Bookings GET error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
