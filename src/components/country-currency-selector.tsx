'use client'

/**
 * Country & Currency Selector Component
 * Allows users to select their country and currency
 * Features:
 * - Auto-detection via IP geolocation
 * - Manual country selection with automatic currency mapping
 * - Display of detected location
 */

import { useState, useEffect, useRef } from 'react'
import { useGeoLocation } from '@/lib/payment/useGeoLocation'
import { getPaymentConfig } from '@/lib/payment/config'
import type { CurrencyType } from '@/types/database'

interface CountryCurrencySelectorProps {
  onSelect: (country: string, currency: CurrencyType, isManual?: boolean) => void
  initialCountry?: string
  initialCurrency?: CurrencyType
  showAutoDetection?: boolean
  disabled?: boolean
}

interface CountryOption {
  code: string
  name: string
  currency: CurrencyType
  flag: string
}

const COUNTRIES: CountryOption[] = [
  // Europe
  { code: 'FR', name: 'France', currency: 'EUR', flag: '🇫🇷' },
  { code: 'DE', name: 'Allemagne', currency: 'EUR', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', currency: 'EUR', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', currency: 'EUR', flag: '🇮🇹' },
  { code: 'BE', name: 'Belgique', currency: 'EUR', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹' },
  { code: 'NL', name: 'Pays-Bas', currency: 'EUR', flag: '🇳🇱' },
  { code: 'AT', name: 'Autriche', currency: 'EUR', flag: '🇦🇹' },
  { code: 'CH', name: 'Suisse', currency: 'EUR', flag: '🇨🇭' },
  { code: 'GB', name: 'Royaume-Uni', currency: 'EUR', flag: '🇬🇧' },

  // North Africa
  { code: 'TN', name: 'Tunisie', currency: 'TND', flag: '🇹🇳' },
  { code: 'MA', name: 'Maroc', currency: 'EUR', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', currency: 'EUR', flag: '🇩🇿' },

  // West Africa (FCFA)
  { code: 'SN', name: 'Sénégal', currency: 'XOF', flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', currency: 'XOF', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', flag: '🇧🇫' },
  { code: 'BJ', name: 'Bénin', currency: 'XOF', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', currency: 'XOF', flag: '🇹🇬' },
  { code: 'NE', name: 'Niger', currency: 'XOF', flag: '🇳🇪' },

  // Central Africa (FCFA)
  { code: 'CM', name: 'Cameroun', currency: 'XOF', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', currency: 'XOF', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', currency: 'XOF', flag: '🇨🇬' },

  // North America
  { code: 'US', name: 'États-Unis', currency: 'USD', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', currency: 'CAD', flag: '🇨🇦' },
]

export function CountryCurrencySelector({
  onSelect,
  initialCountry,
  initialCurrency,
  showAutoDetection = true,
  disabled = false
}: CountryCurrencySelectorProps) {
  const { countryCode: detectedCountry, countryName: detectedName, loading } = useGeoLocation()

  const [isManualMode, setIsManualMode] = useState(!!initialCountry)
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry || 'FR')
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>(
    initialCurrency || 'EUR'
  )

  // Use ref to track if user has manually selected a country
  const hasManualSelectionRef = useRef(!!initialCountry)

  // Update when detection completes (but not if user manually changed)
  useEffect(() => {
    if (!loading && !initialCountry && detectedCountry && !hasManualSelectionRef.current) {
      const config = getPaymentConfig(detectedCountry)
      setSelectedCountry(detectedCountry)
      setSelectedCurrency(config.currency as CurrencyType)

      // Call onSelect with isManual=false for auto-detection
      onSelect(detectedCountry, config.currency as CurrencyType, false)
    }
  }, [loading, detectedCountry, initialCountry, onSelect])

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode)
    if (!country) return

    // Mark as manually selected
    hasManualSelectionRef.current = true

    setSelectedCountry(countryCode)
    setSelectedCurrency(country.currency)
    // Call onSelect with isManual=true for manual selection
    onSelect(countryCode, country.currency, true)
  }

  const handleModify = () => {
    hasManualSelectionRef.current = true
    setIsManualMode(true)
  }

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry)
  const currencySymbol = getCurrencySymbol(selectedCurrency)

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showAutoDetection && !isManualMode && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedCountryData?.flag || '🌍'}</span>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Détecté : {selectedCountryData?.name || detectedName}
              </p>
              <p className="text-xs text-blue-700">
                Devise : {selectedCurrency} {currencySymbol}
              </p>
            </div>
          </div>
          <button
            onClick={handleModify}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            Modifier
          </button>
        </div>
      )}

      {(isManualMode || !showAutoDetection) && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Pays / Country
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name} ({country.currency})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Devise :</span>
            <span className="font-medium text-gray-900">
              {selectedCurrency} {currencySymbol}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function getCurrencySymbol(currency: CurrencyType): string {
  const symbols: Record<CurrencyType, string> = {
    EUR: '€',
    USD: '$',
    CAD: 'CAD$',
    TND: 'TND',
    XOF: 'FCFA'
  }
  return symbols[currency] || currency
}
