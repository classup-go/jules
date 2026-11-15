'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

interface User {
  id: string
  email: string
  display_name: string
  role: 'student' | 'teacher'
  avatar_url?: string | null
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

// Avatar Component with fallback to initials
function UserAvatar({ user, size = 40 }: { user: User | null; size?: number }) {
  const [imageError, setImageError] = useState(false)
  
  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Reset error state when avatar_url changes
  useEffect(() => {
    setImageError(false)
  }, [user?.avatar_url])

  const hasValidAvatar = user?.avatar_url && !imageError

  if (hasValidAvatar) {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0
      }}>
        <Image
          src={user.avatar_url!}
          alt={user.display_name || 'Avatar'}
          width={size}
          height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setImageError(true)}
          unoptimized // Pour les URLs externes Supabase
        />
      </div>
    )
  }

  // Fallback to initials
  return (
    <div style={{ 
      width: size, 
      height: size, 
      borderRadius: '50%', 
      backgroundColor: '#2b8cee', 
      color: 'white', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontWeight: 'bold', 
      fontSize: size * 0.35,
      flexShrink: 0
    }}>
      {getInitials(user?.display_name || '')}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [hasEnrollments, setHasEnrollments] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser(profile)

        // Role-based access control: redirect if on wrong route
        const currentPath = window.location.pathname

        // Block teachers from student routes
        if (currentPath.startsWith('/student') && profile.role !== 'student') {
          router.push('/teacher/dashboard')
          return
        }

        // Block students from teacher routes
        if (currentPath.startsWith('/teacher') && profile.role !== 'teacher') {
          router.push('/student/home')
          return
        }

        // Block teachers from search/find-teachers (student-only)
        if ((currentPath === '/search' || currentPath === '/find-teachers') && profile.role === 'teacher') {
          router.push('/teacher/dashboard')
          return
        }

        fetchNotifications(authUser.id)
        fetchUnreadMessages(authUser.id)

        // Check enrollments for students
        if (profile.role === 'student') {
          fetchEnrollments(authUser.id)
        }
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const fetchNotifications = async (userId: string) => {
    const supabase = createClient()
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    setUnreadCount(count || 0)

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) setNotifications(data)
  }

  const fetchUnreadMessages = async (userId: string) => {
    const supabase = createClient()
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (participants && participants.length > 0) {
      const conversationIds = participants.map(p => p.conversation_id)
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', userId)

      setUnreadMessages(count || 0)
    }
  }

  const fetchEnrollments = async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .limit(1)

    setHasEnrollments(!!data && data.length > 0)
  }

  const markNotificationAsRead = async (notifId: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message': return '💬'
      case 'enrollment': return '📚'
      case 'qcm_passed': return '🎯'
      case 'live_session': return '🔴'
      default: return '🔔'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Navigation for students WITH enrollments (purchased courses)
  const studentLinksWithCourses = [
    { href: '/student/home', icon: '🏠', label: 'Accueil' },
    { href: '/student/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/student/my-courses', icon: '📚', label: 'Mes Cours' },
    { href: '/student/homework', icon: '📝', label: 'Mes Devoirs' },
    { href: '/search', icon: '🔍', label: 'Rechercher' },
    { href: '/student/teachers', icon: '👨‍🏫', label: 'Mes Profs' },
    { href: '/student/schedule', icon: '📅', label: 'Planning' },
    { href: '/messages', icon: '💬', label: 'Messages', badge: unreadMessages },
    { href: '/student/history', icon: '🕐', label: 'Historique' },
  ]

  // Navigation for students WITHOUT enrollments (browsing mode)
  const studentLinksNoCourses = [
    { href: '/student/home', icon: '🏠', label: 'Accueil' },
    { href: '/search', icon: '🔍', label: 'Rechercher' },
    { href: '/messages', icon: '💬', label: 'Messages', badge: unreadMessages },
    { href: '/profile', icon: '👤', label: 'Profil' },
  ]

  const studentLinks = hasEnrollments ? studentLinksWithCourses : studentLinksNoCourses

  const teacherLinks = [
    { href: '/teacher/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/teacher/classrooms', icon: '🏫', label: 'Mes Classes' },
    { href: '/teacher/homework', icon: '📝', label: 'Mes Devoirs' },
    { href: '/teacher/courses', icon: '📖', label: 'Mes Cours' },
    { href: '/teacher/sessions', icon: '🎥', label: 'Sessions Live' },
    { href: '/teacher/students', icon: '👥', label: 'Mes Élèves' },
    { href: '/messages', icon: '💬', label: 'Messages', badge: unreadMessages },
    { href: '/teacher/earnings', icon: '💰', label: 'Revenus' },
    { href: '/teacher/whiteboard', icon: '🎨', label: 'Tableau Blanc' },
  ]

  const navLinks = user?.role === 'teacher' ? teacherLinks : studentLinks

  const mobileNavLinks = user?.role === 'teacher'
    ? [
        { href: '/teacher/dashboard', icon: '📊', label: 'Accueil' },
        { href: '/teacher/classrooms', icon: '🏫', label: 'Classes' },
        { href: '/messages', icon: '💬', label: 'Messages', badge: unreadMessages },
        { href: '/teacher/earnings', icon: '💰', label: 'Revenus' },
      ]
    : hasEnrollments
      ? [
          { href: '/student/home', icon: '🏠', label: 'Accueil' },
          { href: '/student/dashboard', icon: '📊', label: 'Dashboard' },
          { href: '/student/my-courses', icon: '📚', label: 'Cours' },
          { href: '/messages', icon: '💬', label: 'Messages', badge: unreadMessages },
        ]
      : [
          { href: '/student/home', icon: '🏠', label: 'Accueil' },
          { href: '/search', icon: '🔍', label: 'Explorer' },
          { href: '/messages', icon: '💬', label: 'Messages', badge: unreadMessages },
          { href: '/profile', icon: '👤', label: 'Profil' },
        ]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f7f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #dbe0e6', borderTopColor: '#2b8cee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: '#617589' }}>Chargement...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Desktop: sidebar visible */
        @media (min-width: 1025px) {
          .sidebar { left: 0 !important; }
          .main-content { margin-left: 256px !important; }
          .menu-btn { display: none !important; }
          .mobile-nav { display: none !important; }
          .mobile-overlay { display: none !important; }
        }
        
        /* Tablet and Mobile: sidebar hidden by default */
        @media (max-width: 1024px) {
          .sidebar { left: -256px; }
          .sidebar.open { left: 0 !important; }
          .main-content { margin-left: 0 !important; }
          .menu-btn { display: flex !important; }
          .close-sidebar-btn { display: block !important; }
        }
        
        /* Mobile: bottom nav visible */
        @media (max-width: 768px) {
          .mobile-nav { display: flex !important; }
          .page-content { padding: 16px !important; padding-bottom: 90px !important; }
          .header-title { font-size: 16px !important; }
          .user-info-text { display: none !important; }
          .divider { display: none !important; }
        }
        
        /* Small mobile */
        @media (max-width: 480px) {
          .page-content { padding: 12px !important; padding-bottom: 90px !important; }
          .header-title { display: none !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f6f7f8' }}>
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="mobile-overlay"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40,
            }}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{ 
            width: '256px', 
            backgroundColor: 'white', 
            borderRight: '1px solid #dbe0e6', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            height: '100vh',
            zIndex: 50,
            transition: 'left 0.3s ease'
          }}
        >
          {/* Logo */}
          <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #dbe0e6' }}>
            <Link href={user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} style={{ color: '#2b8cee', fontSize: '17px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🎓</span>
              Jules Class Go
            </Link>
            <button 
              className="close-sidebar-btn"
              onClick={() => setSidebarOpen(false)}
              style={{ display: 'none', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#617589', padding: '4px' }}
            >
              ×
            </button>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: isActive('/profile') ? '600' : '500',
                  backgroundColor: isActive('/profile') ? 'rgba(43, 140, 238, 0.1)' : 'transparent',
                  color: isActive('/profile') ? '#2b8cee' : '#617589',
                  fontSize: '14px',
                }}
              >
                <span style={{ fontSize: '18px' }}>👤</span>
                Mon Profil
              </Link>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: isActive(link.href) ? '600' : '500',
                    backgroundColor: isActive(link.href) ? 'rgba(43, 140, 238, 0.1)' : 'transparent',
                    color: isActive(link.href) ? '#2b8cee' : '#617589',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{link.icon}</span>
                  {link.label}
                  {link.badge && link.badge > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}>
                      {link.badge > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </Link>
              ))}

              <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ padding: '0 14px', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Compte</p>
                <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', textDecoration: 'none', fontWeight: '500', color: '#617589', fontSize: '14px' }}>
                  <span style={{ fontSize: '18px' }}>⚙️</span>
                  Paramètres
                </Link>
                <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', textDecoration: 'none', fontWeight: '500', color: '#617589', fontSize: '14px' }}>
                  <span style={{ fontSize: '18px' }}>🔔</span>
                  Notifications
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: 'auto', backgroundColor: '#dc2626', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </nav>

          {/* Logout */}
          <div style={{ padding: '12px', borderTop: '1px solid #dbe0e6' }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#dc2626',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🚪</span>
              Déconnexion
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: '256px' }}>
          {/* Header */}
          <header style={{ 
            height: '64px', 
            backgroundColor: 'white', 
            borderBottom: '1px solid #dbe0e6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}>
            {/* Mobile menu button */}
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
              style={{ display: 'none', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px', alignItems: 'center', justifyContent: 'center' }}
            >
              ☰
            </button>

            <h1 className="header-title" style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>
              Tableau de bord
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    position: 'relative',
                    padding: '8px',
                    backgroundColor: showNotifications ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '10px',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🔔</span>
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '18px',
                      height: '18px',
                      backgroundColor: '#dc2626',
                      borderRadius: '50%',
                      border: '2px solid white',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
                      onClick={() => setShowNotifications(false)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '54px',
                      right: 0,
                      width: '340px',
                      maxWidth: 'calc(100vw - 32px)',
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      border: '1px solid #dbe0e6',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                      zIndex: 50,
                      overflow: 'hidden'
                    }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                        <h3 style={{ fontWeight: 'bold', color: '#111418', fontSize: '15px' }}>Notifications</h3>
                      </div>

                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: '32px', textAlign: 'center' }}>
                            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Aucune notification</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <Link
                              key={notif.id}
                              href={notif.link || '/notifications'}
                              onClick={() => {
                                if (!notif.is_read) markNotificationAsRead(notif.id)
                                setShowNotifications(false)
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '12px 18px',
                                backgroundColor: notif.is_read ? 'transparent' : 'rgba(43, 140, 238, 0.05)',
                                borderBottom: '1px solid #f3f4f6',
                                textDecoration: 'none',
                              }}
                            >
                              <span style={{ fontSize: '18px' }}>{getNotificationIcon(notif.type)}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: notif.is_read ? '400' : '600', color: '#111418', fontSize: '13px', marginBottom: '2px' }}>
                                  {notif.title}
                                </p>
                                <p style={{ fontSize: '12px', color: '#617589', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {notif.message}
                                </p>
                              </div>
                              <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>{formatTimeAgo(notif.created_at)}</span>
                            </Link>
                          ))
                        )}
                      </div>

                      <Link
                        href="/notifications"
                        onClick={() => setShowNotifications(false)}
                        style={{
                          display: 'block',
                          padding: '12px',
                          textAlign: 'center',
                          borderTop: '1px solid #f3f4f6',
                          color: '#2b8cee',
                          fontWeight: '600',
                          fontSize: '13px',
                          textDecoration: 'none'
                        }}
                      >
                        Voir tout
                      </Link>
                    </div>
                  </>
                )}
              </div>

              <div className="divider" style={{ width: '1px', height: '32px', backgroundColor: '#dbe0e6' }}></div>

              {/* User Info - FIXED: Now uses UserAvatar component */}
              <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                <div className="user-info-text" style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>{user?.display_name}</p>
                  <p style={{ fontSize: '11px', color: '#617589' }}>{user?.role === 'teacher' ? 'Professeur' : 'Élève'}</p>
                </div>
                <UserAvatar user={user} size={40} />
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <main className="page-content" style={{ flex: 1, padding: '24px' }}>
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav 
          className="mobile-nav"
          style={{ 
            display: 'none',
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            backgroundColor: 'white', 
            borderTop: '1px solid #dbe0e6',
            padding: '8px 8px',
            paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
            zIndex: 40,
            justifyContent: 'space-around'
          }}
        >
          {mobileNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '8px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive(link.href) ? '#2b8cee' : '#617589',
                backgroundColor: isActive(link.href) ? 'rgba(43, 140, 238, 0.1)' : 'transparent',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '24px' }}>{link.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: isActive(link.href) ? '600' : '500' }}>{link.label}</span>
              {link.badge && link.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '12px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  padding: '1px 4px',
                  borderRadius: '6px',
                  minWidth: '14px',
                  textAlign: 'center'
                }}>
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}