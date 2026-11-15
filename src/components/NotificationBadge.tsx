'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setUnreadCount(count || 0)

    // Get latest notifications
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setNotifications(data)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message': return '💬'
      case 'enrollment': return '📚'
      case 'lesson_completed': return '✅'
      case 'qcm_passed': return '🎯'
      case 'live_session': return '🔴'
      default: return '🔔'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          border: '1px solid #dbe0e6',
          backgroundColor: 'white',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: '#dc2626',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
            onClick={() => setShowDropdown(false)}
          />
          <div style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            width: '360px',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #dbe0e6',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            zIndex: 50,
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 'bold', color: '#111418' }}>Notifications</h3>
              {unreadCount > 0 && (
                <span style={{ fontSize: '12px', color: '#2b8cee', fontWeight: '600' }}>{unreadCount} nouvelles</span>
              )}
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af' }}>Aucune notification</p>
                </div>
              ) : (
                notifications.map((notif, index) => (
                  <Link
                    key={notif.id}
                    href={notif.link || '/notifications'}
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 20px',
                      backgroundColor: notif.is_read ? 'transparent' : 'rgba(43, 140, 238, 0.05)',
                      borderBottom: index < notifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                      textDecoration: 'none'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{getNotificationIcon(notif.type)}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: notif.is_read ? '400' : '600', color: '#111418', fontSize: '13px', marginBottom: '2px' }}>
                        {notif.title}
                      </p>
                      <p style={{ fontSize: '12px', color: '#617589' }}>{notif.message}</p>
                    </div>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDate(notif.created_at)}</span>
                  </Link>
                ))
              )}
            </div>

            <Link
              href="/notifications"
              onClick={() => setShowDropdown(false)}
              style={{
                display: 'block',
                padding: '14px',
                textAlign: 'center',
                borderTop: '1px solid #f3f4f6',
                color: '#2b8cee',
                fontWeight: '600',
                fontSize: '14px',
                textDecoration: 'none'
              }}
            >
              Voir toutes les notifications
            </Link>
          </div>
        </>
      )}
    </div>
  )
}