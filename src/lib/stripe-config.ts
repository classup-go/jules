/**
 * Stripe Configuration Centralisée
 * Version API unifiée pour toute l'application
 */

/**
 * Version API Stripe utilisée dans toute l'application
 * Documentation: https://stripe.com/docs/api/versioning
 *
 * IMPORTANT: Cette version doit être la même partout:
 * - lib/stripe.ts
 * - lib/payment/stripe-connect.ts
 * - api/stripe-connect/webhooks/route.ts
 */
export const STRIPE_API_VERSION = '2024-12-18.acacia' as const

/**
 * Variables d'environnement requises pour Stripe
 */
export const REQUIRED_STRIPE_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const

/**
 * Variables d'environnement optionnelles (nécessaires en production)
 */
export const OPTIONAL_STRIPE_ENV_VARS = [
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_CONNECT_WEBHOOK_SECRET',
] as const

/**
 * Validation des variables d'environnement Stripe
 * @throws Error si des variables critiques sont manquantes
 */
export function validateStripeConfig(): {
  valid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []

  // Vérifier les variables requises
  for (const envVar of REQUIRED_STRIPE_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  // Vérifier les variables optionnelles (warnings seulement)
  for (const envVar of OPTIONAL_STRIPE_ENV_VARS) {
    if (!process.env[envVar] || process.env[envVar] === 'whsec_xxx' || process.env[envVar]?.includes('VOTRE_')) {
      warnings.push(`${envVar} n'est pas configuré - Les webhooks ne fonctionneront pas`)
    }
  }

  // Vérifier que les clés ne sont pas des placeholders
  if (process.env.STRIPE_SECRET_KEY?.includes('test') === false &&
      process.env.NODE_ENV === 'development') {
    warnings.push('⚠️ Clés LIVE détectées en développement - Utiliser clés TEST')
  }

  // Vérifier le double égal dans la clé publishable
  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('=')) {
    missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY contient un double = au début')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Logger la configuration Stripe au démarrage
 */
export function logStripeConfig(): void {
  const validation = validateStripeConfig()

  console.log('🔧 Configuration Stripe:')
  console.log(`  Version API: ${STRIPE_API_VERSION}`)
  console.log(`  Mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'TEST' : 'LIVE'}`)
  console.log(`  Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅' : '❌'}`)
  console.log(`  Connect Webhook: ${process.env.STRIPE_CONNECT_WEBHOOK_SECRET ? '✅' : '❌'}`)

  if (!validation.valid) {
    console.error('❌ Variables manquantes:', validation.missing)
    throw new Error(`Configuration Stripe invalide. Variables manquantes: ${validation.missing.join(', ')}`)
  }

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => console.warn(`⚠️  ${warning}`))
  }
}

/**
 * Déterminer si on est en mode test
 */
export function isStripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ?? true
}

/**
 * Obtenir l'URL du dashboard Stripe selon le mode
 */
export function getStripeDashboardUrl(): string {
  return isStripeTestMode()
    ? 'https://dashboard.stripe.com/test'
    : 'https://dashboard.stripe.com'
}
