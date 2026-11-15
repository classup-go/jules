/**
 * API Route: Currency Detection
 * Detects user's country and currency based on IP address
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentConfig } from '@/lib/payment/config'

export async function GET(request: NextRequest) {
  try {
    // Get IP address from headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // In development/localhost, return default
    if (ip === 'unknown' || ip === '::1' || ip.startsWith('127.')) {
      return NextResponse.json({
        countryCode: 'FR',
        countryName: 'France',
        currency: 'EUR',
        paymentConfig: getPaymentConfig('FR')
      })
    }

    // Try to detect location via ipapi.co
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Jules Platform Currency Detection'
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const countryCode = data.country_code || 'FR'
        const paymentConfig = getPaymentConfig(countryCode)

        return NextResponse.json({
          countryCode,
          countryName: data.country_name || getCountryName(countryCode),
          currency: paymentConfig.currency,
          paymentConfig
        })
      }
    } catch (error) {
      console.error('IP detection failed:', error)
    }

    // Fallback to default (France/EUR)
    return NextResponse.json({
      countryCode: 'FR',
      countryName: 'France',
      currency: 'EUR',
      paymentConfig: getPaymentConfig('FR')
    })

  } catch (error) {
    console.error('Currency detection error:', error)
    return NextResponse.json(
      { error: 'Failed to detect currency' },
      { status: 500 }
    )
  }
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
    ES: 'Espagne',
    IT: 'Italie',
    PT: 'Portugal',
    CH: 'Suisse',
    AT: 'Autriche',
    NL: 'Pays-Bas'
  }
  return countries[code] || code
}
