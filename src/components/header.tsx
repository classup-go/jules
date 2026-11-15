'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title: string
  showBack?: boolean
  backHref?: string
  rightAction?: React.ReactNode
}

export default function Header({ title, showBack = true, backHref, rightAction }: HeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {showBack && (
            <button onClick={handleBack} className="flex-shrink-0">
              <svg className="w-6 h-6 text-[#1A365D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-[#1A365D] truncate">{title}</h1>
        </div>
        {rightAction && <div className="flex-shrink-0 ml-3">{rightAction}</div>}
      </div>
    </header>
  )
}
