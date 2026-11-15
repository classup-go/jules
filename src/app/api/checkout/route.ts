import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, classroomId, currency = 'EUR', exchangeRate = 1 } = body

    // Validation des devises supportées
    const validCurrencies = ['EUR', 'TND', 'USD', 'XOF', 'XAF']
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json({ error: 'Devise non supportée' }, { status: 400 })
    }

    let itemData: any
    let itemPrice: number
    let itemTitle: string
    let teacherId: string
    let itemClassroomId: string | null = null

    // Prioritize course-level checkout
    if (courseId) {
      // Get course details with classroom and teacher
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          classrooms!inner (
            id,
            title,
            teacher_id,
            users!classrooms_teacher_id_fkey (
              id,
              display_name,
              email
            )
          )
        `)
        .eq('id', courseId)
        .single()

      if (courseError) {
        console.error('Error fetching course:', courseError)
        return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
      }

      if (!course) {
        return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
      }

      if (course.access_type === 'free' || course.price <= 0) {
        return NextResponse.json({ error: 'Ce cours est gratuit' }, { status: 400 })
      }

      // Vérifier que l'étudiant n'est pas déjà inscrit à ce cours
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .single()

      if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
          return NextResponse.json(
            { error: 'Vous êtes déjà inscrit à ce cours' },
            { status: 409 }
          )
        }
      }

      // Transform data structure
      const transformedCourse = {
        ...course,
        teacher: course.classrooms?.users,
        teacher_id: course.classrooms?.teacher_id,
      }

      itemData = transformedCourse
      itemPrice = course.price
      itemTitle = course.title
      teacherId = course.classrooms?.teacher_id || ''
      itemClassroomId = course.classroom_id
    } else if (classroomId) {
      // Backward compatibility: classroom-level checkout
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('*, teacher:users(*)')
        .eq('id', classroomId)
        .single()

      if (!classroom) {
        return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
      }

      if (classroom.price <= 0) {
        return NextResponse.json({ error: 'Ce cours est gratuit' }, { status: 400 })
      }

      // Vérifier que l'étudiant n'est pas déjà inscrit
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('classroom_id', classroomId)
        .eq('student_id', user.id)
        .single()

      if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
          return NextResponse.json(
            { error: 'Vous êtes déjà inscrit à ce cours' },
            { status: 409 }
          )
        }
      }

      itemData = classroom
      itemPrice = classroom.price
      itemTitle = classroom.title
      teacherId = classroom.teacher_id
      itemClassroomId = classroomId
    } else {
      return NextResponse.json({ error: 'courseId ou classroomId requis' }, { status: 400 })
    }

    // Conversion depuis EUR (devise de base) vers devise locale
    const localPrice = itemPrice * exchangeRate

    // Arrondir selon la devise
    let roundedPrice = localPrice
    if (currency === 'XOF' || currency === 'XAF') {
      roundedPrice = Math.ceil(localPrice / 25) * 25
    } else if (currency === 'TND') {
      roundedPrice = Math.ceil(localPrice * 2) / 2
    } else {
      roundedPrice = Math.round(localPrice * 100) / 100
    }

    // Calculer le montant Stripe (en centimes/millimes)
    let stripeAmount: number
    if (currency === 'TND') {
      stripeAmount = Math.round(roundedPrice * 1000) // Millimes
    } else if (currency === 'XOF' || currency === 'XAF') {
      stripeAmount = Math.round(roundedPrice) // Pas de subdivision
    } else {
      stripeAmount = Math.round(roundedPrice * 100) // Centimes
    }

    // Create Stripe checkout session
    const successUrl = courseId
      ? `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?course_id=${courseId}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?classroom_id=${classroomId}`

    const cancelUrl = courseId
      ? `${process.env.NEXT_PUBLIC_APP_URL}/classroom/${itemClassroomId}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/classroom/${classroomId}`

    const metadata: Record<string, string> = {
      payment_type: 'course_enrollment',
      student_id: user.id,
      teacher_id: teacherId,
      amount_eur: itemPrice.toString(),
      amount_local: roundedPrice.toString(),
      currency: currency,
      exchange_rate: exchangeRate.toString(),
    }

    // Add course_id or classroom_id to metadata
    if (courseId) {
      metadata.course_id = courseId
      metadata.classroom_id = itemClassroomId || ''
    } else {
      metadata.classroom_id = classroomId
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: itemTitle,
              description: `Cours par ${itemData.teacher?.display_name || 'Professeur'}`,
              images: itemData.image_url ? [itemData.image_url] : [],
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: 'Erreur de paiement' }, { status: 500 })
  }
}