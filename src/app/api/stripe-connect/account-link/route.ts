/**
 * API Route: Create Stripe Connect Account Link
 * Generates onboarding link for Stripe Connect
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAccountLink } from '@/lib/payment/stripe-connect'

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

    // Get user's Stripe Connect account ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!userData.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Please create one first.' },
        { status: 400 }
      )
    }

    // Get app URL from environment or construct it
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create account link
    const result = await createAccountLink(
      userData.stripe_connect_account_id,
      `${appUrl}/teacher/earnings?setup=refresh`,
      `${appUrl}/teacher/earnings?setup=success`
    )

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      url: result.url
    })

  } catch (error) {
    console.error('Create account link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
