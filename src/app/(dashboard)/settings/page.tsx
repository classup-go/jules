'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getPaymentConfig } from '@/lib/payment/config'

// Pays supportés avec leurs devises
const COUNTRIES = [
  // Europe (Zone Euro)
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', region: 'Europe' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', currency: 'EUR', region: 'Europe' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', currency: 'EUR', region: 'Europe' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', currency: 'EUR', region: 'Europe' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', currency: 'EUR', region: 'Europe' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', region: 'Europe' },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', currency: 'EUR', region: 'Europe' },
  { code: 'AT', name: 'Autriche', flag: '🇦🇹', currency: 'EUR', region: 'Europe' },
  { code: 'IE', name: 'Irlande', flag: '🇮🇪', currency: 'EUR', region: 'Europe' },

  // Afrique du Nord
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', currency: 'TND', region: 'Afrique du Nord' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', currency: 'MAD', region: 'Afrique du Nord' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', currency: 'DZD', region: 'Afrique du Nord' },

  // Afrique de l'Ouest (FCFA)
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', currency: 'XOF', region: 'Afrique de l\'Ouest' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', currency: 'XOF', region: 'Afrique de l\'Ouest' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', currency: 'XOF', region: 'Afrique de l\'Ouest' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF', region: 'Afrique de l\'Ouest' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', currency: 'XOF', region: 'Afrique de l\'Ouest' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', currency: 'XOF', region: 'Afrique de l\'Ouest' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', currency: 'XOF', region: 'Afrique de l\'Ouest' },

  // Afrique Centrale (FCFA)
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', currency: 'XAF', region: 'Afrique Centrale' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', currency: 'XAF', region: 'Afrique Centrale' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', currency: 'XAF', region: 'Afrique Centrale' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', currency: 'XAF', region: 'Afrique Centrale' },

  // Amérique du Nord
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', currency: 'USD', region: 'Amérique du Nord' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', region: 'Amérique du Nord' },

  // Autres
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP', region: 'Europe' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', currency: 'CHF', region: 'Europe' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('FR')
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)
    setEmail(user.email || '')

    // Load user profile
    const { data: profile } = await supabase
      .from('users')
      .select('display_name, country, currency, country_auto_detected')
      .eq('id', user.id)
      .single()

    if (profile) {
      setDisplayName(profile.display_name || '')
      setSelectedCountry(profile.country || 'FR')

      if (profile.country_auto_detected && profile.country) {
        setDetectedCountry(profile.country)
      }
    }

    setLoading(false)
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const country = COUNTRIES.find(c => c.code === selectedCountry)

      if (!country) {
        setError('Pays invalide')
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          country: country.code,
          currency: country.currency,
          country_manually_set: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Update error:', updateError)
        setError('Erreur lors de la sauvegarde')
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group countries by region
  const groupedCountries: Record<string, typeof COUNTRIES> = {}
  filteredCountries.forEach(country => {
    if (!groupedCountries[country.region]) {
      groupedCountries[country.region] = []
    }
    groupedCountries[country.region].push(country)
  })

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry)
  const paymentConfig = selectedCountryData ? getPaymentConfig(selectedCountryData.code) : null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Paramètres</h1>
      <p style={{ color: '#617589', marginBottom: '32px' }}>Gérez vos préférences de compte et de paiement</p>

      {/* Success/Error Messages */}
      {success && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={{ color: '#16a34a', fontWeight: '500' }}>Paramètres sauvegardés avec succès</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ color: '#dc2626', fontWeight: '500' }}>{error}</span>
        </div>
      )}

      {/* Account Information */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '20px' }}>Informations du compte</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
            Nom d'affichage
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Votre nom"
            style={{ width: '100%', padding: '12px', border: '1px solid #dbe0e6', borderRadius: '8px', fontSize: '14px', color: '#111418' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            style={{ width: '100%', padding: '12px', border: '1px solid #dbe0e6', borderRadius: '8px', fontSize: '14px', color: '#617589', backgroundColor: '#f9fafb' }}
          />
          <p style={{ fontSize: '12px', color: '#617589', marginTop: '6px' }}>
            Pour changer votre email, contactez le support
          </p>
        </div>
      </div>

      {/* Region & Currency Settings */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>Région et Devise</h2>
        <p style={{ fontSize: '14px', color: '#617589', marginBottom: '20px' }}>
          Choisissez votre pays pour afficher les prix dans votre devise locale
        </p>

        {detectedCountry && (
          <div style={{ padding: '12px 16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>💡</span>
            <span style={{ fontSize: '13px', color: '#2563eb' }}>
              Pays détecté automatiquement : {COUNTRIES.find(c => c.code === detectedCountry)?.name}
            </span>
          </div>
        )}

        {/* Current Selection */}
        {selectedCountryData && (
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '32px' }}>{selectedCountryData.flag}</span>
              <div>
                <p style={{ fontWeight: '600', color: '#111418', fontSize: '16px' }}>{selectedCountryData.name}</p>
                <p style={{ fontSize: '14px', color: '#617589' }}>
                  Devise : {paymentConfig?.currency} ({paymentConfig?.currencySymbol})
                </p>
              </div>
            </div>

            {paymentConfig && paymentConfig.paymentMethods.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', color: '#617589', marginBottom: '8px' }}>Méthodes de paiement disponibles :</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {paymentConfig.paymentMethods.map(method => (
                    <span key={method.id} style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #dbe0e6', borderRadius: '6px', fontSize: '12px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{method.icon}</span>
                      <span>{method.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Country Search */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="🔍 Rechercher un pays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px', border: '1px solid #dbe0e6', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        {/* Country List */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dbe0e6', borderRadius: '8px' }}>
          {Object.entries(groupedCountries).map(([region, countries]) => (
            <div key={region}>
              <div style={{ padding: '8px 16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #dbe0e6', position: 'sticky', top: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#617589', textTransform: 'uppercase' }}>{region}</p>
              </div>
              {countries.map(country => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: selectedCountry === country.code ? 'rgba(43, 140, 238, 0.05)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCountry !== country.code) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCountry !== country.code) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{country.flag}</span>
                    <div>
                      <p style={{ fontWeight: selectedCountry === country.code ? '600' : '400', color: '#111418', fontSize: '14px' }}>
                        {country.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#617589' }}>{country.currency}</p>
                    </div>
                  </div>
                  {selectedCountry === country.code && (
                    <span style={{ color: '#2b8cee', fontSize: '18px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '14px',
            backgroundColor: saving ? '#9ca3af' : '#2b8cee',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '16px',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </button>
      </div>
    </div>
  )
}
