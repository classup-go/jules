'use client'

import { useState, useEffect } from 'react'
import { getPaymentConfig, PaymentConfig } from './config'

interface GeoLocationResult {
  countryCode: string
  countryName: string
  city: string
  loading: boolean
  error: string | null
  paymentConfig: PaymentConfig
}

// Valeur par défaut - EUR comme devise de base (détection automatique bloquée)
const DEFAULT_COUNTRY = 'FR' // France = EUR

export function useGeoLocation(): GeoLocationResult {
  const [result, setResult] = useState<GeoLocationResult>({
    countryCode: DEFAULT_COUNTRY,
    countryName: 'France',
    city: '',
    loading: false, // Pas de loading puisque pas de détection
    error: null,
    paymentConfig: getPaymentConfig(DEFAULT_COUNTRY),
  })

  useEffect(() => {
    // DÉTECTION AUTOMATIQUE BLOQUÉE - Toujours utiliser EUR
    // Les utilisateurs choisissent leur devise dans leur profil
    setResult({
      countryCode: DEFAULT_COUNTRY,
      countryName: 'France',
      city: '',
      loading: false,
      error: null,
      paymentConfig: getPaymentConfig(DEFAULT_COUNTRY),
    })
    return

    /* DÉTECTION DÉSACTIVÉE
    const detectLocation = async () => {
      // En développement local, utiliser directement la valeur par défaut
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        setResult({
          countryCode: DEFAULT_COUNTRY,
          countryName: 'France',
          city: '',
          loading: false,
          error: null,
          paymentConfig: getPaymentConfig(DEFAULT_COUNTRY),
        })
        return
      }

      // CODE COMMENTÉ - Détection automatique désactivée
    */
  }, [])

  return result
}

function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    TN: 'Tunisie',
    FR: 'France',
    SN: 'Sénégal',
    CI: "Côte d'Ivoire",
    ML: 'Mali',
    BF: 'Burkina Faso',
    BJ: 'Bénin',
    TG: 'Togo',
    NE: 'Niger',
    CM: 'Cameroun',
    GA: 'Gabon',
    CG: 'Congo',
    DE: 'Allemagne',
    BE: 'Belgique',
    US: 'États-Unis',
    CA: 'Canada',
    GB: 'Royaume-Uni',
    MA: 'Maroc',
    DZ: 'Algérie',
    LY: 'Libye',
    EG: 'Égypte',
  }
  return countries[code] || code
}

// Hook pour forcer un pays spécifique (pour tests)
export function usePaymentConfig(forceCountry?: string): PaymentConfig {
  const { paymentConfig } = useGeoLocation()
  
  if (forceCountry) {
    return getPaymentConfig(forceCountry)
  }
  
  return paymentConfig
}

// Fonction utilitaire pour tester différents pays
export function getPaymentConfigForCountry(countryCode: string): PaymentConfig {
  return getPaymentConfig(countryCode)
}