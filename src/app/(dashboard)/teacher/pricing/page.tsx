'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Plans pour professeurs (en EUR)
const teacherPlans = [
  {
    id: 'free',
    name: 'Plan Gratuit',
    price: 0,
    period: '/mois',
    billing: 'gratuit pour toujours',
    commission: '20%',
    badge: null,
    features: [
      'Créer des classes et cours',
      'Sessions live illimitées',
      'Support communautaire',
    ],
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    price: 9.99,
    period: '/mois',
    billing: 'facturé mensuellement',
    commission: '10%',
    badge: { text: 'Populaire', color: 'bg-[#F5A623]' },
    features: [
      'Toutes les fonctionnalités gratuites',
      'Commission réduite à 10%',
      'Statistiques avancées',
      'Support prioritaire',
      'Badge "Professeur Pro"',
    ],
  },
  {
    id: 'business',
    name: 'Plan Business',
    price: 29.99,
    period: '/mois',
    billing: 'facturé mensuellement',
    commission: '5%',
    badge: { text: 'Le meilleur', color: 'bg-[#1A365D]' },
    features: [
      'Toutes les fonctionnalités Pro',
      'Commission minimale de 5%',
      'Page professeur personnalisée',
      'Marketing et promotion',
      'Support dédié',
      'Accès API',
    ],
  },
]

export default function TeacherPricingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubscribe = async () => {
    try {
      setIsSubmitting(true)

      // Si plan gratuit, pas besoin de paiement
      if (selectedPlan === 'free') {
        // TODO: Mettre à jour le profil professeur avec plan = 'free'
        // Rediriger vers dashboard
        router.push('/teacher/dashboard')
        return
      }

      // Appeler l'API pour créer le checkout Stripe
      const response = await fetch('/api/teacher/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: selectedPlan,
          currency: 'EUR',
          exchangeRate: 1,
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
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-4">
        <Link href="/teacher/dashboard">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-[#1A365D] flex-1 text-center pr-8">Choisissez Votre Plan</h1>
      </div>

      {/* Plans */}
      <div className="px-4 py-6 space-y-4">
        {teacherPlans.map((plan) => (
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
                  <span className="text-4xl font-bold text-[#1A365D]">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price} €`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-400">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">{plan.billing}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedPlan === plan.id ? 'border-[#1A365D]' : 'border-gray-300'
              }`}>
                {selectedPlan === plan.id && (
                  <div className="w-3 h-3 rounded-full bg-[#1A365D]" />
                )}
              </div>
            </div>

            {/* Commission Badge */}
            <div className="bg-gradient-to-r from-[#F5A623] to-[#F5A623]/80 text-white px-4 py-2 rounded-xl mb-3 text-center">
              <div className="text-xs font-medium">Commission sur vos ventes</div>
              <div className="text-2xl font-bold">{plan.commission}</div>
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
        ))}
      </div>

      {/* Info Banner */}
      <div className="mx-4 mb-6 bg-[#E8F4FD] border border-[#1A365D]/10 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-[#1A365D] text-sm mb-2">Comment ça marche ?</h4>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>• <strong>Commission</strong> : Prélevée uniquement sur vos ventes</li>
              <li>• <strong>Paiements</strong> : Virements mensuels directs</li>
              <li>• <strong>Tarification</strong> : Vous fixez vos prix de cours</li>
              <li>• <strong>Support</strong> : Équipe disponible 7j/7</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSubscribe}
          disabled={isSubmitting}
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
        {selectedPlan !== 'free' && (
          <p className="text-center text-gray-400 text-xs mt-2">
            Annulez à tout moment • Aucun engagement
          </p>
        )}
      </div>
    </div>
  )
}
