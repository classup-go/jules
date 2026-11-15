import { PricingCard } from './pricing-card'
import { pricingPlans } from '@/lib/landing-data'

export function PricingSection() {
  return (
    <section className="py-16 md:py-20 bg-[#F7F8FA]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A365D] mb-4">
            Choisissez votre formule
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Plans flexibles pour tous les besoins, avec 14 jours d'essai gratuit
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Tous les plans incluent un accès sécurisé et le respect de vos données personnelles
          </p>
        </div>
      </div>
    </section>
  )
}
