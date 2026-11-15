'use client'

/**
 * Stripe Connect Onboarding Component
 * Handles Stripe Connect Express account setup for teachers
 * States:
 * - Not connected: Show activation button
 * - In progress: Show loading state
 * - Completed: Show success badge
 * - Country not supported: Show manual payout message
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react'

interface StripeConnectStatus {
  connected: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  onboarding_completed: boolean
  account_id?: string
}

interface StripeConnectOnboardingProps {
  userId: string
  userCountry?: string
  onStatusChange?: (status: StripeConnectStatus) => void
}

export function StripeConnectOnboarding({
  userId,
  userCountry,
  onStatusChange
}: StripeConnectOnboardingProps) {
  const [status, setStatus] = useState<StripeConnectStatus>({
    connected: false,
    charges_enabled: false,
    payouts_enabled: false,
    onboarding_completed: false
  })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial status
  useEffect(() => {
    loadStatus()
  }, [userId])

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      // Get user's Stripe Connect status from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          stripe_connect_account_id,
          stripe_connect_onboarding_completed,
          stripe_connect_charges_enabled,
          stripe_connect_payouts_enabled
        `)
        .eq('id', userId)
        .single()

      if (userError) {
        throw userError
      }

      const newStatus: StripeConnectStatus = {
        connected: !!userData?.stripe_connect_account_id,
        charges_enabled: userData?.stripe_connect_charges_enabled || false,
        payouts_enabled: userData?.stripe_connect_payouts_enabled || false,
        onboarding_completed: userData?.stripe_connect_onboarding_completed || false,
        account_id: userData?.stripe_connect_account_id
      }

      setStatus(newStatus)
      onStatusChange?.(newStatus)

      // If connected, refresh status from Stripe
      if (newStatus.connected && !newStatus.onboarding_completed) {
        await refreshStripeStatus()
      }
    } catch (err: any) {
      console.error('Error loading status:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe-connect/account-status')
      if (!response.ok) {
        throw new Error('Failed to refresh status')
      }

      const data = await response.json()

      const newStatus: StripeConnectStatus = {
        connected: data.connected,
        charges_enabled: data.charges_enabled,
        payouts_enabled: data.payouts_enabled,
        onboarding_completed: data.charges_enabled && data.payouts_enabled
      }

      setStatus(newStatus)
      onStatusChange?.(newStatus)
    } catch (err: any) {
      console.error('Error refreshing status:', err)
    }
  }

  const handleActivate = async () => {
    try {
      setProcessing(true)
      setError(null)

      // Step 1: Create Stripe Connect account
      const createResponse = await fetch('/api/stripe-connect/create-account', {
        method: 'POST'
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create Stripe account')
      }

      const { accountId } = await createResponse.json()

      // Step 2: Get onboarding link
      const linkResponse = await fetch('/api/stripe-connect/account-link', {
        method: 'POST'
      })

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json()
        throw new Error(errorData.error || 'Failed to create onboarding link')
      }

      const { url } = await linkResponse.json()

      // Redirect to Stripe onboarding
      window.location.href = url
    } catch (err: any) {
      console.error('Error activating Stripe Connect:', err)
      setError(err.message)
      setProcessing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter votre compte Stripe Connect ?')) {
      return
    }

    try {
      setProcessing(true)
      setError(null)

      const response = await fetch('/api/stripe-connect/disconnect', {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to disconnect')
      }

      // Reload status
      await loadStatus()
    } catch (err: any) {
      console.error('Error disconnecting:', err)
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Chargement...</span>
      </div>
    )
  }

  // Completed state
  if (status.onboarding_completed && status.payouts_enabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-green-900">Payouts automatiques activés</p>
            <p className="text-sm text-green-700">
              Vos gains sont automatiquement transférés vers votre compte bancaire
            </p>
          </div>
        </div>

        <button
          onClick={handleDisconnect}
          disabled={processing}
          className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          Déconnecter Stripe Connect
        </button>
      </div>
    )
  }

  // In progress state
  if (status.connected && !status.onboarding_completed) {
    return (
      <div className="space-y-3">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configuration Stripe Connect en cours. Veuillez compléter les informations requises.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleActivate}
          disabled={processing}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Continuer la configuration
            </>
          )}
        </Button>
      </div>
    )
  }

  // Not connected state
  return (
    <div className="space-y-4">
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          Activez les payouts automatiques
        </h3>
        <p className="text-sm text-blue-700 mb-4">
          Connectez votre compte bancaire via Stripe Connect pour recevoir vos gains automatiquement, sans limite de montant minimum.
        </p>
        <ul className="text-sm text-blue-700 space-y-1 mb-4">
          <li>✓ Payouts automatiques en 2-3 jours</li>
          <li>✓ Aucun montant minimum</li>
          <li>✓ Sécurisé par Stripe</li>
          <li>✓ Dashboard de suivi en temps réel</li>
        </ul>

        <Button
          onClick={handleActivate}
          disabled={processing}
          className="w-full"
          size="lg"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Configuration...
            </>
          ) : (
            <>
              🚀 Activer les payouts automatiques
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-gray-500 text-center">
        En activant Stripe Connect, vous acceptez les{' '}
        <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="underline">
          conditions de Stripe Connected Account Agreement
        </a>
      </p>
    </div>
  )
}
