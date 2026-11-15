'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CourseProgress {
  id: string
  classroom_id: string
  title: string
  subject: string
  teacher_name: string
  progress: number
  completedLessons: number
  totalLessons: number
  lastAccessedAt?: string
}

interface Activity {
  id: string
  type: 'lesson_completed' | 'qcm_passed' | 'qcm_failed' | 'enrollment' | 'chapter_unlocked'
  title: string
  description: string
  date: string
  icon: string
  color: string
}

interface UpcomingSession {
  id: string
  title: string
  classroom_title: string
  teacher_name: string
  scheduled_at: string
  duration_minutes: number
}

interface Assignment {
  id: string
  title: string
  due_date: string
  max_points: number
  classroom_id: string
  classroom: {
    title: string
  }
  submissions: any[]
}

interface Stats {
  totalCourses: number
  completedCourses: number
  totalLessons: number
  completedLessons: number
  totalQcm: number
  passedQcm: number
  studyHours: number
  currentStreak: number
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [courses, setCourses] = useState<CourseProgress[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    completedCourses: 0,
    totalLessons: 0,
    completedLessons: 0,
    totalQcm: 0,
    passedQcm: 0,
    studyHours: 0,
    currentStreak: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      setLoading(false)
      return
    }

    // Get user info
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single()

    setUser(userData)

    try {
      // Get enrollments
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', currentUser.id)
        .order('created_at', { ascending: false })

      // Redirect to home if no courses enrolled
      if (!enrollmentsData || enrollmentsData.length === 0) {
        router.push('/student/home')
        return
      }

      const classroomIds = [...new Set(enrollmentsData.map(e => e.classroom_id).filter(Boolean))]
      const courseIds = [...new Set(enrollmentsData.map(e => e.course_id).filter(Boolean))]

      // Get classrooms
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .in('id', classroomIds)

      // Get courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, classroom_id')
        .in('id', courseIds)

      // Create map from course_id to classroom_id
      const courseToClassroom = new Map(coursesData?.map(c => [c.id, c.classroom_id]) || [])

      // Get teachers
      const teacherIds = [...new Set(classroomsData?.map(c => c.teacher_id).filter(Boolean) || [])]
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

      // Get chapters using course_id
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id, course_id')
        .in('course_id', courseIds)

      const chapterIds = chaptersData?.map(c => c.id) || []
      // Map chapters to classrooms via courses
      const chapterToClassroom = new Map(
        chaptersData?.map(c => {
          const classroomId = courseToClassroom.get(c.course_id)
          return [c.id, classroomId]
        }).filter(([_, classroomId]) => classroomId !== undefined) || []
      )

      // Get lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, chapter_id, duration_minutes, type')
        .in('chapter_id', chapterIds)

      // Get student progress
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', currentUser.id)

      const completedLessonIds = new Set(
        progressData?.filter(p => p.status === 'completed').map(p => p.lesson_id) || []
      )

      // Get QCM attempts
      const { data: qcmAttemptsData } = await supabase
        .from('qcm_attempts')
        .select('*')
        .eq('student_id', currentUser.id)
        .order('completed_at', { ascending: false })

      // Get upcoming live sessions
      const { data: sessionsData } = await supabase
        .from('live_sessions')
        .select('*')
        .in('classroom_id', classroomIds)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5)

      // Calculate lessons per classroom
      const lessonsPerClassroom = new Map<string, { total: number, completed: number, duration: number, qcmCount: number }>()
      
      lessonsData?.forEach(lesson => {
        const classroomId = chapterToClassroom.get(lesson.chapter_id)
        if (classroomId) {
          if (!lessonsPerClassroom.has(classroomId)) {
            lessonsPerClassroom.set(classroomId, { total: 0, completed: 0, duration: 0, qcmCount: 0 })
          }
          const data = lessonsPerClassroom.get(classroomId)!
          data.total++
          data.duration += lesson.duration_minutes || 0
          if (lesson.type === 'qcm') data.qcmCount++
          if (completedLessonIds.has(lesson.id)) {
            data.completed++
          }
        }
      })

      // Build course progress
      const coursesProgress: CourseProgress[] = classroomsData?.map(classroom => {
        const lessonData = lessonsPerClassroom.get(classroom.id) || { total: 0, completed: 0, duration: 0 }
        const progress = lessonData.total > 0 ? Math.round((lessonData.completed / lessonData.total) * 100) : 0
        const enrollment = enrollmentsData.find(e => e.classroom_id === classroom.id)

        return {
          id: enrollment?.id || classroom.id,
          classroom_id: classroom.id,
          title: classroom.title,
          subject: classroom.subject,
          teacher_name: teacherMap.get(classroom.teacher_id) || 'Professeur',
          progress,
          completedLessons: lessonData.completed,
          totalLessons: lessonData.total,
          lastAccessedAt: enrollment?.updated_at
        }
      }).sort((a, b) => {
        // Sort by progress (in progress first, then not started, then completed)
        if (a.progress > 0 && a.progress < 100 && (b.progress === 0 || b.progress === 100)) return -1
        if (b.progress > 0 && b.progress < 100 && (a.progress === 0 || a.progress === 100)) return 1
        return b.progress - a.progress
      }) || []

      setCourses(coursesProgress)

      // Calculate stats
      let totalLessons = 0
      let completedLessons = 0
      let totalDuration = 0
      let totalQcm = 0

      lessonsPerClassroom.forEach(data => {
        totalLessons += data.total
        completedLessons += data.completed
        totalDuration += data.duration
        totalQcm += data.qcmCount
      })

      const passedQcm = qcmAttemptsData?.filter(a => a.passed).length || 0
      const completedCourses = coursesProgress.filter(c => c.progress === 100).length

      setStats({
        totalCourses: coursesProgress.length,
        completedCourses,
        totalLessons,
        completedLessons,
        totalQcm,
        passedQcm,
        studyHours: Math.round(totalDuration / 60),
        currentStreak: 7 // TODO: Calculate real streak
      })

      // Build activities
      const allActivities: Activity[] = []

      // Add completed lessons
      progressData?.filter(p => p.status === 'completed').slice(0, 5).forEach(p => {
        const lesson = lessonsData?.find(l => l.id === p.lesson_id)
        allActivities.push({
          id: `lesson-${p.id}`,
          type: 'lesson_completed',
          title: 'Leçon terminée',
          description: lesson ? `${lesson.type === 'video' ? '🎥' : '📄'} Leçon complétée` : 'Leçon complétée',
          date: p.completed_at || p.created_at,
          icon: '✅',
          color: '#16a34a'
        })
      })

      // Add QCM attempts
      qcmAttemptsData?.slice(0, 5).forEach(a => {
        allActivities.push({
          id: `qcm-${a.id}`,
          type: a.passed ? 'qcm_passed' : 'qcm_failed',
          title: a.passed ? 'QCM réussi' : 'QCM échoué',
          description: `Score: ${a.percentage}%`,
          date: a.completed_at,
          icon: a.passed ? '🎯' : '❌',
          color: a.passed ? '#16a34a' : '#dc2626'
        })
      })

      // Add enrollments
      enrollmentsData.slice(0, 3).forEach(e => {
        const classroom = classroomsData?.find(c => c.id === e.classroom_id)
        allActivities.push({
          id: `enrollment-${e.id}`,
          type: 'enrollment',
          title: 'Inscription',
          description: classroom?.title || 'Nouveau cours',
          date: e.created_at,
          icon: '📚',
          color: '#2563eb'
        })
      })

      // Sort by date
      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setActivities(allActivities.slice(0, 8))

      // Build upcoming sessions
      const sessions: UpcomingSession[] = sessionsData?.map(s => {
        const classroom = classroomsData?.find(c => c.id === s.classroom_id)
        return {
          id: s.id,
          title: s.title,
          classroom_title: classroom?.title || '',
          teacher_name: teacherMap.get(s.teacher_id) || 'Professeur',
          scheduled_at: s.scheduled_at,
          duration_minutes: s.duration_minutes
        }
      }) || []

      setUpcomingSessions(sessions)

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*, classroom:classrooms(title), submissions!left(id, status, grade, student_id)')
        .in('classroom_id', classroomIds)
        .eq('status', 'published')
        .gte('due_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days or future
        .order('due_date', { ascending: true })
        .limit(10)

      if (assignmentsData) {
        // Filter assignments and add student submissions
        const enrichedAssignments = assignmentsData.map((assignment: any) => ({
          ...assignment,
          submissions: assignment.submissions?.filter((s: any) => s.student_id === currentUser.id) || []
        }))
        setAssignments(enrichedAssignments)
      }

    } catch (error) {
      console.error('Error:', error)
    }

    setLoading(false)
  }

  const getSubjectStyle = (subject: string) => {
    const styles: Record<string, { bg: string, text: string, icon: string, gradient: string }> = {
      'Mathématiques': { bg: '#dbeafe', text: '#2563eb', icon: '📐', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
      'Physique': { bg: '#fef3c7', text: '#d97706', icon: '⚡', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      'Chimie': { bg: '#fce7f3', text: '#db2777', icon: '🧪', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
      'Français': { bg: '#f3e8ff', text: '#9333ea', icon: '📝', gradient: 'linear-gradient(135deg, #a855f7, #9333ea)' },
      'Anglais': { bg: '#e0e7ff', text: '#4f46e5', icon: '🌍', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
      'Histoire-Géo': { bg: '#ffedd5', text: '#ea580c', icon: '🗺️', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
      'SVT': { bg: '#d1fae5', text: '#059669', icon: '🌱', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
      'Informatique': { bg: '#cffafe', text: '#0891b2', icon: '💻', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    }
    return styles[subject] || { bg: '#f3f4f6', text: '#6b7280', icon: '📚', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Demain à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  const overallProgress = stats.totalLessons > 0 ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0

  return (
    <>
      <style>{`
        .welcome-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 24px;
        }
        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .welcome-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Welcome Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #2b8cee 0%, #1d4ed8 50%, #7c3aed 100%)', 
        borderRadius: '24px', 
        padding: '32px', 
        marginBottom: '32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-50px', left: '30%', width: '200px', height: '200px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ opacity: 0.9, marginBottom: '4px', fontSize: '14px' }}>{getGreeting()} 👋</p>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>{user?.display_name || 'Élève'}</h1>
              <p style={{ opacity: 0.8, fontSize: '15px' }}>Continuez votre apprentissage et atteignez vos objectifs !</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{overallProgress}%</div>
              <p style={{ opacity: 0.8, fontSize: '14px' }}>Progression globale</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="welcome-stats-grid">
            {[
              { label: 'Cours', value: stats.totalCourses, icon: '📚' },
              { label: 'Leçons terminées', value: `${stats.completedLessons}/${stats.totalLessons}`, icon: '✅' },
              { label: 'QCM réussis', value: `${stats.passedQcm}/${stats.totalQcm}`, icon: '🎯' },
              { label: 'Heures d\'étude', value: `${stats.studyHours}h`, icon: '⏱️' },
            ].map((stat, i) => (
              <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span>{stat.icon}</span>
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>{stat.label}</span>
                </div>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-main-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Continue Learning */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>📖 Continuer l'apprentissage</h2>
              <Link href="/student/my-courses" style={{ color: '#2b8cee', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
                Voir tout →
              </Link>
            </div>

            {courses.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                <p style={{ color: '#617589', marginBottom: '16px' }}>Vous n'êtes inscrit à aucun cours</p>
                <Link href="/search" style={{ color: '#2b8cee', fontWeight: '600', textDecoration: 'none' }}>
                  Découvrir les cours →
                </Link>
              </div>
            ) : (
              <div style={{ padding: '16px' }}>
                {courses.slice(0, 3).map((course) => {
                  const style = getSubjectStyle(course.subject)
                  return (
                    <Link
                      key={course.id}
                      href={`/learn/${course.classroom_id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        marginBottom: '8px',
                        transition: 'background-color 0.2s',
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '12px', 
                        background: style.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        {style.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', color: '#111418', marginBottom: '4px' }}>{course.title}</p>
                        <p style={{ fontSize: '13px', color: '#617589' }}>{course.teacher_name} • {course.completedLessons}/{course.totalLessons} leçons</p>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                            <div style={{ width: `${course.progress}%`, height: '100%', backgroundColor: course.progress === 100 ? '#16a34a' : '#2b8cee', borderRadius: '3px' }}></div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: course.progress === 100 ? '#16a34a' : '#111418' }}>{course.progress}%</span>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '8px 16px', 
                        backgroundColor: course.progress === 100 ? '#d1fae5' : '#2b8cee', 
                        color: course.progress === 100 ? '#16a34a' : 'white', 
                        borderRadius: '8px', 
                        fontWeight: '600', 
                        fontSize: '13px' 
                      }}>
                        {course.progress === 100 ? '✅ Terminé' : 'Continuer'}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Assignments Section */}
          {assignments.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>📝 Devoirs à rendre</h2>
                <Link href={`/student/assignments?classroom=${assignments[0]?.classroom_id || ''}`} style={{ color: '#2b8cee', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
                  Voir tout →
                </Link>
              </div>
              <div style={{ padding: '16px' }}>
                {assignments.slice(0, 3).map((assignment) => {
                  const submission = assignment.submissions[0]
                  const dueDate = new Date(assignment.due_date)
                  const now = new Date()
                  const isLate = now > dueDate
                  const dueIn = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgent = dueIn <= 1 && dueIn >= 0

                  return (
                    <Link
                      key={assignment.id}
                      href={submission ? `/student/submissions/${submission.id}` : `/student/assignments/${assignment.id}/submit?classroom=${assignment.classroom_id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        backgroundColor: submission ? (submission.status === 'graded' ? '#f0fdf4' : '#f9fafb') : (isUrgent ? '#fef3c7' : '#f9fafb'),
                        border: `1px solid ${submission ? (submission.status === 'graded' ? '#bbf7d0' : '#e5e7eb') : (isUrgent ? '#fde68a' : '#e5e7eb')}`,
                        borderRadius: '12px',
                        textDecoration: 'none',
                        marginBottom: '8px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <p style={{ fontWeight: '600', color: '#111418', fontSize: '14px' }}>
                            {assignment.title}
                          </p>
                          {submission?.status === 'graded' && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: submission.grade >= assignment.max_points * 0.6 ? '#d1fae5' : '#fee2e2',
                              color: submission.grade >= assignment.max_points * 0.6 ? '#16a34a' : '#dc2626'
                            }}>
                              {submission.grade}/{assignment.max_points}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: '#617589' }}>
                          {assignment.classroom.title}
                        </p>
                        <p style={{
                          fontSize: '12px',
                          color: isLate ? '#dc2626' : isUrgent ? '#ea580c' : '#617589',
                          marginTop: '4px',
                          fontWeight: isUrgent || isLate ? '600' : 'normal'
                        }}>
                          {submission ? (
                            submission.status === 'graded' ? '✅ Noté' : '📤 Soumis'
                          ) : isLate ? (
                            '⚠️ En retard'
                          ) : isUrgent ? (
                            `⏰ À rendre ${dueIn === 0 ? "aujourd'hui" : 'demain'}`
                          ) : (
                            `📅 ${dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                          )}
                        </p>
                      </div>
                      <div style={{
                        padding: '8px 16px',
                        backgroundColor: submission ? (submission.status === 'graded' ? '#16a34a' : '#6b7280') : (isUrgent ? '#ea580c' : '#2b8cee'),
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        whiteSpace: 'nowrap'
                      }}>
                        {submission ? (submission.status === 'graded' ? 'Voir' : 'En attente') : 'Soumettre'}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>🎥 Prochaines sessions live</h2>
                <Link href="/student/sessions" style={{ color: '#2b8cee', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
                  Voir toutes mes sessions →
                </Link>
              </div>
              <div style={{ padding: '16px' }}>
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        🔴
                      </div>
                      <div>
                        <p style={{ fontWeight: '600', color: '#111418' }}>{session.title}</p>
                        <p style={{ fontSize: '13px', color: '#617589' }}>{session.classroom_title} • {session.duration_minutes} min</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111418' }}>{formatSessionDate(session.scheduled_at)}</p>
                      <button
                        onClick={() => router.push(`/session/${session.id}`)}
                        style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Rejoindre
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Activity Feed */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>⚡ Activité récente</h2>
            </div>

            {activities.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ color: '#617589' }}>Aucune activité récente</p>
              </div>
            ) : (
              <div style={{ padding: '16px' }}>
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 0',
                      borderBottom: index < activities.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}
                  >
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '10px', 
                      backgroundColor: `${activity.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      flexShrink: 0
                    }}>
                      {activity.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '500', color: '#111418', fontSize: '14px' }}>{activity.title}</p>
                      <p style={{ fontSize: '13px', color: '#617589' }}>{activity.description}</p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{formatDate(activity.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418', marginBottom: '16px' }}>🚀 Accès rapide</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { href: '/search', icon: '🔍', label: 'Rechercher des cours', color: '#2563eb' },
                { href: '/student/my-courses', icon: '📚', label: 'Mes cours', color: '#16a34a' },
                { href: `/student/assignments?classroom=${courses[0]?.classroom_id || ''}`, icon: '📝', label: 'Mes devoirs', color: '#ea580c' },
                { href: '/student/schedule', icon: '📅', label: 'Emploi du temps', color: '#d97706' },
                { href: '/messages', icon: '💬', label: 'Messages', color: '#7c3aed' },
                { href: '/student/history', icon: '📊', label: 'Historique', color: '#0891b2' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{action.icon}</span>
                  <span style={{ fontWeight: '500', color: '#111418', flex: 1 }}>{action.label}</span>
                  <span style={{ color: '#9ca3af' }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Motivation Card */}
          <div style={{ 
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)', 
            borderRadius: '20px', 
            padding: '24px',
            border: '1px solid #fcd34d'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔥</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
              Continuez comme ça !
            </h3>
            <p style={{ fontSize: '14px', color: '#a16207' }}>
              Vous avez complété {stats.completedLessons} leçons. Encore {stats.totalLessons - stats.completedLessons} pour tout terminer !
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}