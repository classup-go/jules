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

// Prix des plans professeur en EUR
const TEACHER_PLANS = {
  free: {
    price: 0,
    commission: 20,
    name: 'Gratuit',
  },
  pro: {
    price: 9.99,
    commission: 10,
    name: 'Pro',
  },
  business: {
    price: 29.99,
    commission: 5,
    name: 'Business',
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est un professeur
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Accès réservé aux professeurs' }, { status: 403 })
    }

    const body = await request.json()
    const { plan_type, currency = 'EUR', exchangeRate = 1 } = body

    // Validation du plan
    if (!['pro', 'business'].includes(plan_type)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    // Vérifier si le professeur a déjà un abonnement actif
    const { data: existingSubscription } = await supabase
      .from('teacher_subscriptions')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Vous avez déjà un abonnement actif' },
        { status: 409 }
      )
    }

    const planDetails = TEACHER_PLANS[plan_type as keyof typeof TEACHER_PLANS]
    const priceEur = planDetails.price

    // Conversion du prix en devise locale
    const validCurrencies = ['EUR', 'TND', 'USD', 'XOF', 'XAF']
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json({ error: 'Devise non supportée' }, { status: 400 })
    }

    const localPrice = priceEur * exchangeRate

    // Arrondir selon la devise
    let roundedPrice = localPrice
    if (currency === 'XOF' || currency === 'XAF') {
      roundedPrice = Math.ceil(localPrice / 25) * 25
    } else if (currency === 'TND') {
      roundedPrice = Math.ceil(localPrice * 2) / 2
    } else {
      roundedPrice = Math.round(localPrice * 100) / 100
    }

    // Calculer le montant Stripe
    const stripeAmount = getStripeAmount(roundedPrice, currency)

    // Créer le checkout Stripe en mode subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Plan ${planDetails.name} - Professeur`,
              description: `Abonnement mensuel Jules Class Go - Commission ${planDetails.commission}% sur vos ventes`,
            },
            unit_amount: stripeAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?teacher_subscription=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/teacher/pricing`,
      metadata: {
        payment_type: 'teacher_subscription',
        teacher_id: user.id,
        plan_type,
        commission_rate: planDetails.commission.toString(),
        amount_eur: priceEur.toString(),
        amount_local: roundedPrice.toString(),
        currency,
        exchange_rate: exchangeRate.toString(),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Teacher subscription creation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'abonnement' },
      { status: 500 }
    )
  }
}
