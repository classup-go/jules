'use client'

/**
 * Payout Request Button Component
 * Allows teachers to request payouts of available earnings
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DollarSign, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CurrencyType, PayoutMethod } from '@/types/database'

interface PayoutRequestButtonProps {
  teacherId: string
  payoutMethod: PayoutMethod
  currency: CurrencyType
}

export function PayoutRequestButton({
  teacherId,
  payoutMethod,
  currency
}: PayoutRequestButtonProps) {
  const [requesting, setRequesting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAmountInput, setShowAmountInput] = useState(false)
  const [amount, setAmount] = useState('')

  const handleRequestPayout = async () => {
    if (!showAmountInput) {
      setShowAmountInput(true)
      return
    }

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Montant invalide')
      return
    }

    try {
      setRequesting(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to request payout')
      }

      const data = await response.json()

      setSuccess(true)
      setAmount('')
      setShowAmountInput(false)

      // Reload page after 2 seconds to show updated balance
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      console.error('Error requesting payout:', err)
      setError(err.message)
    } finally {
      setRequesting(false)
    }
  }

  const currencySymbol = getCurrencySymbol(currency)

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
      <h3 className="text-lg font-semibold">Demander un retrait</h3>

      {!showAmountInput ? (
        <Button
          onClick={() => setShowAmountInput(true)}
          size="lg"
          className="w-full"
        >
          <DollarSign className="mr-2 h-5 w-5" />
          Retirer mes gains
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant à retirer ({currency})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={requesting}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleRequestPayout}
              disabled={requesting || !amount}
              size="lg"
              className="flex-1"
            >
              {requesting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  💸 Confirmer le retrait
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowAmountInput(false)
                setAmount('')
                setError(null)
              }}
              disabled={requesting}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-900">
            ✓ Demande de retrait effectuée avec succès !
            {payoutMethod === 'stripe_connect'
              ? ' Les fonds seront transférés automatiquement.'
              : ' Votre demande sera traitée sous 3-5 jours ouvrables.'}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {payoutMethod !== 'stripe_connect' && (
        <p className="text-sm text-gray-600">
          ℹ️ Les retraits manuels peuvent nécessiter un montant minimum selon votre pays.
        </p>
      )}
    </div>
  )
}

function getCurrencySymbol(currency: CurrencyType): string {
  const symbols: Record<CurrencyType, string> = {
    EUR: '€',
    USD: '$',
    CAD: 'CAD$',
    TND: 'TND',
    XOF: 'FCFA'
  }
  return symbols[currency] || currency
}
