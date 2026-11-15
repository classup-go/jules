import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, GraduationCap, Users } from 'lucide-react'

export function CTASection() {
  return (
    <section className="relative py-20 bg-gradient-to-br from-[#1A365D] via-[#2B5A8E] to-[#F5A623] overflow-hidden">
      {/* Decoration Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full backdrop-blur-sm">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Prêt à commencer votre aventure éducative ?
          </h2>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-white/90 mb-10">
            Rejoignez des milliers d'étudiants et professeurs qui réussissent ensemble
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register?role=student">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-[#1A365D] hover:bg-gray-100 px-8 py-6 text-lg"
              >
                <Users className="w-5 h-5 mr-2" />
                Commencer en tant qu'élève
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            <Link href="/register?role=teacher">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Enseigner sur Jules
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <p className="mt-8 text-white/80 text-sm">
            14 jours d'essai gratuit • Sans carte bancaire • Annulation à tout moment
          </p>
        </div>
      </div>
    </section>
  )
}
