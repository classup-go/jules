import Link from 'next/link'

const SUBJECTS = [
  { id: 'Mathématiques', icon: '📐', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { id: 'Physique', icon: '⚡', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
  { id: 'Chimie', icon: '🧪', color: 'bg-green-100 text-green-600 border-green-200' },
  { id: 'SVT', icon: '🌿', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
  { id: 'Français', icon: '📖', color: 'bg-red-100 text-red-600 border-red-200' },
  { id: 'Anglais', icon: '🇬🇧', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
  { id: 'Arabe', icon: '🕌', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { id: 'Histoire-Géo', icon: '🌍', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  { id: 'Philosophie', icon: '🤔', color: 'bg-purple-100 text-purple-600 border-purple-200' },
  { id: 'Informatique', icon: '💻', color: 'bg-cyan-100 text-cyan-600 border-cyan-200' },
  { id: 'Économie', icon: '📊', color: 'bg-pink-100 text-pink-600 border-pink-200' },
  { id: 'Musique', icon: '🎵', color: 'bg-rose-100 text-rose-600 border-rose-200' },
]

export default function SubjectsPage() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/student/my-courses">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-[#1A1A2E]">Matières</h1>
        </div>
        <p className="text-[#6B7280]">Choisissez une matière pour trouver des cours</p>
      </div>

      {/* Subjects Grid */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 gap-4">
          {SUBJECTS.map((subject) => (
            <Link key={subject.id} href={'/search?subject=' + encodeURIComponent(subject.id)}>
              <div className={`rounded-2xl p-5 border-2 ${subject.color} transition-all hover:scale-105`}>
                <span className="text-4xl block mb-3">{subject.icon}</span>
                <h3 className="font-semibold">{subject.id}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">🔥 Populaire</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <Link href="/search?subject=Mathématiques&level=Bac">
            <div className="bg-white rounded-2xl p-4 shadow-sm whitespace-nowrap">
              <p className="font-medium text-[#1A1A2E]">📐 Math Bac</p>
              <p className="text-xs text-[#6B7280]">Préparation bac</p>
            </div>
          </Link>
          <Link href="/search?subject=Physique&level=Bac">
            <div className="bg-white rounded-2xl p-4 shadow-sm whitespace-nowrap">
              <p className="font-medium text-[#1A1A2E]">⚡ Physique Bac</p>
              <p className="text-xs text-[#6B7280]">Préparation bac</p>
            </div>
          </Link>
          <Link href="/search?type=free">
            <div className="bg-white rounded-2xl p-4 shadow-sm whitespace-nowrap">
              <p className="font-medium text-[#1A1A2E]">🆓 Cours gratuits</p>
              <p className="text-xs text-[#6B7280]">Tous niveaux</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around items-center">
        <Link href="/student/my-courses" className="flex flex-col items-center gap-1 text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs">Accueil</span>
        </Link>
        <Link href="/subjects" className="flex flex-col items-center gap-1 text-[#1E6DD1]">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs font-medium">Matières</span>
        </Link>
        <Link href="/search" className="flex flex-col items-center gap-1 text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs">Recherche</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs">Profil</span>
        </Link>
      </nav>
    </div>
  )
}