'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { PricingPlan } from '@/types/landing'
import { useGeoLocation } from '@/lib/payment/useGeoLocation'
import { convertPrice, formatPrice } from '@/lib/payment/config'

interface PricingCardProps {
  plan: PricingPlan
}

export function PricingCard({ plan }: PricingCardProps) {
  const { paymentConfig, loading } = useGeoLocation()

  // Convertir le prix depuis EUR vers la devise locale
  const localPrice = convertPrice(plan.price, paymentConfig)
  const formattedPrice = formatPrice(localPrice, paymentConfig)

  const getBorderColor = () => {
    if (plan.recommended) return 'border-[#F5A623]'
    if (plan.name === 'Pro') return 'border-[#1A365D]'
    return 'border-gray-300'
  }

  return (
    <div
      className={`
        relative bg-white rounded-2xl p-6 md:p-8 border-2 ${getBorderColor()}
        ${plan.recommended ? 'shadow-2xl scale-105 card-hover' : 'shadow-lg'}
        transition-all duration-300
      `}
    >
      {/* Recommended Badge */}
      {plan.recommended && plan.badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-[#F5A623] text-white px-4 py-1 text-sm font-semibold">
            {plan.badge}
          </Badge>
        </div>
      )}

      {/* Plan Name */}
      <h3 className="text-2xl font-bold text-[#1A365D] mb-2">
        {plan.name}
      </h3>

      {/* Price */}
      <div className="mb-6">
        {loading ? (
          <div className="h-16 flex items-center">
            <span className="text-2xl text-gray-400">Chargement...</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline">
              <span className="text-4xl md:text-5xl font-bold text-[#1A365D]">
                {formattedPrice.split(' ')[0]}
              </span>
              <span className="text-2xl font-semibold text-gray-600 ml-2">
                {paymentConfig.currencySymbol}
              </span>
            </div>
            <div className="text-gray-600 text-sm mt-1">
              {plan.period}
            </div>
          </>
        )}
      </div>

      {/* Features List */}
      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start space-x-3">
            <div className={`
              flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
              ${feature.included ? 'bg-green-100' : 'bg-gray-100'}
            `}>
              {feature.included ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <X className="w-3 h-3 text-gray-400" />
              )}
            </div>
            <span className={`
              text-sm
              ${feature.included ? 'text-gray-700' : 'text-gray-400'}
            `}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Link href={plan.ctaLink}>
        <Button
          size="lg"
          className={`
            w-full
            ${plan.recommended
              ? 'bg-[#F5A623] hover:bg-[#E09515] text-white'
              : 'bg-[#1A365D] hover:bg-[#2B5A8E] text-white'
            }
          `}
        >
          {plan.ctaText}
        </Button>
      </Link>
    </div>
  )
}
