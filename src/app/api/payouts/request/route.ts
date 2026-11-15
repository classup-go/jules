/**
 * API Route: Request Payout
 * Teacher requests a payout of available earnings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStripePayout } from '@/lib/payment/stripe-connect'
import type { PayoutMethod } from '@/types/database'

export async function POST(request: NextRequest) {
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

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        role,
        currency,
        country,
        payout_enabled,
        payout_method,
        minimum_payout_threshold,
        stripe_connect_account_id,
        stripe_connect_payouts_enabled
      `)
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userData.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can request payouts' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payout amount' },
        { status: 400 }
      )
    }

    // Get available earnings
    const { data: availableEarnings, error: earningsError } = await supabase
      .from('teacher_earnings')
      .select('id, net_amount')
      .eq('teacher_id', user.id)
      .eq('status', 'available')

    if (earningsError) {
      console.error('Error fetching available earnings:', earningsError)
      return NextResponse.json(
        { error: 'Failed to fetch available earnings' },
        { status: 500 }
      )
    }

    // Calculate total available
    const totalAvailable = availableEarnings?.reduce(
      (sum, earning) => sum + Number(earning.net_amount),
      0
    ) || 0

    if (amount > totalAvailable) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${totalAvailable.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Check minimum threshold for manual payouts
    const payoutMethod = userData.payout_method as PayoutMethod
    const threshold = userData.minimum_payout_threshold

    if (payoutMethod !== 'stripe_connect' && threshold && amount < threshold) {
      return NextResponse.json(
        { error: `Minimum payout amount is ${threshold} ${userData.currency}` },
        { status: 400 }
      )
    }

    // Handle Stripe Connect payout
    if (payoutMethod === 'stripe_connect') {
      if (!userData.stripe_connect_payouts_enabled) {
        return NextResponse.json(
          { error: 'Please complete Stripe Connect onboarding first' },
          { status: 400 }
        )
      }

      // Create Stripe payout
      const payoutResult = await createStripePayout(
        user.id,
        amount,
        userData.currency
      )

      if (payoutResult.error) {
        return NextResponse.json(
          { error: payoutResult.error },
          { status: 400 }
        )
      }

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('teacher_payouts')
        .insert({
          teacher_id: user.id,
          amount,
          currency: userData.currency,
          payout_method: 'stripe_connect',
          stripe_payout_id: payoutResult.payoutId,
          stripe_connect_account_id: userData.stripe_connect_account_id,
          status: 'processing',
          earnings_count: availableEarnings?.length || 0
        })
        .select()
        .single()

      if (payoutError) {
        console.error('Error creating payout record:', payoutError)
        return NextResponse.json(
          { error: 'Failed to create payout record' },
          { status: 500 }
        )
      }

      // Update earnings status
      const earningIds = availableEarnings?.slice(0, Math.ceil(availableEarnings.length * (amount / totalAvailable))).map(e => e.id) || []

      await supabase
        .from('teacher_earnings')
        .update({
          status: 'paid_out',
          payout_id: payout.id
        })
        .in('id', earningIds)

      return NextResponse.json({
        success: true,
        payout_id: payout.id,
        amount,
        status: 'processing',
        method: 'stripe_connect'
      })
    }

    // Handle manual payout
    const { data: payout, error: payoutError } = await supabase
      .from('teacher_payouts')
      .insert({
        teacher_id: user.id,
        amount,
        currency: userData.currency,
        payout_method: 'manual',
        status: 'pending',
        earnings_count: availableEarnings?.length || 0,
        metadata: {
          country: userData.country
        }
      })
      .select()
      .single()

    if (payoutError) {
      console.error('Error creating manual payout:', payoutError)
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      payout_id: payout.id,
      amount,
      status: 'pending',
      method: 'manual',
      message: 'Your payout request has been submitted. It will be processed manually within 3-5 business days.'
    })

  } catch (error) {
    console.error('Request payout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
