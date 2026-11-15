'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Cette page redirige maintenant vers /search avec l'onglet professeurs
export default function FindTeachersRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.push('/search')
  }, [router])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
      <p style={{ color: '#617589', fontSize: '16px' }}>Redirection vers la recherche unifiée...</p>
    </div>
  )
}
