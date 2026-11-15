'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CountryCurrencySelector } from '@/components/country-currency-selector'
import type { CurrencyType } from '@/types/database'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [country, setCountry] = useState<string>('')
  const [currency, setCurrency] = useState<CurrencyType>('EUR')
  const [manuallySetCountry, setManuallySetCountry] = useState(false)

  const handleGoogleSignUp = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      setError('Erreur lors de la connexion avec Google')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          display_name: displayName,
          role: role,
        }
      }
    })

    if (signUpError) {
      console.error('Signup error:', signUpError)  // Pour debug

      if (signUpError.message.includes('already registered') ||
          signUpError.message.includes('already been registered')) {
        setError('Cet email est déjà utilisé. Essayez de vous connecter.')
      } else if (signUpError.message.toLowerCase().includes('password')) {
        setError('Mot de passe invalide. Utilisez au moins 8 caractères.')
      } else if (signUpError.message.toLowerCase().includes('email')) {
        setError('Adresse email invalide.')
      } else {
        // Afficher le message brut de Supabase pour identifier le problème
        setError(`Erreur: ${signUpError.message}`)
      }
      setLoading(false)
      return
    }

    if (data.user) {
      // Créer le profil utilisateur
      const profileData: any = {
        id: data.user.id,
        email: email,
        display_name: displayName,
        role: role,
        profile_completed: false, // Tous les nouveaux utilisateurs doivent compléter leur profil
      }

      await supabase.from('users').upsert(profileData)

      // Vérifier si confirmation email requise
      if (!data.session) {
        setSuccess('🎉 Compte créé ! Vérifiez votre boîte mail pour activer votre compte.')
      } else {
        // Tous les utilisateurs (student ET teacher) passent d'abord par complete-profile
        router.push('/complete-profile')
      }
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf4ff 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Background decorations */}
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

      {/* Left side - Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'white', borderRadius: '24px', padding: '36px 40px', boxShadow: '0 25px 80px rgba(0,0,0,0.12)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '28px', justifyContent: 'center' }}>
            <span style={{ fontSize: '36px' }}>🎓</span>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>Jules Class Go</span>
          </Link>

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>Créer un compte</h2>
            <p style={{ color: '#6b7280', fontSize: '15px' }}>Rejoignez notre communauté d'apprentissage</p>
          </div>

          {/* Success Message */}
          {success && (
            <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ color: '#16a34a', fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>{success}</p>
              <p style={{ color: '#15803d', fontSize: '13px', marginBottom: '16px' }}>
                📧 Un email de confirmation a été envoyé à <strong>{email}</strong>
              </p>
              <Link href="/login" style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: '#16a34a', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                Aller à la connexion
              </Link>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>{error}</span>
            </div>
          )}

          {!success && (
            <>
              {/* Google Sign Up */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                style={{ width: '100%', padding: '14px', backgroundColor: 'white', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#374151', marginBottom: '24px' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>ou avec email</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              </div>

              <form onSubmit={handleSubmit}>
                {/* Role Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Je suis...</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button type="button" onClick={() => setRole('student')} style={{ padding: '16px 12px', borderRadius: '14px', border: role === 'student' ? '2px solid #3b82f6' : '2px solid #e5e7eb', backgroundColor: role === 'student' ? 'rgba(59, 130, 246, 0.05)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '32px' }}>👨‍🎓</span>
                      <span style={{ fontWeight: '700', color: role === 'student' ? '#3b82f6' : '#374151', fontSize: '14px' }}>Élève</span>
                    </button>
                    <button type="button" onClick={() => setRole('teacher')} style={{ padding: '16px 12px', borderRadius: '14px', border: role === 'teacher' ? '2px solid #8b5cf6' : '2px solid #e5e7eb', backgroundColor: role === 'teacher' ? 'rgba(139, 92, 246, 0.05)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '32px' }}>👨‍🏫</span>
                      <span style={{ fontWeight: '700', color: role === 'teacher' ? '#8b5cf6' : '#374151', fontSize: '14px' }}>Professeur</span>
                    </button>
                  </div>
                </div>

                {/* Country & Currency Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <CountryCurrencySelector
                    onSelect={(selectedCountry, selectedCurrency, isManual = false) => {
                      setCountry(selectedCountry)
                      setCurrency(selectedCurrency)
                      setManuallySetCountry(isManual)
                    }}
                    showAutoDetection={true}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Nom complet</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jean Dupont" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Adresse e-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@email.com" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 caractères" required style={{ width: '100%', padding: '12px 48px 12px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.5 }}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Confirmer le mot de passe</label>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmez votre mot de passe" required style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
                </div>

                {/* Password strength */}
                {password && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: password.length >= i * 3 ? password.length >= 12 ? '#10b981' : password.length >= 8 ? '#f59e0b' : '#ef4444' : '#e5e7eb' }} />
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>
                      Force : {password.length >= 12 ? '🟢 Fort' : password.length >= 8 ? '🟡 Moyen' : password.length >= 6 ? '🟠 Faible' : '🔴 Très faible'}
                    </p>
                  </div>
                )}

                {/* Terms */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                    J'accepte les <Link href="/terms" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>conditions d'utilisation</Link> et la <Link href="/privacy" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>politique de confidentialité</Link>
                  </span>
                </label>

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? '#9ca3af' : role === 'teacher' ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 8px 30px rgba(59, 130, 246, 0.4)' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Création...
                    </span>
                  ) : <>Créer mon compte {role === 'student' ? '👨‍🎓' : '👨‍🏫'}</>}
                </button>
              </form>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <p style={{ color: '#6b7280', fontSize: '15px' }}>
                  Déjà un compte ? <Link href="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '700' }}>Se connecter</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side - Branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', position: 'relative', zIndex: 1 }} className="right-panel">
        <div style={{ maxWidth: '500px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: '800', color: '#111827', lineHeight: '1.2', marginBottom: '24px' }}>
            Rejoignez la communauté 
            <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block' }}>Jules Class Go</span>
          </h1>
          
          <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.7', marginBottom: '40px' }}>
            {role === 'student' ? 'Accédez à des milliers de cours, exercices et QCM. Progressez avec les meilleurs professeurs.' : 'Partagez votre savoir, créez vos cours et accompagnez des élèves vers la réussite.'}
          </p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {[
              { icon: '👨‍🎓', value: '15K+', label: 'Élèves actifs' },
              { icon: '👨‍🏫', value: '500+', label: 'Professeurs' },
              { icon: '📚', value: '50K+', label: 'Cours' },
              { icon: '⭐', value: '4.9/5', label: 'Satisfaction' },
            ].map((stat, i) => (
              <div key={i} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <span style={{ fontSize: '28px' }}>{stat.icon}</span>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: '8px 0 4px' }}>{stat.value}</p>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) { .right-panel { display: none !important; } }
      `}</style>
    </div>
  )
}