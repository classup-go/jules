'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface User {
  id: string
  email: string
  display_name: string
  role: 'student' | 'teacher'
  avatar_url?: string
  city?: string
  bio?: string
  created_at: string
}

interface TeacherProfile {
  subjects: string[]
  rating: number
  total_reviews: number
  hourly_rate: number
}

interface Enrollment {
  id: string
  classroom: {
    id: string
    title: string
    subject: string
    teacher: {
      display_name: string
    }
  }
}

interface Classroom {
  id: string
  title: string
  subject: string
  enrolled_count: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) return

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser(profile)

        if (profile.role === 'teacher') {
          // Teacher profile data is now in users table
          setTeacherProfile({
            user_id: profile.id,
            subjects: profile.subjects || [],
            levels: profile.levels || [],
            hourly_rate: profile.hourly_rate || 0,
            rating: profile.rating || 0,
            review_count: profile.total_reviews || 0,
            total_students: profile.total_students || 0,
            total_hours: 0,
            availability: null,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          } as any)

          // Get classrooms
          const { data: classroomData } = await supabase
            .from('classrooms')
            .select('*')
            .eq('teacher_id', authUser.id)

          if (classroomData) setClassrooms(classroomData)
        } else {
          // Get enrollments for students
          const { data: enrollmentData } = await supabase
            .from('enrollments')
            .select(`
              id,
              classroom:classrooms (
                id,
                title,
                subject,
                teacher:users!classrooms_teacher_id_fkey (display_name)
              )
            `)
            .eq('student_id', authUser.id)

          if (enrollmentData) setEnrollments(enrollmentData as any)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  const isTeacher = user?.role === 'teacher'
  const totalStudents = classrooms.reduce((acc, c) => acc + (c.enrolled_count || 0), 0)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Profile Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden', marginBottom: '24px' }}>
        {/* Banner for teachers */}
        {isTeacher && (
          <div style={{ height: '100px', background: 'linear-gradient(to right, #3b82f6, #2b8cee)' }}></div>
        )}
        
        <div style={{ padding: '24px', marginTop: isTeacher ? '-40px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '20px' }}>
            {/* Avatar */}
            <div style={{ 
              width: isTeacher ? '80px' : '72px', 
              height: isTeacher ? '80px' : '72px', 
              borderRadius: isTeacher ? '16px' : '50%', 
              backgroundColor: '#2b8cee', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '28px', 
              fontWeight: 'bold',
              border: isTeacher ? '4px solid white' : 'none',
              boxShadow: isTeacher ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}>
              {getInitials(user?.display_name || '')}
            </div>
            
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>{user?.display_name}</h1>
              <p style={{ color: '#617589', fontSize: '14px' }}>
                {isTeacher ? '🎓 Professeur' : '📚 Élève'} • Inscrit depuis {user?.created_at ? formatDate(user.created_at) : 'N/A'}
              </p>
            </div>
            
            <Link href="/profile/edit" style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #dbe0e6', borderRadius: '8px', color: '#111418', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>
              Gérer mes informations
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {isTeacher ? (
              <>
                <div style={{ padding: '8px 16px', backgroundColor: 'rgba(43, 140, 238, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏫</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#2b8cee' }}>{classrooms.length} Classes</span>
                </div>
                <div style={{ padding: '8px 16px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👥</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>{totalStudents} Élèves</span>
                </div>
                <div style={{ padding: '8px 16px', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⭐</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#ca8a04' }}>{teacherProfile?.rating?.toFixed(1) || '0.0'}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: '8px 16px', backgroundColor: 'rgba(43, 140, 238, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📚</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#2b8cee' }}>{enrollments.length} Cours actifs</span>
                </div>
                <div style={{ padding: '8px 16px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✅</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>0 Leçons complétées</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: isTeacher ? '1fr' : '2fr 1fr', gap: '24px' }}>
        {/* Main Content */}
        <div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>
                {isTeacher ? 'Mes Classes' : 'Mes Cours Actuels'}
              </h2>
              <Link href={isTeacher ? '/teacher/classrooms' : '/student/my-courses'} style={{ color: '#2b8cee', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
                Voir tout →
              </Link>
            </div>

            {isTeacher ? (
              classrooms.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <p style={{ color: '#617589', marginBottom: '16px' }}>Aucune classe créée</p>
                  <Link href="/teacher/classrooms/new" style={{ color: '#2b8cee', fontWeight: '600' }}>
                    Créer ma première classe →
                  </Link>
                </div>
              ) : (
                classrooms.slice(0, 4).map((classroom) => (
                  <Link
                    key={classroom.id}
                    href={`/teacher/classrooms/${classroom.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none' }}
                  >
                    <div>
                      <p style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>{classroom.title}</p>
                      <p style={{ fontSize: '13px', color: '#617589' }}>{classroom.subject}</p>
                    </div>
                    <span style={{ fontSize: '13px', color: '#617589' }}>{classroom.enrolled_count || 0} élèves</span>
                  </Link>
                ))
              )
            ) : (
              enrollments.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <p style={{ color: '#617589', marginBottom: '16px' }}>Vous n'êtes inscrit à aucun cours</p>
                  <Link href="/search" style={{ color: '#2b8cee', fontWeight: '600' }}>
                    Découvrir les cours →
                  </Link>
                </div>
              ) : (
                enrollments.slice(0, 4).map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/classroom/${enrollment.classroom.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none' }}
                  >
                    <div>
                      <p style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>{enrollment.classroom.title}</p>
                      <p style={{ fontSize: '13px', color: '#617589' }}>{enrollment.classroom.subject}</p>
                    </div>
                    <span style={{ fontSize: '13px', color: '#617589' }}>{enrollment.classroom.teacher?.display_name}</span>
                  </Link>
                ))
              )
            )}
          </div>
        </div>

        {/* Sidebar - Only for students */}
        {!isTeacher && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Teachers */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>Mes Professeurs</h3>
              
              {enrollments.length === 0 ? (
                <p style={{ color: '#617589', fontSize: '14px', textAlign: 'center' }}>Aucun professeur</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...new Set(enrollments.map(e => e.classroom.teacher?.display_name))].slice(0, 3).map((name, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                        {getInitials(name || '')}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#111418' }}>{name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <button style={{ width: '100%', marginTop: '16px', padding: '10px', border: '1px solid #dbe0e6', borderRadius: '8px', backgroundColor: 'white', color: '#617589', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>
                Voir tous les professeurs
              </button>
            </div>

            {/* Weekly Goal */}
            <div style={{ backgroundColor: '#2b8cee', color: 'white', borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>🎯 Objectif Hebdomadaire</h3>
              <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>0h sur 5h de cours cette semaine</p>
              <p style={{ fontSize: '32px', fontWeight: 'bold' }}>0%</p>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginTop: '8px' }}>
                <div style={{ width: '0%', height: '100%', backgroundColor: 'white', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}