/**
 * API Route: Disconnect Stripe Connect Account
 * Disconnects teacher's Stripe Connect account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectStripeConnect } from '@/lib/payment/stripe-connect'

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

    // Disconnect Stripe Connect
    const result = await disconnectStripeConnect(user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to disconnect' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe Connect account disconnected successfully'
    })

  } catch (error) {
    console.error('Disconnect Stripe Connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
