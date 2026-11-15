import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function TeachersPage() {
  const supabase = await createClient()

  // Utiliser le nouveau système: colonnes dans users
  const { data: teachers } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, city, subjects, levels, hourly_rate, rating, total_reviews, verified, profile_completed')
    .eq('role', 'teacher')
    .eq('profile_completed', true)
    .eq('is_available', true)
    .order('verified', { ascending: false })
    .order('rating', { ascending: false })

  // Group by subject
  const teachersBySubject: { [key: string]: any[] } = {}
  teachers?.forEach((teacher) => {
    teacher.subjects?.forEach((subject: string) => {
      if (!teachersBySubject[subject]) {
        teachersBySubject[subject] = []
      }
      if (!teachersBySubject[subject].find(t => t.id === teacher.id)) {
        teachersBySubject[subject].push(teacher)
      }
    })
  })

  const totalTeachers = teachers?.length || 0

  return (
    <div className="w-full min-h-screen bg-[#F7F8FA]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#1A365D] to-[#2A4A7D] text-white p-6 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6 lg:hidden">
            <Link href="/student/my-courses">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>

          <div className="lg:flex lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-3">
                Trouvez le professeur idéal
              </h1>
              <p className="text-xl text-white/80 mb-6">
                {totalTeachers} professeurs qualifiés disponibles
              </p>
            </div>

            {/* Filters - Desktop */}
            <div className="hidden lg:flex gap-3">
              <Link href="/search">
                <Button variant="secondary" className="gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                  Filtres
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8 -mt-8">
        {/* Quick Filters */}
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Link href="/search">
              <button className="px-4 py-2 bg-[#E8F4FD] text-[#1A365D] rounded-full text-sm font-medium whitespace-nowrap border-2 border-[#1A365D]">
                Tous
              </button>
            </Link>
            <Link href="/search">
              <button className="px-4 py-2 bg-white border border-gray-200 text-[#1A365D] rounded-full text-sm font-medium whitespace-nowrap hover:bg-[#F7F8FA]">
                Mathématiques
              </button>
            </Link>
            <Link href="/search">
              <button className="px-4 py-2 bg-white border border-gray-200 text-[#1A365D] rounded-full text-sm font-medium whitespace-nowrap hover:bg-[#F7F8FA]">
                Physique
              </button>
            </Link>
            <Link href="/search">
              <button className="px-4 py-2 bg-white border border-gray-200 text-[#1A365D] rounded-full text-sm font-medium whitespace-nowrap hover:bg-[#F7F8FA]">
                Français
              </button>
            </Link>
            <Link href="/search">
              <button className="px-4 py-2 bg-white border border-gray-200 text-[#1A365D] rounded-full text-sm font-medium whitespace-nowrap hover:bg-[#F7F8FA]">
                Anglais
              </button>
            </Link>
          </div>
        </div>

        {/* Teachers by Subject */}
        {Object.entries(teachersBySubject).slice(0, 4).map(([subject, subjectTeachers]) => (
          <div key={subject} className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-[#1A365D]">{subject}</h2>
              <Link href={'/search'}>
                <button className="text-[#1A365D] font-medium text-sm hover:underline flex items-center gap-1">
                  Voir tout
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {subjectTeachers.slice(0, 4).map((teacher) => (
                <Link key={teacher.id} href={'/teachers/' + teacher.id}>
                  <div className="bg-white rounded-2xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border border-transparent hover:border-[#E8F4FD] group">
                    {/* Avatar */}
                    <div className="relative mb-4">
                      <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-[#E8F4FD] ring-4 ring-white group-hover:ring-[#E8F4FD] transition-all">
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-[#1A365D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {teacher.verified && (
                        <div className="absolute top-0 right-0 w-6 h-6 bg-[#22C55E] rounded-full flex items-center justify-center ring-2 ring-white">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-center font-bold text-[#1A365D] mb-1 text-lg truncate">
                      {teacher.display_name}
                    </h3>

                    {/* City */}
                    {teacher.city && (
                      <p className="text-center text-sm text-[#9CA3AF] mb-2">📍 {teacher.city}</p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center justify-center gap-1 mb-3">
                      {teacher.rating && teacher.rating > 0 ? (
                        <>
                          <svg className="w-5 h-5 text-[#F5A623] fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          <span className="font-semibold text-[#1A365D]">{teacher.rating.toFixed(1)}</span>
                          <span className="text-[#9CA3AF] text-sm">({teacher.total_reviews || 0})</span>
                        </>
                      ) : (
                        <Badge variant="orange" className="text-xs">Nouveau</Badge>
                      )}
                    </div>

                    {/* Subjects */}
                    <div className="flex flex-wrap gap-1 mb-4 justify-center">
                      {teacher.subjects?.slice(0, 2).map((sub: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {sub}
                        </Badge>
                      ))}
                      {teacher.subjects?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{teacher.subjects.length - 2}
                        </Badge>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-center mb-4">
                      <span className="text-2xl font-bold text-[#1A365D]">{teacher.hourly_rate || '?'}</span>
                      <span className="text-[#9CA3AF] text-sm ml-1">€/h</span>
                    </div>

                    {/* Button */}
                    <Button variant="secondary" className="w-full group-hover:bg-[#1A365D] group-hover:text-white transition-all">
                      Voir le profil
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {totalTeachers === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center">
            <svg className="w-24 h-24 mx-auto mb-6 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <h3 className="text-2xl font-bold text-[#1A365D] mb-2">Aucun professeur trouvé</h3>
            <p className="text-[#9CA3AF] mb-6">Les professeurs doivent compléter leur profil professionnel pour apparaître ici</p>
            <Link href="/search">
              <Button>Rechercher des professeurs</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
