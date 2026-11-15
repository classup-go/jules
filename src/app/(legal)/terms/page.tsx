'use client'

import Link from 'next/link'

export default function TermsPage() {
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
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>Conditions Générales d'Utilisation</h1>
          <p style={{ color: '#6b7280', marginBottom: '32px' }}>Dernière mise à jour : Janvier 2026</p>

          <div style={{ color: '#374151', lineHeight: '1.8', fontSize: '15px' }}>
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>1. Présentation du service</h2>
              <p>Jules Class Go est une plateforme d'apprentissage en ligne qui met en relation des professeurs certifiés avec des élèves. Notre service propose des cours en direct, des QCM interactifs, un suivi personnalisé et une messagerie.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>2. Inscription</h2>
              <p>Pour utiliser Jules Class Go, vous devez créer un compte avec des informations exactes. Vous êtes responsable de la confidentialité de vos identifiants. Les mineurs doivent obtenir l'autorisation parentale.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>3. Utilisation</h2>
              <p>En utilisant notre plateforme, vous vous engagez à respecter les autres utilisateurs, ne pas partager vos accès, ne pas télécharger les contenus protégés et ne pas utiliser le service à des fins illégales.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>4. Propriété intellectuelle</h2>
              <p>Tous les contenus sont protégés par le droit d'auteur. L'accès vous confère un droit d'utilisation personnel et non-exclusif. Toute reproduction sans autorisation est interdite.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>5. Tarifs et paiements</h2>
              <p>Les prix sont en euros TTC. Les paiements sont sécurisés via Stripe. Les abonnements sont renouvelés automatiquement. Remboursement possible sous 14 jours.</p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>6. Contact</h2>
              <p>Pour toute question : <a href="mailto:contact@julesclassgo.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>contact@julesclassgo.com</a></p>
            </section>
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/privacy" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Confidentialité →</Link>
          <Link href="/cookies" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Cookies →</Link>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '14px' }}>© 2026 Jules Class Go</footer>
    </div>
  )
}