import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const response = await fetch('https://developers.flouci.com/api/generate_payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apppublic': process.env.FLOUCI_APP_PUBLIC!,
        'appsecret': process.env.FLOUCI_APP_SECRET!,
      },
      body: JSON.stringify({
        app_token: process.env.FLOUCI_APP_TOKEN,
        app_secret: process.env.FLOUCI_APP_SECRET,
        amount: body.amount, // en millimes
        accept_card: 'true',
        session_timeout_secs: 1800,
        success_link: `${process.env.NEXT_PUBLIC_APP_URL}/classroom/${body.classroomId}?success=true`,
        fail_link: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?classroom=${body.classroomId}&error=payment_failed`,
        developer_tracking_id: `${body.classroomId}-${body.studentId}-${Date.now()}`,
      }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}