/**
 * Platform Fee Calculation Utilities
 * Handles calculation of platform commissions on teacher earnings
 */

import { createClient } from '@/lib/supabase/server'
import type { FeeBreakdown, PlatformFee, CurrencyType } from '@/types/database'

/**
 * Get active platform fee configuration
 */
export async function getActivePlatformFee(appliesTo: string = 'all'): Promise<PlatformFee | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('platform_fees')
    .select('*')
    .eq('is_active', true)
    .eq('applies_to', appliesTo)
    .lte('effective_from', new Date().toISOString())
    .or('effective_until.is.null,effective_until.gte.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching platform fee:', error)
    return null
  }

  return data
}

/**
 * Calculate platform fee breakdown from gross amount
 */
export async function calculatePlatformFee(
  grossAmount: number,
  currency: CurrencyType = 'EUR',
  appliesTo: string = 'all'
): Promise<FeeBreakdown> {
  const platformFee = await getActivePlatformFee(appliesTo)

  if (!platformFee) {
    // Default to 15% if no active fee is found
    const defaultPercentage = 15.0
    const platformFeeAmount = Math.round((grossAmount * defaultPercentage / 100) * 100) / 100
    const netAmount = Math.round((grossAmount - platformFeeAmount) * 100) / 100

    return {
      grossAmount,
      platformFeeAmount,
      platformFeePercentage: defaultPercentage,
      netAmount,
      currency
    }
  }

  let platformFeeAmount = 0

  switch (platformFee.fee_type) {
    case 'percentage':
      if (platformFee.percentage) {
        platformFeeAmount = grossAmount * (platformFee.percentage / 100)
      }
      break

    case 'flat':
      if (platformFee.flat_amount) {
        platformFeeAmount = platformFee.flat_amount
      }
      break

    case 'hybrid':
      if (platformFee.percentage && platformFee.flat_amount) {
        platformFeeAmount = (grossAmount * (platformFee.percentage / 100)) + platformFee.flat_amount
      }
      break
  }

  // Round to 2 decimal places
  platformFeeAmount = Math.round(platformFeeAmount * 100) / 100
  const netAmount = Math.round((grossAmount - platformFeeAmount) * 100) / 100

  return {
    grossAmount,
    platformFeeAmount,
    platformFeePercentage: platformFee.percentage || 0,
    netAmount,
    currency
  }
}

/**
 * Calculate net amount for teacher (gross - platform fee)
 */
export async function calculateTeacherNetAmount(
  grossAmount: number,
  currency: CurrencyType = 'EUR'
): Promise<number> {
  const breakdown = await calculatePlatformFee(grossAmount, currency)
  return breakdown.netAmount
}

/**
 * Validate fee breakdown consistency
 */
export function validateFeeBreakdown(breakdown: FeeBreakdown): boolean {
  const { grossAmount, platformFeeAmount, netAmount } = breakdown

  // Check that gross = platform fee + net (with small floating point tolerance)
  const calculatedGross = platformFeeAmount + netAmount
  const tolerance = 0.01 // 1 cent tolerance

  return Math.abs(grossAmount - calculatedGross) <= tolerance
}

/**
 * Format fee breakdown for display
 */
export function formatFeeBreakdown(breakdown: FeeBreakdown): {
  gross: string
  fee: string
  net: string
  percentage: string
} {
  const currencySymbol = getCurrencySymbol(breakdown.currency)

  return {
    gross: `${breakdown.grossAmount.toFixed(2)} ${currencySymbol}`,
    fee: `${breakdown.platformFeeAmount.toFixed(2)} ${currencySymbol}`,
    net: `${breakdown.netAmount.toFixed(2)} ${currencySymbol}`,
    percentage: `${breakdown.platformFeePercentage.toFixed(1)}%`
  }
}

/**
 * Get currency symbol
 */
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
