'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PHONE_FORMATS, getPhoneFormatByCountry, formatPhoneNumber, getFullPhoneNumber } from '@/lib/phone-formats'
import { EDUCATION_LEVELS, SPECIALTIES, SPECIALTY_CATEGORIES, requiresSpecialty, getSpecialtiesByCategory } from '@/lib/education-levels'

const COUNTRIES = [
  { code: 'TN', name: 'Tunisie', currency: 'TND' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'SN', name: 'Sénégal', currency: 'XOF' },
  { code: 'CI', name: 'Côte d\'Ivoire', currency: 'XOF' },
  { code: 'CM', name: 'Cameroun', currency: 'XAF' },
  { code: 'MA', name: 'Maroc', currency: 'MAD' },
  { code: 'DZ', name: 'Algérie', currency: 'DZD' },
  { code: 'US', name: 'États-Unis', currency: 'USD' },
  { code: 'CA', name: 'Canada', currency: 'USD' },
  { code: 'BE', name: 'Belgique', currency: 'EUR' },
  { code: 'CH', name: 'Suisse', currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF' },
  { code: 'BJ', name: 'Bénin', currency: 'XOF' },
  { code: 'GA', name: 'Gabon', currency: 'XAF' },
  { code: 'CG', name: 'Congo', currency: 'XAF' },
  { code: 'TD', name: 'Tchad', currency: 'XAF' },
  { code: 'ML', name: 'Mali', currency: 'XOF' },
  { code: 'NE', name: 'Niger', currency: 'XOF' },
  { code: 'TG', name: 'Togo', currency: 'XOF' },
].sort((a, b) => a.name.localeCompare(b.name, 'fr'))

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null)
  const [step, setStep] = useState(1)

  // Form state
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [educationLevel, setEducationLevel] = useState('')
  const [specialtyCategory, setSpecialtyCategory] = useState('')
  const [specialty, setSpecialty] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      // Check if profile already completed
      const { data: profile } = await supabase
        .from('users')
        .select('role, profile_completed, country, address, phone, currency, education_level, bac_type')
        .eq('id', user.id)
        .single()

      if (profile?.profile_completed) {
        if (profile.role === 'teacher') {
          router.push('/teacher/dashboard')
        } else {
          router.push('/student/dashboard')
        }
        return
      }

      if (profile?.role) {
        setUserRole(profile.role)
      }

      // Pre-fill if data exists
      if (profile) {
        if (profile.country) setCountry(profile.country)
        if (profile.address) setAddress(profile.address)
        if (profile.phone) {
          // Enlever le préfixe si présent
          const phoneFormat = getPhoneFormatByCountry(profile.country || '')
          if (phoneFormat && profile.phone.startsWith(phoneFormat.prefix)) {
            setPhone(profile.phone.substring(phoneFormat.prefix.length).trim())
          } else {
            setPhone(profile.phone)
          }
        }
        if (profile.currency) setCurrency(profile.currency)
        if (profile.education_level) setEducationLevel(profile.education_level)
        if (profile.bac_type) setSpecialty(profile.bac_type)
      }
    }

    checkAuth()
  }, [router, supabase])

  const handleCountryChange = (countryCode: string) => {
    setCountry(countryCode)
    const selectedCountry = COUNTRIES.find(c => c.code === countryCode)
    if (selectedCountry) {
      setCurrency(selectedCountry.currency)
    }
    // Reset phone when country changes
    setPhone('')
  }

  const handlePhoneChange = (value: string) => {
    const phoneFormat = getPhoneFormatByCountry(country)
    if (!phoneFormat) {
      setPhone(value)
      return
    }

    // Format automatiquement le numéro
    const formatted = formatPhoneNumber(value, phoneFormat)
    setPhone(formatted)
  }

  const handleNext = () => {
    // Validation par étape
    if (step === 1) {
      if (!country) {
        setError('Veuillez sélectionner votre pays')
        return
      }
      if (!phone) {
        setError('Veuillez entrer votre numéro de téléphone')
        return
      }
      setError(null)
      setStep(2)
    } else if (step === 2 && userRole === 'student') {
      if (!educationLevel) {
        setError('Veuillez sélectionner votre niveau scolaire')
        return
      }
      if (requiresSpecialty(educationLevel) && !specialty) {
        setError('Veuillez sélectionner votre spécialité')
        return
      }
      setError(null)
      setStep(3)
    }
  }

  const handleBack = () => {
    setError(null)
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      // Construire le numéro complet avec préfixe
      const fullPhone = getFullPhoneNumber(phone, country)

      const updateData: any = {
        country,
        address: address || null,
        phone: fullPhone,
        currency,
      }

      if (userRole === 'student') {
        updateData.education_level = educationLevel
        updateData.bac_type = specialty || null
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (updateError) {
        console.error('Update error:', updateError)
        setError('Erreur lors de la mise à jour du profil')
        setLoading(false)
        return
      }

      // Success - redirect based on role
      if (userRole === 'teacher') {
        router.push('/teacher/dashboard')
      } else {
        router.push('/subscription')
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError('Une erreur est survenue')
      setLoading(false)
    }
  }

  const phoneFormat = getPhoneFormatByCountry(country)
  const totalSteps = userRole === 'student' ? 3 : 2
  const needsSpecialty = requiresSpecialty(educationLevel)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf4ff 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorations */}
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.12)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
              Complétez votre profil
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px' }}>
              {userRole === 'student' ? 'Personnalisons votre expérience d\'apprentissage' : 'Quelques informations pour commencer'}
            </p>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: i < step ? '#3b82f6' : '#e5e7eb',
                    transition: 'background-color 0.3s'
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
              Étape {step} sur {totalSteps}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>{error}</span>
            </div>
          )}

          {/* Step 1: Country & Phone */}
          {step === 1 && (
            <div style={{ animation: 'slideIn 0.3s ease-out' }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  📍 Pays de résidence *
                </label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    fontSize: '15px',
                    outline: 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                >
                  <option value="">Sélectionnez votre pays</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {country && (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      📞 Numéro de téléphone *
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#6b7280',
                        backgroundColor: '#f9fafb',
                        minWidth: '80px',
                        textAlign: 'center'
                      }}>
                        {phoneFormat?.prefix || ''}
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder={phoneFormat?.placeholder || 'Numéro'}
                        required
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '2px solid #e5e7eb',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                    {phoneFormat && (
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                        Exemple: {phoneFormat.example}
                      </p>
                    )}
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      🏠 Adresse (optionnelle)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Adresse complète"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <div style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>💰</span>
                      <p style={{ fontWeight: '600', color: '#0369a1', fontSize: '14px', margin: 0 }}>
                        Devise préférée: {currency}
                      </p>
                    </div>
                    <p style={{ fontSize: '13px', color: '#075985', marginLeft: '32px', margin: 0 }}>
                      Les prix seront affichés dans cette devise. Vous pourrez la modifier dans les paramètres de votre compte.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Education Level (Students only) */}
          {step === 2 && userRole === 'student' && (
            <div style={{ animation: 'slideIn 0.3s ease-out' }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  🎓 Niveau scolaire *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {EDUCATION_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => {
                        setEducationLevel(level.value)
                        if (!level.requiresSpecialty) {
                          setSpecialty('')
                          setSpecialtyCategory('')
                        }
                      }}
                      style={{
                        padding: '16px 12px',
                        borderRadius: '14px',
                        border: educationLevel === level.value ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        backgroundColor: educationLevel === level.value ? 'rgba(59, 130, 246, 0.05)' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{level.icon}</span>
                      <span style={{
                        fontWeight: '600',
                        color: educationLevel === level.value ? '#3b82f6' : '#374151',
                        fontSize: '13px',
                        textAlign: 'center'
                      }}>
                        {level.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialty Category Selection */}
              {needsSpecialty && (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      🎯 Type de parcours *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                      {SPECIALTY_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setSpecialtyCategory(cat.value)
                            setSpecialty('')
                          }}
                          style={{
                            padding: '16px 12px',
                            borderRadius: '14px',
                            border: specialtyCategory === cat.value ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
                            backgroundColor: specialtyCategory === cat.value ? 'rgba(139, 92, 246, 0.05)' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ fontSize: '24px' }}>{cat.emoji}</span>
                          <span style={{
                            fontWeight: '600',
                            color: specialtyCategory === cat.value ? '#8b5cf6' : '#374151',
                            fontSize: '13px',
                            textAlign: 'center'
                          }}>
                            {cat.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Specialty Selection */}
                  {specialtyCategory && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '12px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>
                        📚 Spécialité *
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {getSpecialtiesByCategory(specialtyCategory).map((spec) => (
                          <button
                            key={spec.value}
                            type="button"
                            onClick={() => setSpecialty(spec.value)}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '12px',
                              border: specialty === spec.value ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
                              backgroundColor: specialty === spec.value ? 'rgba(139, 92, 246, 0.05)' : 'white',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontWeight: '500',
                              color: specialty === spec.value ? '#8b5cf6' : '#374151',
                              fontSize: '14px',
                              transition: 'all 0.2s'
                            }}
                          >
                            {spec.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {((step === 2 && userRole === 'teacher') || (step === 3 && userRole === 'student')) && (
            <div style={{ animation: 'slideIn 0.3s ease-out' }}>
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
                  ✅ Récapitulatif
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Pays:</span>
                    <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                      {COUNTRIES.find(c => c.code === country)?.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Téléphone:</span>
                    <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                      {getFullPhoneNumber(phone, country)}
                    </span>
                  </div>
                  {address && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Adresse:</span>
                      <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{address}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Devise:</span>
                    <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{currency}</span>
                  </div>
                  {userRole === 'student' && educationLevel && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Niveau:</span>
                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                          {EDUCATION_LEVELS.find(l => l.value === educationLevel)?.label}
                        </span>
                      </div>
                      {specialty && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280', fontSize: '14px' }}>Spécialité:</span>
                          <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                            {SPECIALTIES.find(s => s.value === specialty)?.label}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <p style={{ fontSize: '13px', color: '#075985', margin: 0, lineHeight: '1.5' }}>
                  💡 <strong>Bon à savoir:</strong> Vous pourrez modifier ces informations à tout moment dans les paramètres de votre compte.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                ← Retour
              </button>
            )}

            {(step < totalSteps) ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!country || !phone}
                style={{
                  flex: step > 1 ? 1 : undefined,
                  width: step === 1 ? '100%' : undefined,
                  padding: '16px',
                  background: (!country || !phone) ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: (!country || !phone) ? 'not-allowed' : 'pointer',
                  boxShadow: (!country || !phone) ? 'none' : '0 8px 30px rgba(59, 130, 246, 0.4)'
                }}
              >
                Continuer →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 30px rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Enregistrement...
                  </>
                ) : (
                  <>✓ Terminer</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 640px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  )
}
