'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function OldNewClassroomPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirection automatique après 3 secondes
    const timer = setTimeout(() => {
      router.push('/teacher/classes/create')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '700px', width: '100%' }}>
        {/* Main Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2b8cee 0%, #1A365D 100%)',
            padding: '48px 32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚀</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>
              Interface Améliorée
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>
              Découvrez la nouvelle expérience de création de classe
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '32px' }}>
            {/* Features */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418', marginBottom: '20px' }}>
                ✨ Nouvelles fonctionnalités
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Feature 1 */}
                <div style={{ display: 'flex', gap: '16px', padding: '20px', backgroundColor: '#F7F8FA', borderRadius: '12px', border: '1px solid #dbe0e6' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    ⏱️
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111418', marginBottom: '4px' }}>
                      Champs de durée flexibles
                    </h3>
                    <p style={{ fontSize: '13px', color: '#617589', lineHeight: '1.5' }}>
                      Spécifiez la durée en minutes, heures ou semaines selon votre type de cours
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div style={{ display: 'flex', gap: '16px', padding: '20px', backgroundColor: '#F7F8FA', borderRadius: '12px', border: '1px solid #dbe0e6' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    🎯
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111418', marginBottom: '4px' }}>
                      Objectifs pédagogiques guidés
                    </h3>
                    <p style={{ fontSize: '13px', color: '#617589', lineHeight: '1.5' }}>
                      Définissez vos objectifs d'apprentissage clairs pour vos élèves
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div style={{ display: 'flex', gap: '16px', padding: '20px', backgroundColor: '#F7F8FA', borderRadius: '12px', border: '1px solid #dbe0e6' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    ⚡
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111418', marginBottom: '4px' }}>
                      Création automatique complète
                    </h3>
                    <p style={{ fontSize: '13px', color: '#617589', lineHeight: '1.5' }}>
                      Classe, cours et premier chapitre créés en un seul workflow
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div style={{ display: 'flex', gap: '16px', padding: '20px', backgroundColor: '#F7F8FA', borderRadius: '12px', border: '1px solid #dbe0e6' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    💰
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111418', marginBottom: '4px' }}>
                      Gestion des prix simplifiée
                    </h3>
                    <p style={{ fontSize: '13px', color: '#617589', lineHeight: '1.5' }}>
                      Définissez facilement le prix pour vos cours payants
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link
                href="/teacher/classes/create"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #2b8cee 0%, #1A365D 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '15px',
                  boxShadow: '0 4px 12px rgba(43,140,238,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                Accéder à la nouvelle interface
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/teacher/classrooms"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#F7F8FA',
                  color: '#617589',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  border: '1px solid #dbe0e6',
                  transition: 'all 0.2s'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour à mes classes
              </Link>
            </div>
          </div>
        </div>

        {/* Auto-redirect notice */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #dbe0e6'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#2b8cee',
              borderRadius: '50%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}></div>
            <p style={{ fontSize: '13px', color: '#617589', fontWeight: '500', margin: 0 }}>
              Redirection automatique dans quelques secondes...
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
