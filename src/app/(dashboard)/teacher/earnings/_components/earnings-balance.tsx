'use client'

/**
 * Earnings Balance Component
 * Displays teacher's available, pending, and paid out balances
 */

import { useEffect, useState } from 'react'
import { Wallet, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import type { PayoutBalance, CurrencyType } from '@/types/database'

interface EarningsBalanceProps {
  teacherId: string
  currency: CurrencyType
}

export function EarningsBalance({ teacherId, currency }: EarningsBalanceProps) {
  const [balance, setBalance] = useState<PayoutBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBalance()
  }, [teacherId])

  const loadBalance = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payouts/balance')
      if (!response.ok) {
        throw new Error('Failed to load balance')
      }

      const data = await response.json()
      setBalance(data)
    } catch (err: any) {
      console.error('Error loading balance:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const currencySymbol = getCurrencySymbol(currency)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-900">Erreur: {error}</p>
      </div>
    )
  }

  if (!balance) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Available Balance */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500 rounded-lg">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-green-900">Disponible</h3>
        </div>
        <div className="text-3xl font-bold text-green-900">
          {balance.available.toFixed(2)} {currencySymbol}
        </div>
        <p className="text-sm text-green-700 mt-2">
          Prêt pour retrait
        </p>
      </div>

      {/* Pending Balance */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-yellow-500 rounded-lg">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-yellow-900">En attente</h3>
        </div>
        <div className="text-3xl font-bold text-yellow-900">
          {balance.pending.toFixed(2)} {currencySymbol}
        </div>
        <p className="text-sm text-yellow-700 mt-2">
          Période de sécurité (14j)
        </p>
      </div>

      {/* Paid Out Total */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-blue-900">Total payé</h3>
        </div>
        <div className="text-3xl font-bold text-blue-900">
          {balance.paid_out.toFixed(2)} {currencySymbol}
        </div>
        <p className="text-sm text-blue-700 mt-2">
          Depuis le début
        </p>
      </div>
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
