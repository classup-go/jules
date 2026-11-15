'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { getStripePublishableKey } from '@/lib/stripe'
import { useGeoLocation } from '@/lib/payment/useGeoLocation'
import { convertPrice, formatPrice } from '@/lib/payment/config'

interface CheckoutButtonProps {
  classroomId: string
  price: number // Prix en EUR (devise de base)
  className?: string
}

export default function CheckoutButton({ classroomId, price, className }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const { paymentConfig, loading: geoLoading } = useGeoLocation()

  // Convertir le prix vers la devise locale
  const localPrice = convertPrice(price, paymentConfig)
  const formattedPrice = formatPrice(localPrice, paymentConfig)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          currency: paymentConfig.currency,
          exchangeRate: paymentConfig.exchangeRate
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erreur de paiement')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Erreur de paiement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading || geoLoading}
      className={className || 'w-full bg-[#F5A623] text-white py-4 rounded-2xl font-semibold disabled:opacity-50'}
    >
      {loading ? 'Chargement...' : geoLoading ? 'Chargement...' : `S'inscrire - ${formattedPrice}`}
    </button>
  )
}