import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { convertPrice, getPaymentConfig } from '@/lib/payment/config'

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
    const { plan_type, currency = 'EUR', exchangeRate = 1 } = body

    // Validation du plan
    if (!['essentiel', 'premium'].includes(plan_type)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    // Vérifier si l'utilisateur a déjà un abonnement actif
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Vous avez déjà un abonnement actif' },
        { status: 409 }
      )
    }

    // Récupérer le prix du plan depuis la table plan_pricing
    const { data: planPricing, error: pricingError } = await supabase
      .from('plan_pricing')
      .select('*')
      .eq('plan_type', plan_type)
      .eq('active', true)
      .single()

    if (pricingError || !planPricing) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 })
    }

    // Conversion du prix en devise locale
    const validCurrencies = ['EUR', 'TND', 'USD', 'XOF', 'XAF']
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json({ error: 'Devise non supportée' }, { status: 400 })
    }

    // Convertir le prix
    const config = getPaymentConfig('FR') // Config par défaut, sera remplacé par la vraie géolocalisation
    const localPrice = planPricing.price_eur * exchangeRate

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
              name: `Plan ${plan_type === 'essentiel' ? 'Essentiel' : 'Premium'}`,
              description: `Abonnement mensuel Jules Class Go - ${plan_type === 'essentiel' ? 'Tous les cours en ligne + QCM illimités' : 'Tous les cours + sessions live illimitées'}`,
            },
            unit_amount: stripeAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?subscription=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
      metadata: {
        payment_type: 'subscription',
        student_id: user.id,
        plan_type,
        amount_eur: planPricing.price_eur.toString(),
        amount_local: roundedPrice.toString(),
        currency,
        exchange_rate: exchangeRate.toString(),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'abonnement' },
      { status: 500 }
    )
  }
}
