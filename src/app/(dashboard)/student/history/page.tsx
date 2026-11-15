'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Activity {
  id: string
  type: 'enrollment' | 'lesson_completed' | 'qcm_passed' | 'payment'
  title: string
  description: string
  date: string
  metadata?: { amount?: number; score?: number }
}

export default function HistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'enrollment' | 'lesson' | 'payment'>('all')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { setLoading(false); return }

    try {
      const allActivities: Activity[] = []

      // Enrollments
      const { data: enrollments } = await supabase.from('enrollments').select('id, created_at, classroom_id').eq('student_id', user.id).order('created_at', { ascending: false })

      if (enrollments && enrollments.length > 0) {
        const classroomIds = enrollments.map(e => e.classroom_id)
        const { data: classrooms } = await supabase.from('classrooms').select('id, title, subject').in('id', classroomIds)
        const classroomMap = new Map(classrooms?.map(c => [c.id, c]) || [])

        enrollments.forEach(e => {
          const classroom = classroomMap.get(e.classroom_id)
          allActivities.push({ id: `enrollment-${e.id}`, type: 'enrollment', title: 'Inscription à un cours', description: classroom?.title || 'Cours', date: e.created_at })
        })
      }

      // Payments
      const { data: payments } = await supabase.from('payments').select('id, created_at, amount, status').eq('student_id', user.id).eq('status', 'completed').order('created_at', { ascending: false })

      if (payments) {
        payments.forEach(p => {
          allActivities.push({ id: `payment-${p.id}`, type: 'payment', title: 'Paiement effectué', description: `${p.amount}€`, date: p.created_at, metadata: { amount: p.amount } })
        })
      }

      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setActivities(allActivities)
    } catch (error) { console.error('Error:', error) }

    setLoading(false)
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = { enrollment: '📚', lesson_completed: '✅', qcm_passed: '🎯', payment: '💳' }
    return icons[type] || '📌'
  }

  const getActivityColor = (type: string) => {
    const colors: Record<string, { bg: string, text: string }> = {
      enrollment: { bg: '#dbeafe', text: '#2563eb' },
      lesson_completed: { bg: '#d1fae5', text: '#059669' },
      qcm_passed: { bg: '#fef3c7', text: '#d97706' },
      payment: { bg: '#e0e7ff', text: '#4f46e5' },
    }
    return colors[type] || { bg: '#f3f4f6', text: '#6b7280' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Hier'
    if (days < 7) return `Il y a ${days} jours`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const filteredActivities = filter === 'all' ? activities : activities.filter(a => {
    if (filter === 'enrollment') return a.type === 'enrollment'
    if (filter === 'lesson') return a.type === 'lesson_completed' || a.type === 'qcm_passed'
    if (filter === 'payment') return a.type === 'payment'
    return true
  })

  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.date).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(activity)
    return groups
  }, {} as Record<string, Activity[]>)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}><p style={{ color: '#617589' }}>Chargement...</p></div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Historique</h1>
        <p style={{ color: '#617589' }}>Retrouvez toutes vos activités</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Cours suivis', value: activities.filter(a => a.type === 'enrollment').length, color: '#2563eb' },
          { label: 'Leçons terminées', value: activities.filter(a => a.type === 'lesson_completed').length, color: '#059669' },
          { label: 'QCM réussis', value: activities.filter(a => a.type === 'qcm_passed').length, color: '#d97706' },
          { label: 'Total dépensé', value: `${activities.filter(a => a.type === 'payment').reduce((sum, a) => sum + (a.metadata?.amount || 0), 0)}€`, color: '#4f46e5' },
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>{stat.value}</p>
            <p style={{ fontSize: '13px', color: '#617589' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[{ key: 'all', label: 'Tout' }, { key: 'enrollment', label: '📚 Inscriptions' }, { key: 'lesson', label: '✅ Leçons' }, { key: 'payment', label: '💳 Paiements' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)} style={{ padding: '8px 16px', borderRadius: '20px', border: filter === f.key ? 'none' : '1px solid #dbe0e6', backgroundColor: filter === f.key ? '#2b8cee' : 'white', color: filter === f.key ? 'white' : '#617589', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>{f.label}</button>
        ))}
      </div>

      {filteredActivities.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>Aucune activité</h3>
          <p style={{ color: '#617589', marginBottom: '24px' }}>Votre historique est vide</p>
          <Link href="/search" style={{ padding: '12px 24px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>Découvrir les cours →</Link>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
          {Object.entries(groupedActivities).map(([dateKey, dayActivities]) => (
            <div key={dateKey}>
              <div style={{ padding: '12px 24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#617589' }}>{formatDate(dayActivities[0].date)}</p>
              </div>
              {dayActivities.map((activity, i) => {
                const color = getActivityColor(activity.type)
                return (
                  <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: i < dayActivities.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{getActivityIcon(activity.type)}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>{activity.title}</p>
                      <p style={{ fontSize: '14px', color: '#617589' }}>{activity.description}</p>
                    </div>
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>{formatTime(activity.date)}</p>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}