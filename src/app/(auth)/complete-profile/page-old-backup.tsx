'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPaymentConfig } from '@/lib/countries'

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

const EDUCATION_LEVELS = [
  { value: 'college', label: 'Collège (6ème - 3ème)' },
  { value: 'lycee', label: 'Lycée (2nde - 1ère)' },
  { value: 'terminal', label: 'Terminale' },
  { value: 'bac', label: 'Bac (obtenu)' },
  { value: 'university', label: 'Universitaire' },
  { value: 'other', label: 'Autre' },
]

const BAC_TYPES = [
  { value: 'scientifique', label: 'Bac Scientifique (S)' },
  { value: 'mathematiques', label: 'Bac Mathématiques' },
  { value: 'sciences_experimentales', label: 'Bac Sciences Expérimentales' },
  { value: 'technique', label: 'Bac Technique' },
  { value: 'economie_gestion', label: 'Bac Économie & Gestion' },
  { value: 'lettres', label: 'Bac Lettres' },
  { value: 'sport', label: 'Bac Sport' },
  { value: 'informatique', label: 'Bac Informatique' },
  { value: 'other', label: 'Autre' },
]

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null)

  // Form state
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [educationLevel, setEducationLevel] = useState('')
  const [bacType, setBacType] = useState('')

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
        // Redirect based on role - Le profil est déjà complété
        if (profile.role === 'teacher') {
          router.push('/teacher/dashboard')
        } else {
          router.push('/student/dashboard')
        }
        return
      }

      // Set user role
      if (profile?.role) {
        setUserRole(profile.role)
      }

      // Pre-fill if data exists
      if (profile) {
        if (profile.country) setCountry(profile.country)
        if (profile.address) setAddress(profile.address)
        if (profile.phone) setPhone(profile.phone)
        if (profile.currency) setCurrency(profile.currency)
        if (profile.education_level) setEducationLevel(profile.education_level)
        if (profile.bac_type) setBacType(profile.bac_type)
      }
    }

    checkAuth()
  }, [router, supabase])

  const handleCountryChange = (countryCode: string) => {
    setCountry(countryCode)

    // Auto-set currency based on country
    const selectedCountry = COUNTRIES.find(c => c.code === countryCode)
    if (selectedCountry) {
      setCurrency(selectedCountry.currency)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!country || !phone) {
      setError('Veuillez remplir tous les champs obligatoires')
      setLoading(false)
      return
    }

    // Pour les étudiants, vérifier le niveau scolaire
    if (userRole === 'student') {
      if (!educationLevel) {
        setError('Veuillez sélectionner votre niveau scolaire')
        setLoading(false)
        return
      }

      if (educationLevel === 'bac' || educationLevel === 'terminal') {
        if (!bacType) {
          setError('Veuillez sélectionner votre type de bac')
          setLoading(false)
          return
        }
      }
    }

    try {
      const updateData: any = {
        country,
        address: address || null,
        phone,
        currency,
      }

      // Ajouter education_level et bac_type seulement pour les étudiants
      if (userRole === 'student') {
        updateData.education_level = educationLevel
        updateData.bac_type = (educationLevel === 'bac' || educationLevel === 'terminal') ? bacType : null
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
        // Professeur → Dashboard
        router.push('/teacher/dashboard')
      } else {
        // Étudiants → Page pricing pour choisir un plan
        router.push('/subscription')
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError('Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '10px',
          color: '#1a1a1a'
        }}>
          Complétez votre profil
        </h1>

        <p style={{
          color: '#666',
          marginBottom: '30px',
          fontSize: '15px'
        }}>
          {userRole === 'teacher'
            ? 'Ces informations nous permettent de personnaliser votre espace enseignant.'
            : 'Ces informations nous permettent de personnaliser votre expérience et de vous proposer des cours adaptés à votre niveau.'
          }
        </p>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c33',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Pays */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#333'
            }}>
              Pays <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '15px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Sélectionnez votre pays</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Adresse */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#333'
            }}>
              Adresse (optionnelle)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse complète"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '15px'
              }}
            />
          </div>

          {/* Téléphone */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#333'
            }}>
              Numéro de téléphone <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 XX XXX XXX"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '15px'
              }}
            />
          </div>

          {/* Devise */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#333'
            }}>
              Devise préférée <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '15px',
                backgroundColor: 'white'
              }}
            >
              <option value="EUR">Euro (EUR)</option>
              <option value="TND">Dinar tunisien (TND)</option>
              <option value="XOF">Franc CFA Ouest (XOF)</option>
              <option value="XAF">Franc CFA Central (XAF)</option>
              <option value="MAD">Dirham marocain (MAD)</option>
              <option value="DZD">Dinar algérien (DZD)</option>
              <option value="USD">Dollar américain (USD)</option>
            </select>
            <p style={{
              marginTop: '6px',
              fontSize: '13px',
              color: '#666'
            }}>
              Les prix seront affichés dans cette devise
            </p>
          </div>

          {/* Champs spécifiques aux étudiants */}
          {userRole === 'student' && (
            <>
              {/* Niveau scolaire */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#333'
                }}>
                  Niveau scolaire <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '15px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Sélectionnez votre niveau</option>
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                <p style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  Ceci nous aide à vous recommander des cours adaptés
                </p>
              </div>

              {/* Type de bac (conditionnel) */}
              {(educationLevel === 'bac' || educationLevel === 'terminal') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#333'
                  }}>
                    Type de bac <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <select
                    value={bacType}
                    onChange={(e) => setBacType(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '15px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Sélectionnez votre type de bac</option>
                    {BAC_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#ccc' : '#2b8cee',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Enregistrement...' : 'Continuer'}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          fontSize: '13px',
          color: '#999',
          textAlign: 'center'
        }}>
          Vous pourrez modifier ces informations plus tard dans vos paramètres
        </p>
      </div>
    </div>
  )
}
