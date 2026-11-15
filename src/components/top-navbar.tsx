'use client'

import Link from 'next/link'

interface TopNavbarProps {
  userName?: string
  userAvatar?: string
  userRole?: 'student' | 'teacher'
}

export default function TopNavbar({ userName = 'Utilisateur', userAvatar, userRole = 'student' }: TopNavbarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 sticky top-0 z-40 px-4 lg:px-6">
      <div className="h-full flex items-center justify-between w-full">
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mr-4">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un professeur, une matière..."
              className="w-full h-11 pl-12 pr-4 bg-[#F7F8FA] rounded-xl text-sm text-[#1A365D] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#1A365D]/10 focus:bg-white transition-all border border-transparent focus:border-[#1A365D]/20"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notifications */}
          <Link href="/notifications">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F7F8FA] transition-all relative">
              <svg className="w-5 h-5 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F5A623] rounded-full"></span>
            </button>
          </Link>

          {/* User Profile */}
          <Link href="/profile">
            <button className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-xl hover:bg-[#F7F8FA] transition-all">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#E8F4FD] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#1A365D] font-semibold text-sm">{userName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="hidden lg:block text-left min-w-0">
                <p className="text-sm font-medium text-[#1A365D] truncate max-w-[120px]">{userName}</p>
                <p className="text-xs text-[#9CA3AF]">{userRole === 'teacher' ? 'Professeur' : 'Élève'}</p>
              </div>
            </button>
          </Link>
        </div>
      </div>
    </header>
  )
}
