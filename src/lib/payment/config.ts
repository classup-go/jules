// Configuration des paiements par région
// IMPORTANT : EUR est la devise de base pour tous les prix dans l'application
// Tous les prix en base de données sont stockés en EUR et convertis selon la géolocalisation

export interface PaymentConfig {
  currency: string
  currencySymbol: string
  paymentMethods: PaymentMethod[]
  exchangeRate: number // Taux de conversion depuis EUR
  countryCode: string
  region: 'tunisia' | 'africa_fcfa' | 'europe' | 'international'
}

export interface PaymentMethod {
  id: string
  name: string
  icon: string
  description: string
  fees: number // Pourcentage de frais
}

// Pays utilisant le FCFA
const FCFA_COUNTRIES = [
  'BJ', // Bénin
  'BF', // Burkina Faso
  'CI', // Côte d'Ivoire
  'GW', // Guinée-Bissau
  'ML', // Mali
  'NE', // Niger
  'SN', // Sénégal
  'TG', // Togo
  'CM', // Cameroun
  'CF', // Centrafrique
  'TD', // Tchad
  'CG', // Congo
  'GQ', // Guinée équatoriale
  'GA', // Gabon
]

// Pays européens (Zone Euro)
const EURO_COUNTRIES = [
  'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'IE', 'FI',
  'GR', 'LU', 'MT', 'CY', 'SK', 'SI', 'EE', 'LV', 'LT'
]

// Méthodes de paiement par région
const PAYMENT_METHODS: Record<string, PaymentMethod[]> = {
  tunisia: [
    {
      id: 'konnect',
      name: 'Konnect',
      icon: '🏦',
      description: 'Paiement par carte bancaire tunisienne',
      fees: 2.5,
    },
    {
      id: 'flouci',
      name: 'Flouci',
      icon: '📱',
      description: 'Paiement mobile Flouci',
      fees: 1.5,
    },
    {
      id: 'd17',
      name: 'D17',
      icon: '💳',
      description: 'Paiement via D17',
      fees: 2.0,
    },
  ],
  africa_fcfa: [
    {
      id: 'cinetpay',
      name: 'CinetPay',
      icon: '💳',
      description: 'Paiement par carte ou mobile money',
      fees: 3.5,
    },
    {
      id: 'orange_money',
      name: 'Orange Money',
      icon: '🟠',
      description: 'Paiement via Orange Money',
      fees: 2.0,
    },
    {
      id: 'wave',
      name: 'Wave',
      icon: '🌊',
      description: 'Paiement via Wave',
      fees: 1.0,
    },
    {
      id: 'mtn_money',
      name: 'MTN Money',
      icon: '🟡',
      description: 'Paiement via MTN Mobile Money',
      fees: 2.5,
    },
  ],
  europe: [
    {
      id: 'stripe_card',
      name: 'Carte bancaire',
      icon: '💳',
      description: 'Visa, Mastercard, CB',
      fees: 1.4,
    },
  ],
  international: [
    {
      id: 'stripe_card',
      name: 'Credit Card',
      icon: '💳',
      description: 'Visa, Mastercard, Amex',
      fees: 2.9,
    },
  ],
}

// Taux de change depuis EUR (devise de base)
// TODO: Intégrer une API de taux de change en temps réel (ex: exchangerate-api.com)
const EXCHANGE_RATES: Record<string, number> = {
  EUR: 1,       // Devise de base
  TND: 3.35,    // 1 EUR = 3.35 TND (à actualiser)
  XOF: 655.96,  // 1 EUR = 655.96 FCFA (taux fixe BCE)
  XAF: 655.96,  // 1 EUR = 655.96 FCFA (taux fixe BCE)
  USD: 1.08,    // 1 EUR = 1.08 USD (à actualiser)
}

export function getPaymentConfig(countryCode: string): PaymentConfig {
  // Tunisie
  if (countryCode === 'TN') {
    return {
      currency: 'TND',
      currencySymbol: 'DT',
      paymentMethods: PAYMENT_METHODS.tunisia,
      exchangeRate: EXCHANGE_RATES.TND,
      countryCode,
      region: 'tunisia',
    }
  }

  // Pays FCFA
  if (FCFA_COUNTRIES.includes(countryCode)) {
    return {
      currency: 'XOF',
      currencySymbol: 'FCFA',
      paymentMethods: PAYMENT_METHODS.africa_fcfa,
      exchangeRate: EXCHANGE_RATES.XOF,
      countryCode,
      region: 'africa_fcfa',
    }
  }

  // Europe (Zone Euro)
  if (EURO_COUNTRIES.includes(countryCode)) {
    return {
      currency: 'EUR',
      currencySymbol: '€',
      paymentMethods: PAYMENT_METHODS.europe,
      exchangeRate: EXCHANGE_RATES.EUR,
      countryCode,
      region: 'europe',
    }
  }

  // International (USD)
  return {
    currency: 'USD',
    currencySymbol: '$',
    paymentMethods: PAYMENT_METHODS.international,
    exchangeRate: EXCHANGE_RATES.USD,
    countryCode,
    region: 'international',
  }
}

export function convertPrice(priceEUR: number, config: PaymentConfig): number {
  // Si le prix est 0 ou négatif, retourner 0
  if (priceEUR <= 0) return 0
  
  const converted = priceEUR * config.exchangeRate
  
  // Arrondir selon la devise
  if (config.currency === 'XOF' || config.currency === 'XAF') {
    // FCFA : arrondir aux 25 FCFA près (standard)
    return Math.ceil(converted / 25) * 25
  }
  if (config.currency === 'TND') {
    // Dinar tunisien : arrondir aux 0.5 DT près
    return Math.ceil(converted * 2) / 2
  }
  if (config.currency === 'USD') {
    // Dollar : arrondir aux centimes
    return Math.round(converted * 100) / 100
  }
  // EUR et autres : arrondir aux centimes
  return Math.round(converted * 100) / 100
}

export function formatPrice(amount: number, config: PaymentConfig): string {
  const formatted = new Intl.NumberFormat(getLocale(config.countryCode), {
    minimumFractionDigits: config.currency === 'XOF' || config.currency === 'XAF' ? 0 : 2,
    maximumFractionDigits: config.currency === 'XOF' || config.currency === 'XAF' ? 0 : 2,
  }).format(amount)

  // Position du symbole selon la devise
  if (config.currency === 'EUR') return `${formatted} €`
  if (config.currency === 'USD') return `$${formatted}`
  if (config.currency === 'TND') return `${formatted} DT`
  if (config.currency === 'XOF' || config.currency === 'XAF') return `${formatted} FCFA`
  
  return `${formatted} ${config.currencySymbol}`
}

function getLocale(countryCode: string): string {
  const locales: Record<string, string> = {
    TN: 'fr-TN',
    FR: 'fr-FR',
    SN: 'fr-SN',
    CI: 'fr-CI',
    US: 'en-US',
  }
  return locales[countryCode] || 'fr-FR'
}