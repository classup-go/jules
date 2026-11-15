/**
 * Webhook Utilities
 * Gestion avancée des erreurs et retry logic pour les webhooks Stripe
 */

/**
 * Types d'erreurs webhook
 */
export enum WebhookErrorType {
  TEMPORARY = 'temporary',      // Erreurs temporaires (retry Stripe)
  PERMANENT = 'permanent',       // Erreurs permanentes (ne pas retry)
  VALIDATION = 'validation',     // Erreurs de validation
}

/**
 * Interface pour les erreurs webhook
 */
export interface WebhookError {
  type: WebhookErrorType
  message: string
  code?: string
  details?: any
  retryable: boolean
}

/**
 * Codes d'erreur Supabase considérés comme temporaires
 */
const TEMPORARY_ERROR_CODES = [
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '53000', // insufficient_resources
  '53100', // disk_full
  '53200', // out_of_memory
  '53300', // too_many_connections
  '57P03', // cannot_connect_now
  '58000', // system_error
  '58030', // io_error
]

/**
 * Déterminer si une erreur est temporaire et retryable
 */
export function isTemporaryError(error: any): boolean {
  if (!error) return false

  // Erreurs réseau
  if (error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND') {
    return true
  }

  // Erreurs HTTP 5xx (serveur)
  if (error.status >= 500 && error.status < 600) {
    return true
  }

  // Erreurs Supabase temporaires
  if (error.code && TEMPORARY_ERROR_CODES.includes(error.code)) {
    return true
  }

  // Rate limiting
  if (error.status === 429) {
    return true
  }

  return false
}

/**
 * Classifier une erreur webhook
 */
export function classifyWebhookError(error: any): WebhookError {
  // Erreurs de validation
  if (error.status === 400 || error.status === 422) {
    return {
      type: WebhookErrorType.VALIDATION,
      message: error.message || 'Validation error',
      code: error.code,
      details: error.details,
      retryable: false,
    }
  }

  // Erreurs temporaires
  if (isTemporaryError(error)) {
    return {
      type: WebhookErrorType.TEMPORARY,
      message: error.message || 'Temporary error',
      code: error.code,
      details: error.details,
      retryable: true,
    }
  }

  // Erreurs permanentes
  return {
    type: WebhookErrorType.PERMANENT,
    message: error.message || 'Permanent error',
    code: error.code,
    details: error.details,
    retryable: false,
  }
}

/**
 * Logger structuré pour les webhooks
 */
export interface WebhookLogData {
  eventType: string
  eventId: string
  status: 'success' | 'error' | 'retry'
  error?: WebhookError
  duration?: number
  metadata?: any
}

export function logWebhook(data: WebhookLogData): void {
  const timestamp = new Date().toISOString()
  const logLevel = data.status === 'error' ? 'ERROR' : data.status === 'retry' ? 'WARN' : 'INFO'

  const logMessage = {
    timestamp,
    level: logLevel,
    type: 'webhook',
    ...data,
  }

  if (data.status === 'error') {
    console.error(JSON.stringify(logMessage, null, 2))
  } else if (data.status === 'retry') {
    console.warn(JSON.stringify(logMessage, null, 2))
  } else {
    console.log(JSON.stringify(logMessage, null, 2))
  }

  // TODO: Intégrer avec service de monitoring (Sentry, DataDog, etc.)
  // if (process.env.SENTRY_DSN && data.error) {
  //   Sentry.captureException(data.error, {
  //     tags: {
  //       webhook: true,
  //       eventType: data.eventType,
  //       errorType: data.error.type,
  //     }
  //   })
  // }
}

/**
 * Queue de dead letter pour événements non traités
 * En production, utiliser une vraie queue (SQS, Redis, etc.)
 */
export async function saveToDeadLetterQueue(
  eventType: string,
  eventId: string,
  eventData: any,
  error: WebhookError
): Promise<void> {
  const deadLetter = {
    eventType,
    eventId,
    eventData,
    error,
    timestamp: new Date().toISOString(),
    retriesAttempted: 0,
  }

  // TODO: Implémenter stockage persistant
  // En attendant, logger pour inspection manuelle
  console.error('📥 DEAD LETTER QUEUE:', JSON.stringify(deadLetter, null, 2))

  // Option: Sauvegarder dans Supabase
  // const { error: dbError } = await supabase
  //   .from('webhook_dead_letters')
  //   .insert(deadLetter)
}

/**
 * Wrapper pour gérer les erreurs webhook avec retry logic
 */
export async function handleWebhookWithRetry<T>(
  eventType: string,
  eventId: string,
  handler: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: WebhookError }> {
  const startTime = Date.now()

  try {
    const data = await handler()
    const duration = Date.now() - startTime

    logWebhook({
      eventType,
      eventId,
      status: 'success',
      duration,
    })

    return { success: true, data }
  } catch (error: any) {
    const duration = Date.now() - startTime
    const webhookError = classifyWebhookError(error)

    if (webhookError.retryable) {
      // Erreur temporaire: logger et lancer exception pour retry Stripe
      logWebhook({
        eventType,
        eventId,
        status: 'retry',
        error: webhookError,
        duration,
      })

      throw error // Stripe retentera
    } else {
      // Erreur permanente: logger, sauvegarder dans dead letter, retourner 200
      logWebhook({
        eventType,
        eventId,
        status: 'error',
        error: webhookError,
        duration,
      })

      await saveToDeadLetterQueue(eventType, eventId, {}, webhookError)

      return { success: false, error: webhookError }
    }
  }
}

/**
 * Validation basique des données webhook
 */
export function validateWebhookData(
  data: any,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  for (const field of requiredFields) {
    if (!data[field]) {
      missing.push(field)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Créer une réponse webhook standardisée
 */
export function createWebhookResponse(
  success: boolean,
  message?: string,
  data?: any
) {
  return {
    received: true,
    success,
    message: message || (success ? 'Webhook processed successfully' : 'Webhook processing failed'),
    timestamp: new Date().toISOString(),
    data,
  }
}
