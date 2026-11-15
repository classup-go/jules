/**
 * Cron Job: Process Available Earnings
 * Updates earnings status from 'pending' to 'available' after 14-day hold period
 * Should be run daily (e.g., via Vercel Cron or similar)
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface NotificationPayload {
  user_id: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
}

async function processAvailableEarnings() {
  console.log('Starting earnings processing...')

  try {
    // Find earnings that should become available (available_at <= now AND status = pending)
    const now = new Date().toISOString()

    const { data: readyEarnings, error: selectError } = await supabase
      .from('teacher_earnings')
      .select('id, teacher_id, net_amount, currency')
      .eq('status', 'pending')
      .lte('available_at', now)

    if (selectError) {
      console.error('Error fetching pending earnings:', selectError)
      return { success: false, error: selectError.message }
    }

    if (!readyEarnings || readyEarnings.length === 0) {
      console.log('No earnings ready to be processed')
      return { success: true, processed: 0 }
    }

    console.log(`Found ${readyEarnings.length} earnings ready to be made available`)

    // Update earnings status to 'available'
    const earningIds = readyEarnings.map(e => e.id)

    const { error: updateError } = await supabase
      .from('teacher_earnings')
      .update({ status: 'available' })
      .in('id', earningIds)

    if (updateError) {
      console.error('Error updating earnings status:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log(`Successfully updated ${earningIds.length} earnings to 'available'`)

    // Group by teacher to send notifications
    const teacherEarnings = new Map<string, { count: number; total: number; currency: string }>()

    readyEarnings.forEach(earning => {
      const existing = teacherEarnings.get(earning.teacher_id) || { count: 0, total: 0, currency: earning.currency }
      existing.count += 1
      existing.total += Number(earning.net_amount)
      teacherEarnings.set(earning.teacher_id, existing)
    })

    // Create notifications for affected teachers
    const notifications: NotificationPayload[] = []

    for (const [teacherId, data] of teacherEarnings) {
      notifications.push({
        user_id: teacherId,
        type: 'earnings',
        title: 'Nouveaux gains disponibles',
        message: `${data.total.toFixed(2)} ${data.currency} sont maintenant disponibles pour retrait (${data.count} transaction${data.count > 1 ? 's' : ''})`,
        link: '/teacher/earnings',
        read: false
      })
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error('Error creating notifications:', notifError)
      } else {
        console.log(`Created ${notifications.length} notifications`)
      }
    }

    return {
      success: true,
      processed: earningIds.length,
      teachersNotified: notifications.length
    }

  } catch (error: any) {
    console.error('Unexpected error processing earnings:', error)
    return { success: false, error: error.message }
  }
}

// Main execution
async function main() {
  console.log('=== Earnings Processing Cron Job ===')
  console.log(`Started at: ${new Date().toISOString()}`)

  const result = await processAvailableEarnings()

  console.log('Result:', result)
  console.log(`Completed at: ${new Date().toISOString()}`)
  console.log('=====================================')

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1)
}

// Run if called directly
if (require.main === module) {
  main()
}

export { processAvailableEarnings }
