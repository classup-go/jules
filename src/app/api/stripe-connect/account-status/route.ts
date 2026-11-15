/**
 * API Route: Get Stripe Connect Account Status
 * Retrieves the current status of teacher's Stripe Connect account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccountStatus } from '@/lib/payment/stripe-connect'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's Stripe Connect account ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!userData.stripe_connect_account_id) {
      return NextResponse.json({
        connected: false,
        charges_enabled: false,
        payouts_enabled: false
      })
    }

    // Get fresh status from Stripe
    const status = await getAccountStatus(userData.stripe_connect_account_id)

    if (status.error) {
      return NextResponse.json(
        { error: status.error },
        { status: 400 }
      )
    }

    // Update database if status changed
    if (
      status.charges_enabled !== userData.stripe_connect_charges_enabled ||
      status.payouts_enabled !== userData.stripe_connect_payouts_enabled
    ) {
      await supabase
        .from('users')
        .update({
          stripe_connect_charges_enabled: status.charges_enabled,
          stripe_connect_payouts_enabled: status.payouts_enabled,
          stripe_connect_onboarding_completed: status.charges_enabled && status.payouts_enabled,
          payout_enabled: status.payouts_enabled
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      connected: true,
      charges_enabled: status.charges_enabled,
      payouts_enabled: status.payouts_enabled,
      requirements: status.requirements
    })

  } catch (error) {
    console.error('Get account status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
