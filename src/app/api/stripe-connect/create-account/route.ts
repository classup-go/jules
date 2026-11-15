/**
 * API Route: Create Stripe Connect Account
 * Creates a Stripe Connect Express account for a teacher
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStripeConnectAccount } from '@/lib/payment/stripe-connect'

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

    // Check if user is a teacher
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, country, email, stripe_connect_account_id')
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
        { error: 'Only teachers can create Stripe Connect accounts' },
        { status: 403 }
      )
    }

    // Check if account already exists
    if (userData.stripe_connect_account_id) {
      return NextResponse.json({
        success: true,
        accountId: userData.stripe_connect_account_id,
        alreadyExists: true
      })
    }

    // Validate country
    if (!userData.country) {
      return NextResponse.json(
        { error: 'Please set your country in profile settings first' },
        { status: 400 }
      )
    }

    // Create Stripe Connect account
    const result = await createStripeConnectAccount(
      user.id,
      userData.email,
      userData.country
    )

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      accountId: result.accountId
    })

  } catch (error) {
    console.error('Create Stripe Connect account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
