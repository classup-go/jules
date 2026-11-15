'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Classroom {
  id: string
  title: string
  subject: string
  level: string
  price: number
  is_free: boolean
  is_public: boolean
  enrolled_count: number
  created_at: string
}

export default function TeacherClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalClassrooms: 0,
    totalStudents: 0,
    activeClassrooms: 0,
    totalEarnings: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Get classrooms
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (!classroomsData) {
        setLoading(false)
        return
      }

      const classroomIds = classroomsData.map(c => c.id)

      // Get actual enrollment counts per classroom
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('classroom_id')
        .in('classroom_id', classroomIds)

      // Count enrollments per classroom
      const enrollmentCounts = new Map<string, number>()
      enrollmentsData?.forEach(e => {
        enrollmentCounts.set(e.classroom_id, (enrollmentCounts.get(e.classroom_id) || 0) + 1)
      })

      // Get payments for earnings
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, classroom_id, status')
        .eq('teacher_id', user.id)
        .eq('status', 'completed')

      // Calculate total earnings
      const totalEarnings = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      // Enrich classrooms with actual enrollment counts
      const enrichedClassrooms = classroomsData.map(c => ({
        ...c,
        enrolled_count: enrollmentCounts.get(c.id) || 0
      }))

      // Calculate stats
      const totalStudents = enrichedClassrooms.reduce((sum, c) => sum + c.enrolled_count, 0)
      const activeClassrooms = enrichedClassrooms.filter(c => c.enrolled_count > 0).length

      setClassrooms(enrichedClassrooms)
      setStats({
        totalClassrooms: enrichedClassrooms.length,
        totalStudents,
        activeClassrooms,
        totalEarnings
      })

      // Update enrolled_count in database if different
      for (const classroom of enrichedClassrooms) {
        const dbClassroom = classroomsData.find(c => c.id === classroom.id)
        if (dbClassroom && dbClassroom.enrolled_count !== classroom.enrolled_count) {
          await supabase
            .from('classrooms')
            .update({ enrolled_count: classroom.enrolled_count })
            .eq('id', classroom.id)
        }
      }

    } catch (error) {
      console.error('Error:', error)
    }

    setLoading(false)
  }

  const getSubjectStyle = (subject: string) => {
    const styles: Record<string, { bg: string, text: string, icon: string }> = {
      'Mathématiques': { bg: '#dbeafe', text: '#2563eb', icon: '📐' },
      'Physique': { bg: '#fef3c7', text: '#d97706', icon: '⚡' },
      'Chimie': { bg: '#fce7f3', text: '#db2777', icon: '🧪' },
      'Français': { bg: '#f3e8ff', text: '#9333ea', icon: '📝' },
      'Anglais': { bg: '#e0e7ff', text: '#4f46e5', icon: '🌍' },
      'Histoire-Géo': { bg: '#ffedd5', text: '#ea580c', icon: '🗺️' },
      'SVT': { bg: '#d1fae5', text: '#059669', icon: '🌱' },
      'Informatique': { bg: '#cffafe', text: '#0891b2', icon: '💻' },
    }
    return styles[subject] || { bg: '#f3f4f6', text: '#6b7280', icon: '📚' }
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
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Mes Classes</h1>
          <p style={{ color: '#617589' }}>Gérez vos classes et suivez vos inscriptions</p>
        </div>
        <Link
          href="/teacher/classes/create"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#2b8cee',
            color: 'white',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          + Créer une classe
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📚</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stats.totalClassrooms}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Classes créées</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👥</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stats.totalStudents}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Élèves inscrits</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📊</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stats.activeClassrooms}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Classes actives</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💰</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.totalEarnings}€</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Revenus totaux</p>
            </div>
          </div>
        </div>
      </div>

      {/* Classrooms Grid */}
      {classrooms.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Aucune classe</h3>
          <p style={{ color: '#617589', marginBottom: '24px' }}>Créez votre première classe pour commencer à enseigner.</p>
          <Link
            href="/teacher/classes/create"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              backgroundColor: '#2b8cee',
              color: 'white',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            + Créer une classe
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {classrooms.map((classroom) => {
            const style = getSubjectStyle(classroom.subject)
            return (
              <div
                key={classroom.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: '1px solid #dbe0e6',
                  overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      backgroundColor: style.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px'
                    }}>
                      {style.icon}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 'bold', color: '#111418', fontSize: '18px', marginBottom: '4px' }}>{classroom.title}</h3>
                      <p style={{ color: '#617589', fontSize: '14px' }}>{classroom.subject} • {classroom.level}</p>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: classroom.is_free ? '#d1fae5' : '#dbeafe',
                    color: classroom.is_free ? '#16a34a' : '#2563eb'
                  }}>
                    {classroom.is_free ? 'Gratuit' : `${classroom.price}€`}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ padding: '0 20px 20px', display: 'flex', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>👥</span>
                    <span style={{ color: '#111418', fontWeight: '600' }}>{classroom.enrolled_count}</span>
                    <span style={{ color: '#617589', fontSize: '13px' }}>élèves</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{classroom.is_public ? '🌐' : '🔒'}</span>
                    <span style={{ color: '#617589', fontSize: '13px' }}>{classroom.is_public ? 'Public' : 'Privé'}</span>
                  </div>
                  {!classroom.is_free && classroom.enrolled_count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px' }}>💰</span>
                      <span style={{ color: '#16a34a', fontWeight: '600' }}>{classroom.enrolled_count * classroom.price}€</span>
                      <span style={{ color: '#617589', fontSize: '13px' }}>revenus</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Créée le {new Date(classroom.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  <Link
                    href={`/teacher/classrooms/${classroom.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#2b8cee',
                      fontWeight: '600',
                      fontSize: '14px',
                      textDecoration: 'none'
                    }}
                  >
                    Gérer →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}