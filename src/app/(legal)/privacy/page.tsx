'use client'

import Link from 'next/link'

export default function PrivacyPage() {
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
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>Politique de Confidentialité</h1>
          <p style={{ color: '#6b7280', marginBottom: '32px' }}>Dernière mise à jour : Janvier 2026</p>

          <div style={{ color: '#374151', lineHeight: '1.8', fontSize: '15px' }}>
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>1. Données collectées</h2>
              <p style={{ marginBottom: '12px' }}>Nous collectons :</p>
              <ul style={{ paddingLeft: '24px' }}>
                <li>Données d'identification (nom, email, photo)</li>
                <li>Données d'utilisation (progression, résultats)</li>
                <li>Données techniques (IP, navigateur)</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>2. Utilisation des données</h2>
              <p>Vos données servent à fournir nos services, personnaliser votre expérience, communiquer avec vous et assurer la sécurité.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>3. Vos droits (RGPD)</h2>
              <ul style={{ paddingLeft: '24px' }}>
                <li><strong>Accès :</strong> obtenir une copie de vos données</li>
                <li><strong>Rectification :</strong> corriger vos informations</li>
                <li><strong>Effacement :</strong> supprimer votre compte</li>
                <li><strong>Portabilité :</strong> recevoir vos données</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>4. Sécurité</h2>
              <p>Nous utilisons le chiffrement HTTPS, mots de passe hashés et sauvegardes régulières.</p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>5. Contact</h2>
              <p>Pour vos données : <a href="mailto:privacy@julesclassgo.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>privacy@julesclassgo.com</a></p>
            </section>
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/terms" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>CGU →</Link>
          <Link href="/cookies" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Cookies →</Link>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '14px' }}>© 2026 Jules Class Go</footer>
    </div>
  )
}