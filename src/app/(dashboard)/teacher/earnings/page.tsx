/**
 * Teacher Earnings Dashboard
 * Displays earnings, balance, payout history, and Stripe Connect setup
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StripeConnectOnboarding } from '@/components/stripe-connect-onboarding'
import { EarningsBalance } from './_components/earnings-balance'
import { PayoutHistory } from './_components/payout-history'
import { PayoutRequestButton } from './_components/payout-request-button'

export const metadata = {
  title: 'Mes Gains | Jules',
  description: 'Gérez vos gains et retraits'
}

export default async function TeacherEarningsPage({
  searchParams
}: {
  searchParams: { setup?: string }
}) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Check if user is a teacher
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      role,
      display_name,
      country,
      currency,
      stripe_connect_account_id,
      stripe_connect_onboarding_completed,
      stripe_connect_payouts_enabled,
      payout_method
    `)
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    redirect('/dashboard')
  }

  if (userData.role !== 'teacher') {
    redirect('/dashboard')
  }

  // Handle setup query params
  const setupStatus = searchParams.setup
  let setupMessage: { type: 'success' | 'error'; text: string } | null = null

  if (setupStatus === 'success') {
    setupMessage = {
      type: 'success',
      text: 'Configuration Stripe Connect terminée avec succès ! Vos gains seront automatiquement transférés.'
    }
  } else if (setupStatus === 'refresh') {
    setupMessage = {
      type: 'error',
      text: 'La configuration n\'a pas pu être complétée. Veuillez réessayer.'
    }
  }

  const showStripeConnect = !userData.stripe_connect_onboarding_completed

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mes Gains</h1>
        <p className="text-gray-600 mt-2">
          Suivez vos revenus et gérez vos retraits
        </p>
      </div>

      {/* Setup message */}
      {setupMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${
          setupMessage.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {setupMessage.text}
        </div>
      )}

      {/* Stripe Connect Setup */}
      {showStripeConnect && (
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Configuration des Payouts</h2>
            <StripeConnectOnboarding
              userId={userData.id}
              userCountry={userData.country}
            />
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="mb-8">
        <EarningsBalance
          teacherId={userData.id}
          currency={userData.currency}
        />
      </div>

      {/* Payout Request */}
      {userData.stripe_connect_payouts_enabled && (
        <div className="mb-8">
          <PayoutRequestButton
            teacherId={userData.id}
            payoutMethod={userData.payout_method || 'stripe_connect'}
            currency={userData.currency}
          />
        </div>
      )}

      {/* Payout History */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Historique des Retraits</h2>
        <PayoutHistory teacherId={userData.id} />
      </div>

      {/* Info Section */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          Comment fonctionnent les gains ?
        </h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• La plateforme prélève 15% de commission sur chaque vente</li>
          <li>• Vos gains sont disponibles après une période de 14 jours (protection anti-remboursement)</li>
          <li>• Les payouts Stripe Connect sont automatiques et sans limite de montant</li>
          <li>• Pour les payouts manuels, un montant minimum peut s'appliquer selon votre pays</li>
        </ul>
      </div>
    </div>
  )
}
