import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount, // en centimes
      currency: body.currency,
      payment_method_types: body.paymentMethodType === 'sepa_debit' ? ['sepa_debit'] : ['card'],
      metadata: {
        classroomId: body.classroomId,
        studentId: body.studentId,
        teacherId: body.teacherId,
      },
      receipt_email: body.studentEmail,
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}