'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf4ff 100%)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: 'white', borderRadius: '24px', padding: '48px', boxShadow: '0 25px 80px rgba(0,0,0,0.12)', position: 'relative', zIndex: 1 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '32px', justifyContent: 'center' }}>
          <span style={{ fontSize: '36px' }}>🎓</span>
          <span style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>Jules Class Go</span>
        </Link>

        {!success ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>🔑</div>
              <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>Mot de passe oublié ?</h2>
              <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>Entrez votre email et nous vous enverrons un lien de réinitialisation.</p>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>⚠️</span>
                <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Adresse e-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@email.com" required style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 8px 30px rgba(59, 130, 246, 0.4)', marginBottom: '24px' }}>
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </button>
            </form>

            <div style={{ textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>← Retour à la connexion</Link>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px' }}>✉️</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>Email envoyé !</h2>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>Si un compte existe avec <strong>{email}</strong>, vous recevrez un email avec les instructions.</p>
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #bbf7d0' }}>
              <p style={{ color: '#16a34a', fontSize: '14px', margin: 0 }}>💡 Vérifiez vos spams si vous ne voyez pas l'email.</p>
            </div>
            <Link href="/login" style={{ display: 'block', padding: '14px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', textDecoration: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', textAlign: 'center' }}>Retour à la connexion</Link>
          </div>
        )}
      </div>
    </div>
  )
}