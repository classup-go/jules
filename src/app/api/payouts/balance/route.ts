/**
 * API Route: Get Payout Balance
 * Calculates teacher's available, pending, and paid out balances
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PayoutBalance, EarningStatus } from '@/types/database'

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

    // Check if user is a teacher
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, currency')
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
        { error: 'Only teachers can view payout balance' },
        { status: 403 }
      )
    }

    // Get all earnings for this teacher
    const { data: earnings, error: earningsError } = await supabase
      .from('teacher_earnings')
      .select('net_amount, status, currency')
      .eq('teacher_id', user.id)

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError)
      return NextResponse.json(
        { error: 'Failed to fetch earnings' },
        { status: 500 }
      )
    }

    // Calculate balances by status
    const balance: PayoutBalance = {
      available: 0,
      pending: 0,
      paid_out: 0,
      currency: userData.currency
    }

    if (earnings) {
      earnings.forEach(earning => {
        const amount = Number(earning.net_amount)
        const status = earning.status as EarningStatus

        switch (status) {
          case 'available':
            balance.available += amount
            break
          case 'pending':
            balance.pending += amount
            break
          case 'paid_out':
            balance.paid_out += amount
            break
        }
      })
    }

    // Round to 2 decimal places
    balance.available = Math.round(balance.available * 100) / 100
    balance.pending = Math.round(balance.pending * 100) / 100
    balance.paid_out = Math.round(balance.paid_out * 100) / 100

    return NextResponse.json(balance)

  } catch (error) {
    console.error('Get payout balance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
