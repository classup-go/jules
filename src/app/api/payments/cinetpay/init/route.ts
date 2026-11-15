import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const transactionId = `CP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount: body.amount,
        currency: body.currency || 'XOF',
        description: `Inscription: ${body.classroomTitle}`,
        customer_email: body.studentEmail,
        customer_name: body.studentId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/classroom/${body.classroomId}?success=true`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cinetpay/webhook`,
        channels: body.channel || 'ALL',
      }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}