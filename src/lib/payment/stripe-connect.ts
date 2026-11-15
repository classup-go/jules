/**
 * Stripe Connect Utilities
 * Handles Stripe Connect Express account creation, onboarding, and payouts
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import type { CurrencyType, PayoutMethod } from '@/types/database'
import { STRIPE_API_VERSION } from '@/lib/stripe-config'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION
})

/**
 * Countries supported by Stripe Connect
 * https://stripe.com/docs/connect/cross-border-payouts
 */
export const STRIPE_CONNECT_SUPPORTED_COUNTRIES = [
  'AT', 'AU', 'BE', 'BG', 'CA', 'CH', 'CY', 'CZ', 'DE', 'DK',
  'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HK', 'HR', 'HU', 'IE',
  'IT', 'JP', 'LT', 'LU', 'LV', 'MT', 'MX', 'NL', 'NO', 'NZ',
  'PL', 'PT', 'RO', 'SE', 'SG', 'SI', 'SK', 'US'
]

/**
 * Check if a country supports Stripe Connect
 */
export function isStripeConnectSupported(countryCode: string): boolean {
  return STRIPE_CONNECT_SUPPORTED_COUNTRIES.includes(countryCode.toUpperCase())
}

/**
 * Create a Stripe Connect Express account
 */
export async function createStripeConnectAccount(
  userId: string,
  email: string,
  country: string
): Promise<{ accountId: string; error?: string }> {
  try {
    // Check if country is supported
    if (!isStripeConnectSupported(country)) {
      return {
        accountId: '',
        error: `Stripe Connect is not available in ${country}. Please use manual payout method.`
      }
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country.toUpperCase(),
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        user_id: userId
      }
    })

    // Update user in database
    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('users')
      .update({
        stripe_connect_account_id: account.id,
        payout_method: 'stripe_connect' as PayoutMethod,
        payout_country: country
      })
      .eq('id', userId)

    if (dbError) {
      console.error('Error updating user with Stripe account:', dbError)
      return { accountId: '', error: 'Failed to save Stripe account to database' }
    }

    return { accountId: account.id }
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error)
    return { accountId: '', error: error.message }
  }
}

/**
 * Create Stripe Connect account link for onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<{ url: string; error?: string }> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    })

    return { url: accountLink.url }
  } catch (error: any) {
    console.error('Error creating account link:', error)
    return { url: '', error: error.message }
  }
}

/**
 * Get Stripe Connect account status
 */
export async function getAccountStatus(accountId: string): Promise<{
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements: any
  error?: string
}> {
  try {
    const account = await stripe.accounts.retrieve(accountId)

    return {
      charges_enabled: account.charges_enabled || false,
      payouts_enabled: account.payouts_enabled || false,
      requirements: account.requirements
    }
  } catch (error: any) {
    console.error('Error retrieving account status:', error)
    return {
      charges_enabled: false,
      payouts_enabled: false,
      requirements: null,
      error: error.message
    }
  }
}

/**
 * Create a payout (transfer) to teacher's Stripe Connect account
 */
export async function createStripePayout(
  teacherId: string,
  amount: number,
  currency: CurrencyType
): Promise<{
  payoutId?: string
  transferId?: string
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get teacher's Stripe Connect account
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('stripe_connect_account_id, currency, stripe_connect_payouts_enabled')
      .eq('id', teacherId)
      .single()

    if (teacherError || !teacher) {
      return { error: 'Teacher not found' }
    }

    if (!teacher.stripe_connect_account_id) {
      return { error: 'Stripe Connect not configured for this teacher' }
    }

    if (!teacher.stripe_connect_payouts_enabled) {
      return { error: 'Stripe Connect payouts not enabled yet. Please complete onboarding.' }
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100)

    // Create payout via Stripe
    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          teacher_id: teacherId
        }
      },
      {
        stripeAccount: teacher.stripe_connect_account_id
      }
    )

    return {
      payoutId: payout.id,
      transferId: payout.id // In Stripe, payout ID can be used as transfer reference
    }
  } catch (error: any) {
    console.error('Error creating Stripe payout:', error)
    return { error: error.message }
  }
}

/**
 * Update user with Stripe Connect account status from webhook
 */
export async function updateAccountStatusFromWebhook(
  accountId: string,
  charges_enabled: boolean,
  payouts_enabled: boolean
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase
      .from('users')
      .update({
        stripe_connect_charges_enabled: charges_enabled,
        stripe_connect_payouts_enabled: payouts_enabled,
        stripe_connect_onboarding_completed: charges_enabled && payouts_enabled,
        payout_enabled: payouts_enabled
      })
      .eq('stripe_connect_account_id', accountId)
  } catch (error) {
    console.error('Error updating account status:', error)
  }
}

/**
 * Disconnect Stripe Connect account
 */
export async function disconnectStripeConnect(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current account ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_connect_account_id')
      .eq('id', userId)
      .single()

    if (userError || !user?.stripe_connect_account_id) {
      return { success: false, error: 'No Stripe Connect account found' }
    }

    // Delete Stripe account (optional - you might want to just deactivate instead)
    // await stripe.accounts.del(user.stripe_connect_account_id)

    // Clear Stripe Connect data from database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_connect_account_id: null,
        stripe_connect_onboarding_completed: false,
        stripe_connect_charges_enabled: false,
        stripe_connect_payouts_enabled: false,
        payout_enabled: false,
        payout_method: null,
        stripe_connect_metadata: {}
      })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error disconnecting Stripe Connect:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get Stripe Connect dashboard login link
 */
export async function createDashboardLink(accountId: string): Promise<{ url: string; error?: string }> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId)
    return { url: loginLink.url }
  } catch (error: any) {
    console.error('Error creating dashboard link:', error)
    return { url: '', error: error.message }
  }
}
