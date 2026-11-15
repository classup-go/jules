'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUBJECTS = ['Mathématiques', 'Physique', 'Chimie', 'SVT', 'Français', 'Anglais', 'Arabe', 'Histoire-Géo', 'Philosophie', 'Informatique']
const LEVELS = ['Primaire', 'Collège', '1ère année', '2ème année', '3ème année', 'Bac', 'Prépa', 'Université']

interface SearchFiltersProps {
  initialQuery: string
  initialSubject: string
  initialLevel: string
  initialType: string
}

export default function SearchFilters({ initialQuery, initialSubject, initialLevel, initialType }: SearchFiltersProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [showFilters, setShowFilters] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [level, setLevel] = useState(initialLevel)
  const [type, setType] = useState(initialType)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (subject) params.set('subject', subject)
    if (level) params.set('level', level)
    if (type) params.set('type', type)
    router.push('/search?' + params.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilters = () => {
    setQuery('')
    setSubject('')
    setLevel('')
    setType('')
    router.push('/search')
  }

  const activeFiltersCount = [subject, level, type].filter(Boolean).length

  return (
    <div>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un cours, un prof..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-[#F5F7FA] focus:outline-none focus:border-[#1E6DD1]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl border relative ${showFilters || activeFiltersCount > 0 ? 'bg-[#1E6DD1] text-white border-[#1E6DD1]' : 'bg-white border-gray-200'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F5A623] text-white text-xs rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
        <button
          onClick={handleSearch}
          className="px-4 py-3 bg-[#1E6DD1] text-white rounded-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 p-4 bg-[#F5F7FA] rounded-2xl space-y-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: '', label: 'Tous' },
                { id: 'teachers', label: '👨‍🏫 Professeurs' },
                { id: 'classrooms', label: '📚 Cours' },
                { id: 'free', label: '🆓 Gratuit' },
                { id: 'paid', label: '💰 Payant' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-3 py-2 rounded-full text-sm transition-all ${
                    type === t.id
                      ? 'bg-[#1E6DD1] text-white'
                      : 'bg-white text-[#1A1A2E] border border-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-2">Matière</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSubject('')}
                className={`px-3 py-2 rounded-full text-sm transition-all ${
                  !subject
                    ? 'bg-[#F5A623] text-white'
                    : 'bg-white text-[#1A1A2E] border border-gray-200'
                }`}
              >
                Toutes
              </button>
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-3 py-2 rounded-full text-sm transition-all ${
                    subject === s
                      ? 'bg-[#F5A623] text-white'
                      : 'bg-white text-[#1A1A2E] border border-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-2">Niveau</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLevel('')}
                className={`px-3 py-2 rounded-full text-sm transition-all ${
                  !level
                    ? 'bg-[#1E6DD1] text-white'
                    : 'bg-white text-[#1A1A2E] border border-gray-200'
                }`}
              >
                Tous
              </button>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-3 py-2 rounded-full text-sm transition-all ${
                    level === l
                      ? 'bg-[#1E6DD1] text-white'
                      : 'bg-white text-[#1A1A2E] border border-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={clearFilters}
              className="flex-1 py-3 bg-gray-100 text-[#1A1A2E] rounded-full font-medium"
            >
              Réinitialiser
            </button>
            <button
              onClick={handleSearch}
              className="flex-1 py-3 bg-[#1E6DD1] text-white rounded-full font-medium"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Tags */}
      {(subject || level || type) && !showFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {subject && (
            <span className="px-3 py-1 bg-[#FFF8E7] text-[#F5A623] rounded-full text-sm flex items-center gap-1">
              {subject}
              <button onClick={() => { setSubject(''); handleSearch(); }} className="ml-1">×</button>
            </span>
          )}
          {level && (
            <span className="px-3 py-1 bg-[#E8F1FB] text-[#1E6DD1] rounded-full text-sm flex items-center gap-1">
              {level}
              <button onClick={() => { setLevel(''); handleSearch(); }} className="ml-1">×</button>
            </span>
          )}
          {type && (
            <span className="px-3 py-1 bg-gray-100 text-[#1A1A2E] rounded-full text-sm flex items-center gap-1">
              {type === 'teachers' ? 'Professeurs' : type === 'classrooms' ? 'Cours' : type === 'free' ? 'Gratuit' : 'Payant'}
              <button onClick={() => { setType(''); handleSearch(); }} className="ml-1">×</button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}