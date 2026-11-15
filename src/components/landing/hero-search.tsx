'use client'

import { useState } from 'react'
import { Search, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { schoolLevels, popularSubjects } from '@/lib/landing-data'

export function HeroSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implémenter la logique de recherche
    console.log('Recherche:', { searchQuery, selectedLevel })
  }

  return (
    <section className="relative bg-gradient-to-br from-[#1A365D] via-[#2B5A8E] to-[#1A365D] py-16 md:py-24 overflow-hidden">
      {/* Decoration Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#F5A623] rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F5A623] rounded-full filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Text */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 animate-fadeIn">
            Trouvez votre professeur idéal en Tunisie
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 animate-fadeIn">
            La plateforme éducative qui connecte étudiants et professeurs pour la réussite scolaire
          </p>

          {/* Search Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6 animate-slideUp">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              {/* Subject/Keyword Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Matière ou mot-clé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-gray-300"
                />
              </div>

              {/* Level Selector */}
              <div className="flex-1">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                >
                  <option value="">Tous les niveaux</option>
                  {schoolLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Button */}
              <Button
                type="submit"
                size="lg"
                className="bg-[#F5A623] hover:bg-[#E09515] text-white h-12 px-8"
              >
                <Search className="w-5 h-5 mr-2" />
                Rechercher
              </Button>
            </form>

            {/* Quick Subject Pills */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-gray-600">Populaires:</span>
              {popularSubjects.slice(0, 5).map((subject) => (
                <button
                  key={subject.id}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                  onClick={() => setSearchQuery(subject.name)}
                >
                  {subject.icon} {subject.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideUp">
            <Link href="/register?role=student">
              <Button size="lg" className="w-full sm:w-auto bg-white text-[#1A365D] hover:bg-gray-100">
                <GraduationCap className="w-5 h-5 mr-2" />
                Je suis élève
              </Button>
            </Link>
            <Link href="/register?role=teacher">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10"
              >
                Je suis professeur
              </Button>
            </Link>
          </div>

          {/* Already registered link */}
          <div className="mt-6 animate-fadeIn">
            <Link href="/login" className="text-white/80 hover:text-white text-sm underline">
              Déjà inscrit ? Se connecter
            </Link>
          </div>
        </div>

        {/* Hero Illustration (Desktop) */}
        <div className="hidden lg:block absolute right-0 top-1/2 transform -translate-y-1/2 opacity-20">
          <div className="text-9xl">📚</div>
        </div>
      </div>
    </section>
  )
}
