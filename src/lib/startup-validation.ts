/**
 * Validation au Démarrage de l'Application
 * Vérifie que toutes les variables d'environnement critiques sont configurées
 */

import { validateStripeConfig, logStripeConfig } from './stripe-config'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Valider toutes les variables d'environnement critiques
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  console.log('🔍 Validation de l\'environnement...')

  // 1. Variables App
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    errors.push('NEXT_PUBLIC_APP_URL manquante')
  }

  // 2. Variables Supabase
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL manquante')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY manquante')
  }

  // 3. Variables Stripe
  const stripeValidation = validateStripeConfig()
  if (!stripeValidation.valid) {
    errors.push(...stripeValidation.missing)
  }
  warnings.push(...stripeValidation.warnings)

  // 4. Vérifier que les variables ne contiennent pas de placeholders
  const placeholderPatterns = [
    'votre_',
    'your_',
    'VOTRE_',
    'YOUR_',
    'xxx',
    'TODO',
  ]

  const checkForPlaceholders = (key: string, value: string | undefined) => {
    if (!value) return
    if (placeholderPatterns.some(pattern => value.includes(pattern))) {
      warnings.push(`${key} contient un placeholder - à remplacer par une vraie valeur`)
    }
  }

  checkForPlaceholders('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY)
  checkForPlaceholders('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET)
  checkForPlaceholders('STRIPE_CONNECT_WEBHOOK_SECRET', process.env.STRIPE_CONNECT_WEBHOOK_SECRET)

  // 5. Vérifier la cohérence des URLs
  if (process.env.NEXT_PUBLIC_APP_URL?.endsWith('/')) {
    warnings.push('NEXT_PUBLIC_APP_URL ne doit pas se terminer par /')
  }

  if (process.env.NODE_ENV === 'production') {
    // Vérifications supplémentaires en production
    if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
      warnings.push('NEXT_PUBLIC_APP_URL devrait être en HTTPS en production')
    }

    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')) {
      errors.push('⚠️ CRITIQUE: Clé Stripe TEST détectée en PRODUCTION')
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === 'whsec_xxx') {
      errors.push('STRIPE_WEBHOOK_SECRET doit être configuré en production')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Logger les résultats de validation
 */
export function logValidationResults(result: ValidationResult): void {
  if (result.valid) {
    console.log('✅ Toutes les variables critiques sont configurées')
  } else {
    console.error('❌ Erreurs de configuration:')
    result.errors.forEach(error => console.error(`   - ${error}`))
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Avertissements:')
    result.warnings.forEach(warning => console.warn(`   - ${warning}`))
  }
}

/**
 * Valider et logger au démarrage
 * Appeler cette fonction dans votre layout.tsx ou _app.tsx
 */
export function validateAndLogStartup(): void {
  // Ne valider qu'une seule fois
  if (typeof window === 'undefined') { // Server-side only
    console.log('\n' + '='.repeat(60))
    console.log('🚀 Démarrage de Jules Platform')
    console.log('='.repeat(60) + '\n')

    // Valider l'environnement
    const envResult = validateEnvironment()
    logValidationResults(envResult)

    console.log('')

    // Valider et logger Stripe
    try {
      logStripeConfig()
    } catch (error: any) {
      console.error('❌ Erreur configuration Stripe:', error.message)
      if (process.env.NODE_ENV === 'production') {
        throw error // Bloquer le démarrage en production si Stripe mal configuré
      }
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // En production, bloquer le démarrage si erreurs critiques
    if (process.env.NODE_ENV === 'production' && !envResult.valid) {
      throw new Error('Configuration invalide - Impossible de démarrer en production')
    }
  }
}

/**
 * Helper pour vérifier si l'environnement est valide
 */
export function isEnvironmentValid(): boolean {
  return validateEnvironment().valid
}

/**
 * Obtenir un rapport de santé de la configuration
 */
export function getHealthReport(): {
  environment: string
  stripe: { mode: string; webhooksConfigured: boolean }
  supabase: { configured: boolean }
  livekit: { configured: boolean }
} {
  return {
    environment: process.env.NODE_ENV || 'development',
    stripe: {
      mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'test' : 'live',
      webhooksConfigured: !!(
        process.env.STRIPE_WEBHOOK_SECRET &&
        process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_xxx'
      ),
    },
    supabase: {
      configured: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    },
    livekit: {
      configured: !!(
        process.env.LIVEKIT_URL &&
        process.env.LIVEKIT_API_KEY &&
        process.env.LIVEKIT_API_SECRET
      ),
    },
  }
}
