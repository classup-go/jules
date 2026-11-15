'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Enrollment {
  id: string
  created_at: string
  classroom: {
    id: string
    title: string
    subject: string
    level: string
    teacher_name?: string
  }
  progress: number
  completedLessons: number
  totalLessons: number
}

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({ totalLessons: 0, completedLessons: 0, totalHours: 0 })

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
      // Get enrollments with course_id
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)

      if (!enrollmentsData || enrollmentsData.length === 0) {
        setLoading(false)
        return
      }

      // Get unique course_ids and classroom_ids
      const courseIds = [...new Set(enrollmentsData.map(e => e.course_id).filter(Boolean))]
      const classroomIds = [...new Set(enrollmentsData.map(e => e.classroom_id).filter(Boolean))]

      // Get classrooms
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .in('id', classroomIds)

      if (!classroomsData) {
        setLoading(false)
        return
      }

      // Get teachers
      const teacherIds = [...new Set(classroomsData.map(c => c.teacher_id).filter(Boolean))]
      let teacherMap = new Map()
      if (teacherIds.length > 0) {
        const { data: teachersData } = await supabase
          .from('users')
          .select('id, display_name')
          .in('id', teacherIds)
        if (teachersData) {
          teacherMap = new Map(teachersData.map(t => [t.id, t.display_name]))
        }
      }

      // Get all chapters for enrolled courses (using course_id)
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id, course_id')
        .in('course_id', courseIds)

      const chapterIds = chaptersData?.map(c => c.id) || []

      // Get all lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, chapter_id, duration_minutes')
        .in('chapter_id', chapterIds)

      // Get completed lessons
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('lesson_id, status')
        .eq('student_id', user.id)
        .eq('status', 'completed')

      const completedLessonIds = new Set(progressData?.map(p => p.lesson_id) || [])

      // Map chapters to courses
      const chapterToCourse = new Map(chaptersData?.map(c => [c.id, c.course_id]) || [])

      // Count lessons per course
      const lessonsPerCourse = new Map<string, { total: number, completed: number, duration: number }>()

      lessonsData?.forEach(lesson => {
        const courseId = chapterToCourse.get(lesson.chapter_id)
        if (courseId) {
          if (!lessonsPerCourse.has(courseId)) {
            lessonsPerCourse.set(courseId, { total: 0, completed: 0, duration: 0 })
          }
          const data = lessonsPerCourse.get(courseId)!
          data.total++
          data.duration += lesson.duration_minutes || 0
          if (completedLessonIds.has(lesson.id)) {
            data.completed++
          }
        }
      })

      // Build enrollments with progress
      const enrichedEnrollments: Enrollment[] = enrollmentsData.map(e => {
        const classroom = classroomsData.find(c => c.id === e.classroom_id)
        const lessonData = lessonsPerCourse.get(e.course_id) || { total: 0, completed: 0, duration: 0 }
        const progress = lessonData.total > 0 ? Math.round((lessonData.completed / lessonData.total) * 100) : 0

        return {
          id: e.id,
          created_at: e.created_at,
          classroom: {
            id: classroom?.id || '',
            title: classroom?.title || '',
            subject: classroom?.subject || '',
            level: classroom?.level || '',
            teacher_name: teacherMap.get(classroom?.teacher_id) || 'Professeur'
          },
          progress,
          completedLessons: lessonData.completed,
          totalLessons: lessonData.total
        }
      }).filter(e => e.classroom.id)

      // Calculate total stats
      let totalLessons = 0
      let completedLessons = 0
      let totalMinutes = 0

      lessonsPerCourse.forEach(data => {
        totalLessons += data.total
        completedLessons += data.completed
        totalMinutes += data.duration
      })

      setStats({
        totalLessons,
        completedLessons,
        totalHours: Math.round(totalMinutes / 60)
      })

      setEnrollments(enrichedEnrollments)
    } catch (error) {
      console.error('Error:', error)
    }

    setLoading(false)
  }

  const getSubjectStyle = (subject: string) => {
    const styles: { [key: string]: { bg: string, text: string, icon: string } } = {
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

  const subjects = [...new Set(enrollments.map(e => e.classroom.subject))]
  const filteredEnrollments = filter === 'all' ? enrollments : enrollments.filter(e => e.classroom.subject === filter)

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
          <p style={{ color: '#617589' }}>Gérez vos inscriptions et suivez votre progression</p>
        </div>
        <Link href="/search" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
          + Découvrir des cours
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📚</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{enrollments.length}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Cours actifs</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>✅</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stats.completedLessons}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Leçons terminées</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⏱️</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{stats.totalHours}h</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Temps total</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏆</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{enrollments.filter(e => e.progress === 100).length}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Cours terminés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '8px 16px', borderRadius: '20px', border: filter === 'all' ? 'none' : '1px solid #dbe0e6', backgroundColor: filter === 'all' ? '#2b8cee' : 'white', color: filter === 'all' ? 'white' : '#617589', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>
          Tous
        </button>
        {subjects.map(subject => (
          <button key={subject} onClick={() => setFilter(subject)} style={{ padding: '8px 16px', borderRadius: '20px', border: filter === subject ? 'none' : '1px solid #dbe0e6', backgroundColor: filter === subject ? '#2b8cee' : 'white', color: filter === subject ? 'white' : '#617589', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>
            {subject}
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      {filteredEnrollments.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Aucun cours pour le moment</h3>
          <p style={{ color: '#617589', marginBottom: '24px' }}>Explorez notre catalogue et inscrivez-vous à votre premier cours.</p>
          <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 24px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>
            Découvrir les cours →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {filteredEnrollments.map((enrollment) => {
            const style = getSubjectStyle(enrollment.classroom.subject)
            return (
              <Link key={enrollment.id} href={`/learn/${enrollment.classroom.id}`} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden', textDecoration: 'none' }}>
                {/* Header */}
                <div style={{ height: '100px', background: `linear-gradient(135deg, ${style.text}, ${style.text}dd)`, padding: '20px', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      {style.icon}
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>{enrollment.classroom.subject}</p>
                      <p style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>{enrollment.classroom.title}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#617589', marginBottom: '16px' }}>
                    Par {enrollment.classroom.teacher_name}
                  </p>

                  {/* Progress */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#617589' }}>{enrollment.completedLessons}/{enrollment.totalLessons} leçons</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: enrollment.progress === 100 ? '#16a34a' : '#111418' }}>{enrollment.progress}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px' }}>
                      <div style={{ width: `${enrollment.progress}%`, height: '100%', backgroundColor: enrollment.progress === 100 ? '#16a34a' : '#2b8cee', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                    </div>
                  </div>

                  <span style={{ display: 'block', width: '100%', padding: '10px', backgroundColor: enrollment.progress === 100 ? '#16a34a' : '#2b8cee', color: 'white', borderRadius: '8px', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                    {enrollment.progress === 100 ? '✅ Terminé' : 'Continuer →'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}