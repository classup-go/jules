'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Classroom {
  id: string
  title: string
  subject: string
  level: string
  description: string
  price: number
  is_free: boolean
  created_at: string
  chapters_count: number
  lessons_count: number
  students_count: number
}

export default function TeacherCoursesPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

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

      if (classroomsData && classroomsData.length > 0) {
        // Get chapters count per classroom (via courses)
        const classroomIds = classroomsData.map(c => c.id)

        // First get courses for these classrooms
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, classroom_id')
          .in('classroom_id', classroomIds)

        const courseIds = coursesData?.map(c => c.id) || []
        const courseToClassroom = new Map<string, string>()
        coursesData?.forEach(c => {
          courseToClassroom.set(c.id, c.classroom_id)
        })

        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id, course_id')
          .in('course_id', courseIds)

        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('id, chapter_id')

        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('id, classroom_id')
          .in('classroom_id', classroomIds)

        // Count chapters per classroom (mapping via course_id → classroom_id)
        const chaptersCount = new Map<string, number>()
        chaptersData?.forEach(ch => {
          const classroomId = courseToClassroom.get(ch.course_id)
          if (classroomId) {
            chaptersCount.set(classroomId, (chaptersCount.get(classroomId) || 0) + 1)
          }
        })

        // Count lessons per classroom (via chapters)
        const chapterIds = chaptersData?.map(ch => ch.id) || []
        const lessonsPerChapter = new Map<string, number>()
        lessonsData?.forEach(l => {
          if (chapterIds.includes(l.chapter_id)) {
            lessonsPerChapter.set(l.chapter_id, (lessonsPerChapter.get(l.chapter_id) || 0) + 1)
          }
        })

        const lessonsCount = new Map<string, number>()
        chaptersData?.forEach(ch => {
          const count = lessonsPerChapter.get(ch.id) || 0
          const classroomId = courseToClassroom.get(ch.course_id)
          if (classroomId) {
            lessonsCount.set(classroomId, (lessonsCount.get(classroomId) || 0) + count)
          }
        })

        // Count students per classroom
        const studentsCount = new Map<string, number>()
        enrollmentsData?.forEach(e => {
          studentsCount.set(e.classroom_id, (studentsCount.get(e.classroom_id) || 0) + 1)
        })

        const enrichedClassrooms = classroomsData.map(c => ({
          ...c,
          chapters_count: chaptersCount.get(c.id) || 0,
          lessons_count: lessonsCount.get(c.id) || 0,
          students_count: studentsCount.get(c.id) || 0,
        }))

        setClassrooms(enrichedClassrooms)
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

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'pdf': '📄 PDF',
      'video': '🎥 Vidéo',
      'qcm': '✅ QCM',
      'text': '📝 Texte',
    }
    return types[type] || '📚 Contenu'
  }

  // Stats
  const totalChapters = classrooms.reduce((sum, c) => sum + c.chapters_count, 0)
  const totalLessons = classrooms.reduce((sum, c) => sum + c.lessons_count, 0)
  const totalStudents = classrooms.reduce((sum, c) => sum + c.students_count, 0)

  // Filter
  const subjects = [...new Set(classrooms.map(c => c.subject))]
  const filteredClassrooms = filter === 'all' 
    ? classrooms 
    : classrooms.filter(c => c.subject === filter)

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
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Mes Cours</h1>
          <p style={{ color: '#617589' }}>Gérez vos contenus pédagogiques (PDF, vidéos, QCM)</p>
        </div>
        <Link 
          href="/teacher/classrooms/new"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}
        >
          + Ajouter un cours
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { icon: '📚', label: 'Total cours', value: classrooms.length, bg: '#dbeafe' },
          { icon: '📄', label: 'Chapitres', value: totalChapters, bg: '#d1fae5' },
          { icon: '✅', label: 'Leçons', value: totalLessons, bg: '#fef3c7' },
          { icon: '🎥', label: 'Élèves inscrits', value: totalStudents, bg: '#f3e8ff' },
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stat.value}</p>
                <p style={{ fontSize: '13px', color: '#617589' }}>{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: filter === 'all' ? 'none' : '1px solid #dbe0e6',
            backgroundColor: filter === 'all' ? '#2b8cee' : 'white',
            color: filter === 'all' ? 'white' : '#617589',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          📚 Tous
        </button>
        {subjects.map(subject => {
          const style = getSubjectStyle(subject)
          return (
            <button
              key={subject}
              onClick={() => setFilter(subject)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: filter === subject ? 'none' : '1px solid #dbe0e6',
                backgroundColor: filter === subject ? '#2b8cee' : 'white',
                color: filter === subject ? 'white' : '#617589',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {style.icon} {subject}
            </button>
          )
        })}
      </div>

      {/* Courses List */}
      {filteredClassrooms.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Aucun cours créé</h3>
          <p style={{ color: '#617589', marginBottom: '24px' }}>Ajoutez votre premier contenu pédagogique</p>
          <Link 
            href="/teacher/classrooms/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}
          >
            + Créer un cours
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {filteredClassrooms.map((classroom) => {
            const style = getSubjectStyle(classroom.subject)
            return (
              <div
                key={classroom.id}
                style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}
              >
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                        {style.icon}
                      </div>
                      <div>
                        <h3 style={{ fontWeight: '600', color: '#111418', fontSize: '16px', marginBottom: '4px' }}>{classroom.title}</h3>
                        <p style={{ fontSize: '13px', color: '#617589' }}>{classroom.subject} • {classroom.level}</p>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: (classroom.is_free || classroom.price === 0) ? '#d1fae5' : '#dbeafe',
                      color: (classroom.is_free || classroom.price === 0) ? '#059669' : '#2563eb',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {(classroom.is_free || classroom.price === 0) ? 'Gratuit' : `${classroom.price}€`}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ padding: '16px 20px', display: 'flex', gap: '24px', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>{classroom.chapters_count}</p>
                    <p style={{ fontSize: '12px', color: '#617589' }}>Chapitres</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>{classroom.lessons_count}</p>
                    <p style={{ fontSize: '12px', color: '#617589' }}>Leçons</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>{classroom.students_count}</p>
                    <p style={{ fontSize: '12px', color: '#617589' }}>Élèves</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 20px', display: 'flex', gap: '12px' }}>
                  <Link
                    href={`/teacher/classrooms/${classroom.id}`}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Gérer le contenu
                  </Link>
                  <Link
                    href={`/classroom/${classroom.id}`}
                    style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#617589', border: 'none', borderRadius: '8px', fontWeight: '500', fontSize: '14px', textDecoration: 'none' }}
                  >
                    👁️ Aperçu
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