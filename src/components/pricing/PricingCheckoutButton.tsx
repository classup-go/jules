'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGeoLocation } from '@/lib/payment/useGeoLocation'
import { convertPrice, formatPrice } from '@/lib/payment/config'

interface PricingCheckoutButtonProps {
  plan: 'essentiel' | 'premium'
  priceEur: number
  label?: string
  className?: string
}

export default function PricingCheckoutButton({
  plan,
  priceEur,
  label,
  className = '',
}: PricingCheckoutButtonProps) {
  const router = useRouter()
  const { paymentConfig, loading: geoLoading } = useGeoLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculer le prix converti
  const localPrice = paymentConfig ? convertPrice(priceEur, paymentConfig) : priceEur
  const formattedPrice = paymentConfig
    ? formatPrice(localPrice, paymentConfig)
    : `${priceEur}€`

  const handleSubscribe = async () => {
    if (!paymentConfig) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: plan,
          currency: paymentConfig.currency,
          exchangeRate: paymentConfig.exchangeRate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de l\'abonnement')
      }

      if (data.url) {
        // Redirection vers Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('URL de paiement non reçue')
      }
    } catch (err) {
      console.error('Subscription error:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  // Déterminer le label du bouton
  const buttonLabel =
    label ||
    (loading
      ? 'Chargement...'
      : geoLoading
      ? 'Chargement...'
      : `Essai gratuit - ${formattedPrice}/mois`)

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={handleSubscribe}
        disabled={loading || geoLoading || !paymentConfig}
        className={className}
        style={{
          width: '100%',
          padding: '16px 24px',
          backgroundColor: loading || geoLoading ? '#9ca3af' : '#F5A623',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading || geoLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {loading && (
          <span
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
        {buttonLabel}
      </button>

      {error && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '14px',
            color: '#dc2626',
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}

      {paymentConfig && !geoLoading && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#617589',
            textAlign: 'center',
          }}
        >
          💳 Paiement sécurisé • Annulable à tout moment
        </p>
      )}
    </div>
  )
}
