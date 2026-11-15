/**
 * API Route: Stripe Connect Webhooks
 * Handles webhooks for Stripe Connect events
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { updateAccountStatusFromWebhook } from '@/lib/payment/stripe-connect'
import { STRIPE_API_VERSION } from '@/lib/stripe-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION
})

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!

if (!webhookSecret || webhookSecret === 'whsec_xxx' || webhookSecret.includes('VOTRE_')) {
  console.error('❌ STRIPE_CONNECT_WEBHOOK_SECRET non configuré correctement')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout
        await handlePayoutPaid(payout)
        break
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout
        await handlePayoutFailed(payout)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Stripe Connect webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    await updateAccountStatusFromWebhook(
      account.id,
      account.charges_enabled || false,
      account.payouts_enabled || false
    )

    console.log(`Account ${account.id} updated - charges: ${account.charges_enabled}, payouts: ${account.payouts_enabled}`)
  } catch (error) {
    console.error('Error handling account.updated:', error)
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  try {
    const supabase = await createClient()

    // Update payout status in database
    const { error } = await supabase
      .from('teacher_payouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('stripe_payout_id', payout.id)

    if (error) {
      console.error('Error updating payout status:', error)
    } else {
      console.log(`Payout ${payout.id} marked as completed`)
    }
  } catch (error) {
    console.error('Error handling payout.paid:', error)
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    const supabase = await createClient()

    // Update payout status in database
    const { error } = await supabase
      .from('teacher_payouts')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: payout.failure_message || 'Unknown error',
        failure_code: payout.failure_code || null
      })
      .eq('stripe_payout_id', payout.id)

    if (error) {
      console.error('Error updating payout status:', error)
    } else {
      console.log(`Payout ${payout.id} marked as failed: ${payout.failure_message}`)
    }
  } catch (error) {
    console.error('Error handling payout.failed:', error)
  }
}
