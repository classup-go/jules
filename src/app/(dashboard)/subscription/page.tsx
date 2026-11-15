'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/bottom-nav'
import { useGeoLocation } from '@/lib/payment/useGeoLocation'
import { convertPrice, formatPrice } from '@/lib/payment/config'

// Prix en EUR (devise de base) - Alignés sur l'API et la DB
const plansEUR = [
  {
    id: 'free',
    name: 'Plan Gratuit',
    price: 0,
    period: '/mois',
    billing: 'gratuit pour toujours',
    badge: null,
    features: [
      'Cours gratuits uniquement',
      '5 QCM par mois',
      'Accès au forum',
    ],
  },
  {
    id: 'essentiel',
    name: 'Plan Essentiel',
    price: 19, // 19 EUR/mois
    period: '/mois',
    billing: 'facturé mensuellement',
    badge: { text: 'Populaire', color: 'bg-[#F5A623]' },
    features: [
      'Tous les cours en ligne',
      'QCM illimités',
      'Suivi de progression',
      'Support par email',
    ],
  },
  {
    id: 'premium',
    name: 'Plan Premium',
    price: 39, // 39 EUR/mois
    period: '/mois',
    billing: 'facturé mensuellement',
    badge: { text: 'Le meilleur', color: 'bg-[#1A365D]' },
    popular: true,
    features: [
      'Tous les cours + sessions live illimitées',
      'Professeur dédié',
      'Support prioritaire',
      'Certificats',
    ],
  },
]

export default function SubscriptionPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState('essentiel')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { paymentConfig, loading } = useGeoLocation()

  const handleSubscribe = async () => {
    try {
      setIsSubmitting(true)

      // Si plan gratuit, pas besoin de paiement
      if (selectedPlan === 'free') {
        // TODO: Mettre à jour le profil utilisateur avec plan = 'free'
        // Rediriger vers le dashboard student
        router.push('/student/dashboard')
        return
      }

      // Appeler l'API pour créer le checkout Stripe
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: selectedPlan,
          currency: paymentConfig.currency,
          exchangeRate: paymentConfig.exchangeRate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de l\'abonnement')
      }

      if (data.url) {
        // Rediriger vers Stripe Checkout
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de la création de l\'abonnement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-4">
        <Link href="/profile">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-[#1A365D] flex-1 text-center pr-8">Choisissez Votre Abonnement</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1A365D] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des prix...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Plans */}
          <div className="px-4 py-6 space-y-4">
            {plansEUR.map((plan) => {
              const localPrice = convertPrice(plan.price, paymentConfig)
              const formattedPrice = formatPrice(localPrice, paymentConfig)

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full p-5 rounded-2xl text-left transition-all ${
                    selectedPlan === plan.id
                      ? 'border-2 border-[#1A365D] bg-white shadow-lg'
                      : 'border border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-[#1A365D]">{plan.name}</span>
                        {plan.badge && (
                          <span className={`px-2 py-1 rounded-full text-xs text-white ${plan.badge.color}`}>
                            {plan.badge.text}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-[#1A365D]">{formattedPrice}</span>
                        <span className="text-gray-400">{plan.period}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{plan.billing}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'border-[#1A365D]' : 'border-gray-300'
                    }`}>
                      {selectedPlan === plan.id && (
                        <div className="w-3 h-3 rounded-full bg-[#1A365D]" />
                      )}
                    </div>
                  </div>
                  {/* Features list */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Submit Button - Fixed at bottom */}
      <div className="fixed bottom-20 left-0 right-0 px-4 py-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSubscribe}
          disabled={isSubmitting || loading}
          className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Chargement...
            </span>
          ) : selectedPlan === 'free' ? (
            'Continuer gratuitement'
          ) : (
            'Choisir cet Abonnement'
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}