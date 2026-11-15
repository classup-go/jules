/**
 * API Route: Payout History
 * Retrieves teacher's payout history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get query parameters for pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get payouts
    const { data: payouts, error: payoutsError, count } = await supabase
      .from('teacher_payouts')
      .select('*', { count: 'exact' })
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError)
      return NextResponse.json(
        { error: 'Failed to fetch payout history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      payouts: payouts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Get payout history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
