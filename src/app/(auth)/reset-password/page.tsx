'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
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
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>🔐</div>
              <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>Nouveau mot de passe</h2>
              <p style={{ color: '#6b7280', fontSize: '15px' }}>Choisissez un nouveau mot de passe sécurisé.</p>
            </div>

            {error && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>⚠️</span>
                <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Nouveau mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caractères" required style={{ width: '100%', padding: '14px 48px 14px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.5 }}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Confirmer le mot de passe</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmez votre mot de passe" required style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>

              {password && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: password.length >= i * 3 ? password.length >= 12 ? '#10b981' : password.length >= 8 ? '#f59e0b' : '#ef4444' : '#e5e7eb' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Force : {password.length >= 12 ? '🟢 Fort' : password.length >= 8 ? '🟡 Moyen' : password.length >= 6 ? '🟠 Faible' : '🔴 Très faible'}</p>
                </div>
              )}

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 8px 30px rgba(59, 130, 246, 0.4)' }}>
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px' }}>✅</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>Mot de passe mis à jour !</h2>
            <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '24px' }}>Redirection vers la connexion...</p>
            <Link href="/login" style={{ display: 'block', padding: '14px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', textDecoration: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', textAlign: 'center' }}>Aller à la connexion</Link>
          </div>
        )}
      </div>
    </div>
  )
}