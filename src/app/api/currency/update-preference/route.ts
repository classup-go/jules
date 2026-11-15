/**
 * API Route: Update Currency Preference
 * Updates user's country and currency preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CurrencyType } from '@/types/database'

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

    // Parse request body
    const body = await request.json()
    const { country, currency, manuallySet } = body

    // Validate inputs
    if (!country || !currency) {
      return NextResponse.json(
        { error: 'Country and currency are required' },
        { status: 400 }
      )
    }

    // Validate currency type
    const validCurrencies: CurrencyType[] = ['EUR', 'TND', 'XOF', 'USD', 'CAD']
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency type' },
        { status: 400 }
      )
    }

    // Update user preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({
        country,
        currency,
        country_manually_set: manuallySet === true,
        country_auto_detected: manuallySet !== true
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating currency preference:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preference' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      country,
      currency
    })

  } catch (error) {
    console.error('Currency preference update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
