import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const response = await fetch('https://api.konnect.network/api/v2/payments/init-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.KONNECT_API_KEY!,
      },
      body: JSON.stringify({
        receiverWalletId: process.env.KONNECT_WALLET_ID,
        amount: body.amount, // en millimes
        token: 'TND',
        type: 'immediate',
        description: `Inscription: ${body.classroomTitle}`,
        acceptedPaymentMethods: ['bank_card', 'e-DINAR', 'wallet'],
        lifespan: 30, // minutes
        checkoutForm: true,
        addPaymentFeesToAmount: false,
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: body.studentEmail,
        orderId: `${body.classroomId}-${body.studentId}-${Date.now()}`,
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/konnect/webhook`,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/classroom/${body.classroomId}?success=true`,
        failUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?classroom=${body.classroomId}&error=payment_failed`,
      }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}