import { PaymentConfig, PaymentMethod } from './config'

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  paymentMethod: string
  redirectUrl?: string
  metadata: {
    classroomId: string
    studentId: string
    teacherId: string
  }
}

export interface PaymentResult {
  success: boolean
  paymentIntent?: PaymentIntent
  redirectUrl?: string
  error?: string
}

// Initialiser un paiement selon la méthode choisie
export async function initializePayment(
  amount: number,
  config: PaymentConfig,
  method: PaymentMethod,
  metadata: {
    classroomId: string
    studentId: string
    teacherId: string
    studentEmail: string
    classroomTitle: string
  }
): Promise<PaymentResult> {
  
  switch (config.region) {
    case 'tunisia':
      return initializeTunisianPayment(amount, method, metadata)
    
    case 'africa_fcfa':
      return initializeAfricanPayment(amount, config.currency, method, metadata)
    
    case 'europe':
    case 'international':
      return initializeStripePayment(amount, config.currency, method, metadata)
    
    default:
      return { success: false, error: 'Region not supported' }
  }
}

// === PAIEMENTS TUNISIE (Konnect, Flouci) ===
async function initializeTunisianPayment(
  amount: number,
  method: PaymentMethod,
  metadata: any
): Promise<PaymentResult> {
  
  if (method.id === 'konnect') {
    return initializeKonnectPayment(amount, metadata)
  }
  
  if (method.id === 'flouci') {
    return initializeFlouciPayment(amount, metadata)
  }
  
  return { success: false, error: 'Payment method not supported' }
}

async function initializeKonnectPayment(amount: number, metadata: any): Promise<PaymentResult> {
  try {
    const response = await fetch('/api/payments/konnect/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 1000), // Konnect utilise les millimes
        ...metadata,
      }),
    })

    const data = await response.json()

    if (data.payUrl) {
      return {
        success: true,
        redirectUrl: data.payUrl,
        paymentIntent: {
          id: data.paymentRef,
          amount,
          currency: 'TND',
          status: 'pending',
          paymentMethod: 'konnect',
          metadata,
        },
      }
    }

    return { success: false, error: data.error || 'Konnect initialization failed' }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

async function initializeFlouciPayment(amount: number, metadata: any): Promise<PaymentResult> {
  try {
    const response = await fetch('/api/payments/flouci/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 1000), // Flouci utilise les millimes
        ...metadata,
      }),
    })

    const data = await response.json()

    if (data.result?.link) {
      return {
        success: true,
        redirectUrl: data.result.link,
        paymentIntent: {
          id: data.result.payment_id,
          amount,
          currency: 'TND',
          status: 'pending',
          paymentMethod: 'flouci',
          metadata,
        },
      }
    }

    return { success: false, error: data.error || 'Flouci initialization failed' }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

// === PAIEMENTS AFRIQUE FCFA (CinetPay, Orange Money, Wave, MTN) ===
async function initializeAfricanPayment(
  amount: number,
  currency: string,
  method: PaymentMethod,
  metadata: any
): Promise<PaymentResult> {
  
  if (method.id === 'cinetpay') {
    return initializeCinetPayPayment(amount, currency, metadata)
  }
  
  // Pour Orange Money, Wave, MTN - utiliser CinetPay comme agrégateur
  if (['orange_money', 'wave', 'mtn_money'].includes(method.id)) {
    return initializeCinetPayPayment(amount, currency, metadata, method.id)
  }
  
  return { success: false, error: 'Payment method not supported' }
}

async function initializeCinetPayPayment(
  amount: number, 
  currency: string, 
  metadata: any,
  channel?: string
): Promise<PaymentResult> {
  try {
    const response = await fetch('/api/payments/cinetpay/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency,
        channel,
        ...metadata,
      }),
    })

    const data = await response.json()

    if (data.data?.payment_url) {
      return {
        success: true,
        redirectUrl: data.data.payment_url,
        paymentIntent: {
          id: data.data.payment_token,
          amount,
          currency,
          status: 'pending',
          paymentMethod: channel || 'cinetpay',
          metadata,
        },
      }
    }

    return { success: false, error: data.message || 'CinetPay initialization failed' }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

// === PAIEMENTS STRIPE (Europe + International) ===
async function initializeStripePayment(
  amount: number,
  currency: string,
  method: PaymentMethod,
  metadata: any
): Promise<PaymentResult> {
  try {
    const response = await fetch('/api/payments/stripe/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency: currency.toLowerCase(),
        paymentMethodType: method.id === 'stripe_sepa' ? 'sepa_debit' : 'card',
        ...metadata,
      }),
    })

    const data = await response.json()

    if (data.clientSecret) {
      return {
        success: true,
        paymentIntent: {
          id: data.paymentIntentId,
          amount,
          currency,
          status: 'pending',
          paymentMethod: method.id,
          redirectUrl: data.clientSecret, // Pour Stripe Elements
          metadata,
        },
      }
    }

    return { success: false, error: data.error || 'Stripe initialization failed' }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

// Vérifier le statut d'un paiement
export async function checkPaymentStatus(
  paymentId: string,
  provider: string
): Promise<{ status: string; paid: boolean }> {
  try {
    const response = await fetch(`/api/payments/${provider}/status?id=${paymentId}`)
    const data = await response.json()
    return data
  } catch {
    return { status: 'unknown', paid: false }
  }
}