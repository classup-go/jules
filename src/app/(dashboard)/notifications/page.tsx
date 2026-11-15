'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  data?: any
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setNotifications(data)
    }

    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const supabase = createClient()

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ))
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const deleteNotification = async (id: string) => {
    const supabase = createClient()

    await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = async () => {
    if (!confirm('Supprimer toutes les notifications ?')) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    setNotifications([])
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message': return '💬'
      case 'enrollment': return '📚'
      case 'lesson_completed': return '✅'
      case 'qcm_passed': return '🎯'
      case 'qcm_failed': return '❌'
      case 'chapter_unlocked': return '🔓'
      case 'live_session': return '🔴'
      case 'payment': return '💳'
      case 'new_student': return '👋'
      case 'review': return '⭐'
      default: return '🔔'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_message': return '#2563eb'
      case 'enrollment': return '#16a34a'
      case 'lesson_completed': return '#16a34a'
      case 'qcm_passed': return '#16a34a'
      case 'qcm_failed': return '#dc2626'
      case 'chapter_unlocked': return '#7c3aed'
      case 'live_session': return '#dc2626'
      case 'payment': return '#16a34a'
      case 'new_student': return '#2563eb'
      case 'review': return '#d97706'
      default: return '#6b7280'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.is_read)

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Notifications</h1>
          <p style={{ color: '#617589' }}>
            {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes les notifications sont lues'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{ padding: '10px 16px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}
            >
              ✓ Tout marquer comme lu
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#617589', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}
            >
              🗑️ Tout supprimer
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: filter === 'all' ? 'none' : '1px solid #dbe0e6',
            backgroundColor: filter === 'all' ? '#2b8cee' : 'white',
            color: filter === 'all' ? 'white' : '#617589',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: filter === 'unread' ? 'none' : '1px solid #dbe0e6',
            backgroundColor: filter === 'unread' ? '#2b8cee' : 'white',
            color: filter === 'unread' ? 'white' : '#617589',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Non lues ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔔</div>
            <p style={{ color: '#617589', fontSize: '16px' }}>
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => {
            const icon = getNotificationIcon(notification.type)
            const color = getNotificationColor(notification.type)

            const content = (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '16px 20px',
                  backgroundColor: notification.is_read ? 'transparent' : 'rgba(43, 140, 238, 0.05)',
                  borderBottom: index < filteredNotifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: notification.link ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id)
                  }
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: `${color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  {icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <p style={{ fontWeight: notification.is_read ? '500' : '700', color: '#111418', fontSize: '14px' }}>
                      {notification.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(notification.created_at)}</span>
                      {!notification.is_read && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2b8cee' }}></div>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#617589', lineHeight: '1.5' }}>{notification.message}</p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id) }}
                  style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', borderRadius: '6px', fontSize: '14px' }}
                >
                  ×
                </button>
              </div>
            )

            return notification.link ? (
              <Link key={notification.id} href={notification.link} style={{ textDecoration: 'none' }}>
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            )
          })
        )}
      </div>
    </div>
  )
}