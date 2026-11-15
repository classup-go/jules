import Stripe from 'stripe'
import { STRIPE_API_VERSION } from './stripe-config'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
})

export const getStripePublishableKey = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

  // Vérifier et corriger le double égal si présent
  if (key.startsWith('=')) {
    console.warn('⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY contient un = au début. Nettoyage automatique.')
    return key.substring(1)
  }

  return key
}