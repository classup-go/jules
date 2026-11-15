'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  status: string
  classroom: {
    id: string
    title: string
    subject: string
  }
  teacher: {
    id: string
    display_name: string
  }
}

export default function SchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [view, setView] = useState<'week' | 'list'>('week')

  useEffect(() => {
    fetchSessions()
  }, [currentWeek])

  const fetchSessions = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('classroom_id')
        .eq('student_id', user.id)

      if (!enrollments || enrollments.length === 0) {
        setLoading(false)
        return
      }

      const classroomIds = enrollments.map(e => e.classroom_id)
      const startOfWeek = getStartOfWeek(currentWeek)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 7)

      const { data: sessionsData } = await supabase
        .from('live_sessions')
        .select('*')
        .in('classroom_id', classroomIds)
        .gte('scheduled_at', startOfWeek.toISOString())
        .lte('scheduled_at', endOfWeek.toISOString())
        .order('scheduled_at', { ascending: true })

      if (sessionsData && sessionsData.length > 0) {
        const { data: classroomsData } = await supabase
          .from('classrooms')
          .select('id, title, subject, teacher_id')
          .in('id', classroomIds)

        const teacherIds = [...new Set(classroomsData?.map(c => c.teacher_id) || [])]
        
        let teacherMap = new Map()
        if (teacherIds.length > 0) {
          const { data: teachersData } = await supabase
            .from('users')
            .select('id, display_name')
            .in('id', teacherIds)
          teacherMap = new Map(teachersData?.map(t => [t.id, t]) || [])
        }

        const classroomMap = new Map(classroomsData?.map(c => [c.id, {
          ...c,
          teacher: teacherMap.get(c.teacher_id) || { display_name: 'Professeur' }
        }]) || [])

        const enrichedSessions = sessionsData.map(s => ({
          ...s,
          classroom: classroomMap.get(s.classroom_id) || { title: 'Cours', subject: '' },
          teacher: classroomMap.get(s.classroom_id)?.teacher || { display_name: 'Professeur' }
        }))

        setSessions(enrichedSessions)
      }
    } catch (error) {
      console.error('Error:', error)
    }

    setLoading(false)
  }

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getWeekDays = () => {
    const start = getStartOfWeek(currentWeek)
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(day.getDate() + i)
      days.push(day)
    }
    return days
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(s => {
      const sessionDate = new Date(s.scheduled_at)
      return sessionDate.toDateString() === date.toDateString()
    })
  }

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + (direction * 7))
    setCurrentWeek(newDate)
  }

  const goToToday = () => setCurrentWeek(new Date())

  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      'Mathématiques': '#3b82f6', 'Physique': '#f59e0b', 'Chimie': '#ec4899',
      'Français': '#a855f7', 'Anglais': '#6366f1', 'Histoire-Géo': '#f97316',
      'SVT': '#10b981', 'Informatique': '#06b6d4',
    }
    return colors[subject] || '#6b7280'
  }

  const weekDays = getWeekDays()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Emploi du temps</h1>
          <p style={{ color: '#617589' }}>Vos sessions et cours à venir</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['week', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '8px 16px', borderRadius: '8px',
              border: view === v ? 'none' : '1px solid #dbe0e6',
              backgroundColor: view === v ? '#2b8cee' : 'white',
              color: view === v ? 'white' : '#617589', fontWeight: '500', cursor: 'pointer',
            }}>
              {v === 'week' ? 'Semaine' : 'Liste'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigateWeek(-1)} style={{ padding: '8px 16px', border: '1px solid #dbe0e6', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}>
          ← Précédente
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', textTransform: 'capitalize' }}>{formatMonth(currentWeek)}</h2>
          <button onClick={goToToday} style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#617589', fontSize: '13px', cursor: 'pointer' }}>Aujourd'hui</button>
        </div>
        <button onClick={() => navigateWeek(1)} style={{ padding: '8px 16px', border: '1px solid #dbe0e6', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}>
          Suivante →
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #dbe0e6' }}>
          {weekDays.map((day, i) => (
            <div key={i} style={{ padding: '16px', textAlign: 'center', backgroundColor: isToday(day) ? 'rgba(43, 140, 238, 0.05)' : 'transparent', borderRight: i < 6 ? '1px solid #f3f4f6' : 'none' }}>
              <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px', textTransform: 'uppercase' }}>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: isToday(day) ? 'white' : '#111418', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', backgroundColor: isToday(day) ? '#2b8cee' : 'transparent' }}>{day.getDate()}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: '300px' }}>
          {weekDays.map((day, i) => {
            const daySessions = getSessionsForDay(day)
            return (
              <div key={i} style={{ padding: '12px', borderRight: i < 6 ? '1px solid #f3f4f6' : 'none', backgroundColor: isToday(day) ? 'rgba(43, 140, 238, 0.02)' : 'transparent' }}>
                {daySessions.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>-</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {daySessions.map(session => (
                      <div key={session.id} style={{ padding: '10px', borderRadius: '8px', backgroundColor: `${getSubjectColor(session.classroom.subject)}15`, borderLeft: `3px solid ${getSubjectColor(session.classroom.subject)}` }}>
                        <p style={{ fontSize: '11px', color: getSubjectColor(session.classroom.subject), fontWeight: '600', marginBottom: '4px' }}>{formatTime(session.scheduled_at)}</p>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#111418', marginBottom: '2px' }}>{session.title || session.classroom.title}</p>
                        <p style={{ fontSize: '11px', color: '#617589' }}>{session.teacher.display_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {sessions.length === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '48px', textAlign: 'center', marginTop: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>Pas de sessions cette semaine</h3>
          <p style={{ color: '#617589', marginBottom: '24px' }}>Explorez les cours disponibles</p>
          <Link href="/search" style={{ padding: '12px 24px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>Découvrir les cours →</Link>
        </div>
      )}
    </div>
  )
}