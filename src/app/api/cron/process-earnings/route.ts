/**
 * API Route: Process Earnings Cron
 * Endpoint for Vercel Cron to process pending earnings
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-earnings",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { processAvailableEarnings } from '@/../scripts/cron-process-available-earnings'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Run the earnings processing
    const result = await processAvailableEarnings()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      teachersNotified: result.teachersNotified,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
