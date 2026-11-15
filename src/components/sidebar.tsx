'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  userRole?: 'student' | 'teacher'
}

export default function Sidebar({ userRole = 'student' }: SidebarProps) {
  const pathname = usePathname()

  const studentLinks = [
    { href: '/student/home', label: 'Accueil', icon: 'home' },
    { href: '/search', label: 'Rechercher', icon: 'search' },
    { href: '/student/my-courses', label: 'Mes Cours', icon: 'book' },
    { href: '/teachers', label: 'Professeurs', icon: 'users' },
    { href: '/student/schedule', label: 'Planning', icon: 'calendar' },
    { href: '/notifications', label: 'Notifications', icon: 'bell' },
    { href: '/profile', label: 'Mon Profil', icon: 'user' },
  ]

  const teacherLinks = [
    { href: '/teacher/classrooms', label: 'Mes Classes', icon: 'home' },
    { href: '/teacher/courses', label: 'Mes Cours', icon: 'book' },
    { href: '/teacher/profile/complete', label: 'Mon Profil Pro', icon: 'star' },
    { href: '/teacher/sessions', label: 'Sessions', icon: 'calendar' },
    { href: '/teacher/earnings', label: 'Revenus', icon: 'money' },
    { href: '/notifications', label: 'Notifications', icon: 'bell' },
    { href: '/profile', label: 'Mon Profil', icon: 'user' },
  ]

  const links = userRole === 'teacher' ? teacherLinks : studentLinks

  const isActive = (href: string) => pathname.startsWith(href)

  const renderIcon = (icon: string, active: boolean) => {
    const className = `w-5 h-5 ${active ? 'text-[#1A365D]' : 'text-[#9CA3AF]'}`

    switch (icon) {
      case 'home':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )
      case 'book':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )
      case 'users':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      case 'calendar':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'bell':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
      case 'user':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      case 'money':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'search':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        )
      case 'star':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-100 fixed left-0 top-0 h-full z-50 overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 flex-shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A365D] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <span className="text-xl font-bold text-[#1A365D] truncate">Jules</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#E8F4FD] text-[#1A365D] font-medium'
                  : 'text-[#9CA3AF] hover:bg-[#F7F8FA]'
              }`}
            >
              <span className="flex-shrink-0">{renderIcon(link.icon, active)}</span>
              <span className="text-sm truncate">{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F7F8FA] transition-all">
            <svg className="w-5 h-5 text-[#EF4444] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span className="text-sm text-[#EF4444] font-medium truncate">Déconnexion</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
