'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Teacher {
  id: string
  display_name: string
  avatar_url?: string
  bio?: string
  city?: string
  subjects: string[]
  levels: string[]
  hourly_rate?: number
  rating: number
  total_reviews: number
  is_available: boolean
  experience?: string
}

interface Enrollment {
  id: string
  classroom: {
    id: string
    title: string
    subject: string
    teacher: {
      display_name: string
      avatar_url?: string
    }
  }
  progress?: number
}

const SUBJECTS_CATEGORIES = [
  { name: 'Mathématiques', icon: '📐', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { name: 'Physique-Chimie', icon: '⚗️', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { name: 'Français', icon: '📝', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  { name: 'Anglais', icon: '🌍', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
  { name: 'Histoire-Géo', icon: '🗺️', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
  { name: 'SVT', icon: '🌱', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { name: 'Philosophie', icon: '💭', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
  { name: 'SES', icon: '📊', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)' },
]

const LEVELS = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale', 'BTS', 'Licence', 'Master']

export default function StudentHomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [topTeachers, setTopTeachers] = useState<Teacher[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser)

    if (currentUser) {
      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      
      if (profile) setUserProfile(profile)

      // Get enrollments
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select(`
          id,
          classroom:classrooms (
            id,
            title,
            subject,
            teacher:users!classrooms_teacher_id_fkey (display_name, avatar_url)
          )
        `)
        .eq('student_id', currentUser.id)
        .limit(4)

      if (enrollmentData) setEnrollments(enrollmentData as any)
    }

    // Get top teachers
    const { data: teachers } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, bio, city, subjects, levels, hourly_rate, rating, total_reviews, is_available, experience')
      .eq('role', 'teacher')
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(6)

    if (teachers) setTopTeachers(teachers)

    setLoading(false)
  }

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedSubject) params.set('subject', selectedSubject)
    router.push(`/search?${params.toString()}`)
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #d946ef 100%)',
        borderRadius: '0 0 40px 40px',
        padding: '48px 24px 60px',
        marginBottom: '-30px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorations */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Greeting */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
              {getGreeting()}, {userProfile?.display_name || 'futur champion'} ! 👋
            </h1>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
              Prêt à apprendre quelque chose de nouveau aujourd'hui ?
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ 
            display: 'flex', 
            gap: '12px', 
            backgroundColor: 'white', 
            padding: '8px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px' }}>🔍</span>
              <input
                type="text"
                placeholder="Rechercher un professeur, une matière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '14px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                padding: '16px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '14px',
                fontSize: '16px',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '180px'
              }}
            >
              <option value="">Toutes matières</option>
              {SUBJECTS_CATEGORIES.map(s => (
                <option key={s.name} value={s.name}>{s.icon} {s.name}</option>
              ))}
            </select>
            <button
              type="submit"
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)'
              }}
            >
              Rechercher
            </button>
          </form>

          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: '32px', marginTop: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { value: `${topTeachers.length}+`, label: 'Professeurs', icon: '👨‍🏫' },
              { value: '15+', label: 'Matières', icon: '📚' },
              { value: '4.8', label: 'Note moyenne', icon: '⭐' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '800', color: 'white' }}>{stat.value}</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{stat.icon} {stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        
        {/* Continue Learning Section */}
        {enrollments.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>
                  📖 Continuer l'apprentissage
                </h2>
                <p style={{ color: '#6b7280', fontSize: '15px' }}>Reprenez là où vous vous êtes arrêté</p>
              </div>
              <Link href="/student/my-courses" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                Voir tout →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {enrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/classroom/${enrollment.classroom?.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700'
                      }}>
                        {enrollment.classroom?.teacher?.avatar_url ? (
                          <img src={enrollment.classroom.teacher.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                        ) : (
                          getInitials(enrollment.classroom?.teacher?.display_name || '')
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {enrollment.classroom?.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280' }}>
                          {enrollment.classroom?.teacher?.display_name}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${enrollment.progress || 30}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>{enrollment.progress || 30}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '24px' }}>
            ⚡ Actions rapides
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[
              { title: 'Trouver un Professeur', desc: 'Parcourez nos professeurs qualifiés', icon: '👨‍🏫', href: '/search', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
              { title: 'Mes Cours', desc: 'Accédez à vos cours en cours', icon: '📚', href: '/student/my-courses', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
              { title: 'Planning', desc: 'Consultez votre emploi du temps', icon: '📅', href: '/student/schedule', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
              { title: 'Messages', desc: 'Discutez avec vos professeurs', icon: '💬', href: '/messages', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
            ].map((action, i) => (
              <Link key={i} href={action.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: action.gradient,
                  borderRadius: '20px',
                  padding: '28px',
                  color: 'white',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
                >
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{action.icon}</span>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{action.title}</h3>
                  <p style={{ fontSize: '14px', opacity: 0.9 }}>{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Subjects Grid */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>
                📚 Explorer par matière
              </h2>
              <p style={{ color: '#6b7280', fontSize: '15px' }}>Trouvez le professeur idéal dans votre matière</p>
            </div>
            <Link href="/search" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Voir tout →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {SUBJECTS_CATEGORIES.map((subject) => {
              const teacherCount = topTeachers.filter(t => t.subjects?.includes(subject.name)).length
              return (
                <Link
                  key={subject.name}
                  href={`/search?subject=${encodeURIComponent(subject.name)}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: subject.gradient,
                    borderRadius: '16px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: 'white',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
                  >
                    <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>{subject.icon}</span>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{subject.name}</h3>
                    <p style={{ fontSize: '12px', opacity: 0.85 }}>{teacherCount} prof{teacherCount > 1 ? 's' : ''}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Top Teachers */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>
                ⭐ Professeurs recommandés
              </h2>
              <p style={{ color: '#6b7280', fontSize: '15px' }}>Les mieux notés par nos étudiants</p>
            </div>
            <Link href="/search" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Voir tous →
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: '#6b7280' }}>Chargement des professeurs...</p>
            </div>
          ) : topTeachers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '20px' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🏫</p>
              <p style={{ color: '#6b7280' }}>Aucun professeur disponible pour le moment</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {topTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  onClick={() => router.push(`/teachers/${teacher.id}`)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.2)' }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '24px',
                        overflow: 'hidden'
                      }}>
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt={teacher.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(teacher.display_name)
                        )}
                      </div>
                      {teacher.is_available && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          width: '24px',
                          height: '24px',
                          backgroundColor: '#10b981',
                          borderRadius: '50%',
                          border: '3px solid white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        {teacher.display_name}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px' }}>
                        {teacher.city && `📍 ${teacher.city}`} {teacher.experience && `• ${teacher.experience}`}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#f59e0b', fontSize: '16px' }}>⭐</span>
                        <span style={{ fontWeight: '700', color: '#111827' }}>
                          {teacher.rating ? teacher.rating.toFixed(1) : 'Nouveau'}
                        </span>
                        {teacher.total_reviews > 0 && (
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>({teacher.total_reviews} avis)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {teacher.bio || 'Professeur passionné et expérimenté'}
                  </p>

                  {/* Subjects */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {teacher.subjects?.slice(0, 3).map((subject, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        {subject}
                      </span>
                    ))}
                    {teacher.subjects && teacher.subjects.length > 3 && (
                      <span style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}>
                        +{teacher.subjects.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                    <div>
                      <span style={{ fontSize: '24px', fontWeight: '800', color: '#111827' }}>{teacher.hourly_rate || '—'}€</span>
                      <span style={{ fontSize: '14px', color: '#9ca3af' }}>/heure</span>
                    </div>
                    <button style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                    }}>
                      Voir le profil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #d946ef 100%)',
          borderRadius: '24px',
          padding: '48px',
          textAlign: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
          
          <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px' }}>
            🚀 Prêt à progresser ?
          </h2>
          <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Rejoignez des milliers d'étudiants qui ont trouvé leur professeur idéal
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/search">
              <button style={{
                padding: '16px 32px',
                backgroundColor: 'white',
                color: '#3b82f6',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
              }}>
                🔍 Trouver un professeur
              </button>
            </Link>
            <Link href="/student/dashboard">
              <button style={{
                padding: '16px 32px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer'
              }}>
                📊 Mon tableau de bord
              </button>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}