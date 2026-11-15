'use client'

/**
 * Payout History Component
 * Displays teacher's payout history
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { TeacherPayout } from '@/types/database'

interface PayoutHistoryProps {
  teacherId: string
}

export function PayoutHistory({ teacherId }: PayoutHistoryProps) {
  const [payouts, setPayouts] = useState<TeacherPayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [teacherId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payouts/history')
      if (!response.ok) {
        throw new Error('Failed to load payout history')
      }

      const data = await response.json()
      setPayouts(data.payouts || [])
    } catch (err: any) {
      console.error('Error loading payout history:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucun retrait effectué pour le moment</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Montant
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Méthode
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Statut
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Complété
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">
                {formatDate(payout.initiated_at)}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {payout.amount.toFixed(2)} {payout.currency}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {formatPayoutMethod(payout.payout_method)}
              </td>
              <td className="px-4 py-3">
                <PayoutStatusBadge status={payout.status} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {payout.completed_at ? formatDate(payout.completed_at) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PayoutStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
    processing: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Complété', className: 'bg-green-100 text-green-800' },
    failed: { label: 'Échoué', className: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Annulé', className: 'bg-gray-100 text-gray-800' }
  }

  const variant = variants[status] || variants.pending

  return (
    <Badge className={variant.className}>
      {variant.label}
    </Badge>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatPayoutMethod(method: string): string {
  const methods: Record<string, string> = {
    stripe_connect: 'Stripe Connect',
    manual: 'Manuel',
    bank_transfer: 'Virement bancaire'
  }
  return methods[method] || method
}
