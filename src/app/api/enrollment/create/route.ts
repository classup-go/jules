import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      classroom_id,
      amount_eur,
      amount_local,
      currency,
      exchange_rate,
      payment_method,
      teacher_id
    } = body

    // Validate required fields
    if (!classroom_id || !amount_eur || !currency || !teacher_id) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    // Create service role client (has permissions to insert transactions)
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user is already enrolled
    const { data: existingEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('classroom_id', classroom_id)
      .eq('student_id', user.id)
      .single()

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Déjà inscrit à ce cours', already_enrolled: true },
        { status: 400 }
      )
    }

    // Get classroom details
    const { data: classroom } = await supabaseAdmin
      .from('classrooms')
      .select('title, enrolled_count')
      .eq('id', classroom_id)
      .single()

    if (!classroom) {
      return NextResponse.json(
        { error: 'Cours introuvable' },
        { status: 404 }
      )
    }

    // Determine payment provider
    let payment_provider = 'stripe'
    if (payment_method.includes('konnect')) payment_provider = 'konnect'
    else if (payment_method.includes('flouci')) payment_provider = 'flouci'
    else if (payment_method.includes('cinetpay')) payment_provider = 'cinetpay'

    // Create transaction (service role has permission)
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        payment_type: 'course_enrollment',
        student_id: user.id,
        teacher_id: teacher_id,
        amount_eur: amount_eur,
        amount_local: amount_local,
        currency: currency,
        exchange_rate: exchange_rate,
        payment_provider: payment_provider,
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          classroom_id: classroom_id,
          classroom_title: classroom.title,
          payment_method: payment_method
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la transaction', details: transactionError },
        { status: 500 }
      )
    }

    // Create enrollment with payment reference
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        classroom_id: classroom_id,
        student_id: user.id,
        payment_id: transaction.id,
        payment_required: true,
        payment_completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (enrollError) {
      console.error('Enrollment creation error:', enrollError)
      // Rollback transaction if enrollment fails
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id)

      return NextResponse.json(
        { error: 'Erreur lors de l\'inscription', details: enrollError },
        { status: 500 }
      )
    }

    // Update enrolled count
    await supabaseAdmin
      .from('classrooms')
      .update({ enrolled_count: (classroom.enrolled_count || 0) + 1 })
      .eq('id', classroom_id)

    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      enrollment_id: enrollment.id
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: error },
      { status: 500 }
    )
  }
}
