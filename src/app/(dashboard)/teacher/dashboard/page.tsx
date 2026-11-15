'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

interface User {
  id: string
  email: string
  display_name: string
  role: 'student' | 'teacher'
  avatar_url?: string | null
  city?: string
  bio?: string
  created_at: string
}

interface TeacherProfile {
  id: string
  user_id: string
  subjects: string[]
  levels: string[]
  hourly_rate: number
  rating: number
  total_reviews: number
}

interface Classroom {
  id: string
  title: string
  subject: string
  level: string
  price: number
  enrolled_count: number
}

interface LiveSession {
  id: string
  title: string
  scheduled_at: string
  student: {
    display_name: string
  }
}

// Avatar Component with fallback to initials
function UserAvatar({ 
  src, 
  name, 
  size = 96 
}: { 
  src?: string | null
  name: string
  size?: number 
}) {
  const [imageError, setImageError] = useState(false)
  
  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false)
  }, [src])

  const hasValidAvatar = src && !imageError

  if (hasValidAvatar) {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        borderRadius: '16px', 
        overflow: 'hidden',
        border: '4px solid white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        position: 'relative',
        flexShrink: 0
      }}>
        <Image
          src={src}
          alt={name || 'Avatar'}
          width={size}
          height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setImageError(true)}
          unoptimized
        />
      </div>
    )
  }

  // Fallback to initials
  return (
    <div style={{ 
      width: size, 
      height: size, 
      borderRadius: '16px', 
      backgroundColor: '#2b8cee', 
      color: 'white', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontSize: size * 0.35,
      fontWeight: 'bold',
      border: '4px solid white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  )
}

export default function TeacherDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [nextSession, setNextSession] = useState<LiveSession | null>(null)
  const [stats, setStats] = useState({ totalStudents: 0, totalHours: 0, totalEarnings: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) return

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) setUser(userData)

      // Get teacher profile
      const { data: teacherData } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      if (teacherData) setProfile(teacherData)

      // Get classrooms
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', authUser.id)
        .order('created_at', { ascending: false })

      if (classroomData) setClassrooms(classroomData)

      // Get next session
      const { data: sessionData } = await supabase
        .from('live_sessions')
        .select(`
          id,
          title,
          scheduled_at,
          student:users!live_sessions_student_id_fkey (display_name)
        `)
        .eq('teacher_id', authUser.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single()

      if (sessionData) setNextSession(sessionData as any)

      // Calculate stats
      const totalStudents = classroomData?.reduce((acc, c) => acc + (c.enrolled_count || 0), 0) || 0
      setStats({
        totalStudents,
        totalHours: Math.floor(totalStudents * 2.5),
        totalEarnings: totalStudents * (teacherData?.hourly_rate || 0)
      })

      setLoading(false)
    }

    fetchData()
  }, [])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (isToday) {
      return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getSubjectIcon = (subject: string) => {
    const icons: { [key: string]: string } = {
      'Mathématiques': '📐',
      'Physique': '⚡',
      'Chimie': '🧪',
      'Français': '📝',
      'Anglais': '🌍',
      'Espagnol': '🇪🇸',
      'Histoire-Géo': '🗺️',
      'SVT': '🌱',
      'Informatique': '💻',
    }
    return icons[subject] || '📚'
  }

  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: { bg: string, text: string } } = {
      'Mathématiques': { bg: '#dbeafe', text: '#2563eb' },
      'Physique': { bg: '#fef3c7', text: '#d97706' },
      'Anglais': { bg: '#e0e7ff', text: '#4f46e5' },
      'Espagnol': { bg: '#ffedd5', text: '#ea580c' },
      'Français': { bg: '#f3e8ff', text: '#9333ea' },
    }
    return colors[subject] || { bg: '#f3f4f6', text: '#6b7280' }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
            {/* Banner */}
            <div style={{ height: '128px', background: 'linear-gradient(to right, #3b82f6, #2b8cee)', position: 'relative' }}>
              <button style={{ position: 'absolute', top: '16px', right: '16px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
                ✏️
              </button>
            </div>
            
            {/* Content */}
            <div style={{ padding: '0 24px 24px', position: 'relative' }}>
              {/* Avatar - FIXED: Now uses UserAvatar component */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-48px', marginBottom: '16px' }}>
                <UserAvatar 
                  src={user?.avatar_url} 
                  name={user?.display_name || ''} 
                  size={96} 
                />
                <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
                  Disponible
                </span>
              </div>

              {/* Info */}
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>{user?.display_name}</h1>
                <p style={{ color: '#2b8cee', fontWeight: '500', fontSize: '14px', marginBottom: '12px' }}>
                  Professeur {profile?.subjects?.length ? `de ${profile.subjects.join(' & ')}` : ''}
                </p>
                <p style={{ color: '#617589', fontSize: '14px', lineHeight: '1.6' }}>
                  {user?.bio || 'Passionné par l\'enseignement, j\'aide mes élèves à atteindre leurs objectifs.'}
                </p>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #dbe0e6', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#617589' }}>
                  <span style={{ color: '#2b8cee' }}>📍</span>
                  {user?.city || 'Non renseigné'} (et en ligne)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#617589' }}>
                  <span style={{ color: '#2b8cee' }}>✓</span>
                  Identité vérifiée
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#617589' }}>
                  <span style={{ color: '#2b8cee' }}>⚡</span>
                  Réponse en moins d'1h
                </div>
              </div>

              <Link href="/profile/edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px', width: '100%', padding: '10px', backgroundColor: 'white', border: '1px solid #dbe0e6', borderRadius: '12px', color: '#111418', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>
                ⚙️ Modifier mes informations
              </Link>
            </div>
          </div>

          {/* Next Session Card */}
          <div style={{ backgroundColor: '#2b8cee', color: 'white', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-16px', right: '-16px', width: '96px', height: '96px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
            
            <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>Prochain cours</h3>
            
            {nextSession ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', textAlign: 'center', minWidth: '60px' }}>
                    <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>Auj</span>
                    <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold' }}>
                      {new Date(nextSession.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '18px' }}>{nextSession.student?.display_name}</p>
                    <p style={{ fontSize: '14px', opacity: 0.9 }}>{nextSession.title}</p>
                  </div>
                </div>
                <button style={{ width: '100%', backgroundColor: 'white', color: '#2b8cee', fontWeight: 'bold', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', position: 'relative', zIndex: 1 }}>
                  Rejoindre la classe
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', position: 'relative', zIndex: 1 }}>
                <p style={{ opacity: 0.9, marginBottom: '12px' }}>Aucun cours prévu</p>
                <Link href="/teacher/sessions/new" style={{ color: 'white', fontWeight: '600', textDecoration: 'underline' }}>
                  Planifier un cours
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #dbe0e6', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(43, 140, 238, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                👥
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stats.totalStudents}</p>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#617589', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Élèves</p>
              </div>
            </div>
            
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #dbe0e6', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                ⏱️
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stats.totalHours}h</p>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#617589', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Enseignées</p>
              </div>
            </div>
            
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #dbe0e6', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                ⭐
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{profile?.rating?.toFixed(1) || '0.0'}/5</p>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#617589', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note moyenne</p>
              </div>
            </div>
          </div>

          {/* Courses & Rates */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #dbe0e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎓 Mes Classes
              </h2>
              <Link href="/teacher/classes/create" style={{ fontSize: '14px', fontWeight: '600', color: 'white', backgroundColor: '#2b8cee', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ➕ Créer une classe
              </Link>
            </div>
            
            <div>
              {classrooms.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ color: '#617589', marginBottom: '16px' }}>Aucune classe créée</p>
                  <Link href="/teacher/classes/create" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#2b8cee', color: 'white', fontWeight: '600', borderRadius: '12px', textDecoration: 'none' }}>
                    ➕ Créer ma première classe
                  </Link>
                </div>
              ) : (
                classrooms.slice(0, 4).map((classroom) => {
                  const colors = getSubjectColor(classroom.subject)
                  return (
                    <Link
                      key={classroom.id}
                      href={`/teacher/classrooms/${classroom.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #dbe0e6', textDecoration: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ backgroundColor: colors.bg, color: colors.text, padding: '8px', borderRadius: '8px', fontSize: '20px' }}>
                          {getSubjectIcon(classroom.subject)}
                        </div>
                        <div>
                          <h3 style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>{classroom.title}</h3>
                          <p style={{ fontSize: '14px', color: '#617589' }}>{classroom.level}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontWeight: 'bold', color: '#111418', backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px' }}>
                          {classroom.price}€/h
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* Bottom Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            
            {/* Availabilities */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📅 Disponibilités
                </h2>
                <button style={{ color: '#2b8cee', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}>
                  ✏️
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi'].map((day, index) => (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ fontWeight: '500', width: '80px', color: '#617589' }}>{day}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {index === 2 ? (
                        <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          Indisponible
                        </span>
                      ) : (
                        <>
                          <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                            09:00 - 12:00
                          </span>
                          {index !== 1 && (
                            <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                              14:00 - 18:00
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #dbe0e6', textAlign: 'center' }}>
                <Link href="/teacher/schedule" style={{ fontSize: '14px', fontWeight: '600', color: '#2b8cee', textDecoration: 'none' }}>
                  Voir le calendrier complet
                </Link>
              </div>
            </div>

            {/* Reviews */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💬 Avis Récents
                </h2>
                <span style={{ fontSize: '14px', color: '#617589', fontWeight: '500' }}>{profile?.total_reviews || 0} Avis</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                {/* Sample reviews */}
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#7c3aed' }}>JL</div>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#111418' }}>Jean Luc</span>
                    </div>
                    <div style={{ color: '#facc15', fontSize: '12px' }}>⭐⭐⭐⭐⭐</div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#617589', lineHeight: '1.5' }}>
                    "Excellent professeur, très pédagogue et patient. Je recommande !"
                  </p>
                </div>
                
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#0d9488' }}>AM</div>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#111418' }}>Alice M.</span>
                    </div>
                    <div style={{ color: '#facc15', fontSize: '12px' }}>⭐⭐⭐⭐</div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#617589', lineHeight: '1.5' }}>
                    "Cours très bien structuré. Je recommande."
                  </p>
                </div>
              </div>
              
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #dbe0e6', textAlign: 'center' }}>
                <Link href="/teacher/reviews" style={{ fontSize: '14px', fontWeight: '600', color: '#2b8cee', textDecoration: 'none' }}>
                  Voir tous les avis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}