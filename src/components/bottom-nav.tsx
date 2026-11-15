'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavProps {
  userRole?: 'student' | 'teacher'
}

export default function BottomNav({ userRole = 'student' }: BottomNavProps) {
  const pathname = usePathname()

  const studentLinks = [
    { href: '/student/home', label: 'Accueil', icon: 'home' },
    { href: '/search', label: 'Rechercher', icon: 'search' },
    { href: '/student/my-courses', label: 'Mes Cours', icon: 'book' },
    { href: '/profile', label: 'Profil', icon: 'user' },
  ]

  const teacherLinks = [
    { href: '/teacher/classrooms', label: 'Accueil', icon: 'home' },
    { href: '/teacher/courses', label: 'Cours', icon: 'book' },
    { href: '/teacher/profile/complete', label: 'Profil Pro', icon: 'star' },
    { href: '/profile', label: 'Profil', icon: 'user' },
  ]

  const links = userRole === 'teacher' ? teacherLinks : studentLinks

  const isActive = (href: string) => {
    if (href === '/student/my-courses' || href === '/teacher/classrooms') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const renderIcon = (icon: string, active: boolean) => {
    const strokeColor = active ? '#1A365D' : '#9CA3AF'
    const fillColor = active ? '#1A365D' : 'none'
    
    switch (icon) {
      case 'home':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? fillColor : 'none'} stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )
      case 'book':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )
      case 'users':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? fillColor : 'none'} stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      case 'user':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      case 'search':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        )
      case 'star':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? fillColor : 'none'} stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-4 py-3 flex justify-around items-center z-50">
      {links.map((link) => {
        const active = isActive(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-1 min-w-[60px]"
          >
            {renderIcon(link.icon, active)}
            <span className={`text-xs font-medium ${active ? 'text-[#1A365D]' : 'text-[#9CA3AF]'}`}>
              {link.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}