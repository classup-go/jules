'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Teacher {
  id: string
  display_name: string
  city?: string
  bio?: string
  subjects: string[]
  rating?: number
  classroomCount: number
}

export default function MyTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Step 1: Get enrollments
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('classroom_id')
          .eq('student_id', user.id)

        if (!enrollmentsData || enrollmentsData.length === 0) {
          setLoading(false)
          return
        }

        const classroomIds = enrollmentsData.map(e => e.classroom_id)

        // Step 2: Get classrooms
        const { data: classroomsData } = await supabase
          .from('classrooms')
          .select('id, teacher_id, subject')
          .in('id', classroomIds)

        if (!classroomsData || classroomsData.length === 0) {
          setLoading(false)
          return
        }

        // Step 3: Build teacher info from classrooms
        const teacherInfo = new Map<string, { subjects: Set<string>, count: number }>()

        classroomsData.forEach(c => {
          if (c.teacher_id) {
            if (!teacherInfo.has(c.teacher_id)) {
              teacherInfo.set(c.teacher_id, { subjects: new Set(), count: 0 })
            }
            const info = teacherInfo.get(c.teacher_id)!
            info.subjects.add(c.subject)
            info.count++
          }
        })

        const teacherIds = [...teacherInfo.keys()]

        if (teacherIds.length === 0) {
          setLoading(false)
          return
        }

        // Step 4: Get teacher details from users table (nouveau système)
        const { data: teachersData } = await supabase
          .from('users')
          .select('id, display_name, city, bio, rating')
          .in('id', teacherIds)

        if (teachersData) {
          const teachersResult: Teacher[] = teachersData.map(teacherData => {
            const info = teacherInfo.get(teacherData.id)!
            return {
              id: teacherData.id,
              display_name: teacherData.display_name,
              city: teacherData.city || '',
              bio: teacherData.bio || '',
              subjects: [...info.subjects],
              rating: teacherData.rating || 0,
              classroomCount: info.count,
            }
          })

          setTeachers(teachersResult)
        }

      } catch (error) {
        console.error('Error:', error)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getSubjectStyle = (subject: string) => {
    const styles: { [key: string]: { bg: string, text: string } } = {
      'Mathématiques': { bg: '#dbeafe', text: '#2563eb' },
      'Physique': { bg: '#fef3c7', text: '#d97706' },
      'Chimie': { bg: '#fce7f3', text: '#db2777' },
      'Français': { bg: '#f3e8ff', text: '#9333ea' },
      'Anglais': { bg: '#e0e7ff', text: '#4f46e5' },
      'Histoire-Géo': { bg: '#ffedd5', text: '#ea580c' },
      'SVT': { bg: '#d1fae5', text: '#059669' },
      'Informatique': { bg: '#cffafe', text: '#0891b2' },
    }
    return styles[subject] || { bg: '#f3f4f6', text: '#6b7280' }
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Mes Professeurs</h1>
          <p style={{ color: '#617589' }}>Retrouvez tous vos professeurs et contactez-les facilement</p>
        </div>
        <Link href="/search" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
          Trouver un professeur
        </Link>
      </div>

      {/* Teachers Grid */}
      {teachers.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👨‍🏫</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Aucun professeur</h3>
          <p style={{ color: '#617589', marginBottom: '24px' }}>Inscrivez-vous à un cours pour avoir accès à vos professeurs</p>
          <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>
            Trouver un professeur →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                  {getInitials(teacher.display_name)}
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', color: '#111418', fontSize: '18px', marginBottom: '4px' }}>{teacher.display_name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {teacher.rating && teacher.rating > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#617589' }}>
                        ⭐ {teacher.rating.toFixed(1)}
                      </span>
                    )}
                    {teacher.city && (
                      <span style={{ fontSize: '14px', color: '#617589' }}>📍 {teacher.city}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subjects */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {teacher.subjects.map((subject, i) => {
                  const style = getSubjectStyle(subject)
                  return (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: style.bg, color: style.text, fontSize: '13px', fontWeight: '500' }}>
                      {subject}
                    </span>
                  )
                })}
              </div>

              {/* Bio */}
              {teacher.bio && (
                <p style={{ fontSize: '14px', color: '#617589', lineHeight: '1.5', marginBottom: '16px' }}>
                  {teacher.bio.length > 100 ? teacher.bio.slice(0, 100) + '...' : teacher.bio}
                </p>
              )}

              {/* Stats */}
              <p style={{ fontSize: '13px', color: '#617589', marginBottom: '20px' }}>
                📚 {teacher.classroomCount} cours suivi{teacher.classroomCount > 1 ? 's' : ''}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link href={`/teachers/${teacher.id}`} style={{ flex: 1, padding: '10px', border: '1px solid #dbe0e6', borderRadius: '8px', backgroundColor: 'white', color: '#111418', fontWeight: '500', fontSize: '14px', cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>
                  Voir le profil
                </Link>
                <button style={{ flex: 1, padding: '10px', backgroundColor: '#2b8cee', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>
                  💬 Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
