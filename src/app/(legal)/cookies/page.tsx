'use client'

import Link from 'next/link'

export default function CookiesPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ fontSize: '28px' }}>🎓</span>
            <span style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>Jules Class Go</span>
          </Link>
          <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>← Retour</Link>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '48px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>Politique des Cookies</h1>
          <p style={{ color: '#6b7280', marginBottom: '32px' }}>Dernière mise à jour : Janvier 2026</p>

          <div style={{ color: '#374151', lineHeight: '1.8', fontSize: '15px' }}>
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Qu'est-ce qu'un cookie ?</h2>
              <p>Un cookie est un petit fichier stocké sur votre appareil pour mémoriser vos préférences et améliorer votre expérience.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Cookies essentiels 🟢</h2>
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '16px', border: '1px solid #bbf7d0' }}>
                <p>Nécessaires au fonctionnement : authentification, sécurité de session, préférences cookies.</p>
              </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Cookies fonctionnels 🔵</h2>
              <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '16px', border: '1px solid #bfdbfe' }}>
                <p>Améliorent l'expérience : thème, qualité vidéo, état de la sidebar.</p>
              </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Cookies analytiques 🟡</h2>
              <div style={{ backgroundColor: '#fefce8', borderRadius: '12px', padding: '16px', border: '1px solid #fef08a' }}>
                <p>Nous aident à comprendre l'utilisation du site (Google Analytics).</p>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Gérer vos cookies</h2>
              <p>Vous pouvez modifier vos préférences via la bannière cookies ou les paramètres de votre navigateur.</p>
            </section>
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/terms" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>CGU →</Link>
          <Link href="/privacy" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Confidentialité →</Link>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '14px' }}>© 2026 Jules Class Go</footer>
    </div>
  )
}