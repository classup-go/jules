// src/app/api/classes/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// API Classes avec prix des cours inclus
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/classes - Get all classrooms with course pricing info
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les classes AVEC les cours pour avoir les prix
    const { data: classrooms, error } = await supabase
      .from('classrooms')
      .select(`
        *,
        courses:courses(
          id,
          title,
          price,
          access_type,
          enrolled_count
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching classrooms:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrichir chaque classe avec les stats de prix
    const enrichedClassrooms = classrooms?.map(classroom => {
      const courses = classroom.courses || []
      const paidCourses = courses.filter((c: any) => 
        c.access_type === 'premium' && c.price && c.price > 0
      )
      
      let minPrice = 0
      let maxPrice = 0
      let hasPaidCourses = false
      
      if (paidCourses.length > 0) {
        const prices = paidCourses.map((c: any) => c.price)
        minPrice = Math.min(...prices)
        maxPrice = Math.max(...prices)
        hasPaidCourses = true
      }

      return {
        ...classroom,
        courses_count: courses.length,
        min_course_price: minPrice,
        max_course_price: maxPrice,
        has_paid_courses: hasPaidCourses,
        total_course_enrollments: courses.reduce((sum: number, c: any) => 
          sum + (c.enrolled_count || 0), 0
        )
      }
    }) || []

    return NextResponse.json(enrichedClassrooms)

  } catch (error: any) {
    console.error('Error in GET /api/classes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/classes - Create a new classroom
export async function POST(request: NextRequest) {
  console.log('\n=== POST /api/classes ===')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    console.log('✅ User:', user.id)

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }

    console.log('📦 Creating classroom:', body)

    // Validation
    if (!body.title || body.title.trim().length < 3) {
      return NextResponse.json({ error: 'Le titre doit contenir au moins 3 caractères' }, { status: 400 })
    }

    if (!body.subject) {
      return NextResponse.json({ error: 'La matière est requise' }, { status: 400 })
    }

    if (!body.level) {
      return NextResponse.json({ error: 'Le niveau est requis' }, { status: 400 })
    }

    // Build insert data
    const insertData: Record<string, any> = {
      teacher_id: user.id,
      title: body.title.trim(),
      subject: body.subject,
      level: body.level,
    }

    // Optional fields
    if (body.description) insertData.description = body.description
    if (typeof body.is_public === 'boolean') insertData.is_public = body.is_public

    console.log('📝 Inserting:', insertData)

    const { data, error } = await supabase
      .from('classrooms')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Insert error:', error)
      
      if (error.code === '42703') {
        // Try minimal insert
        const minimalData = {
          teacher_id: user.id,
          title: body.title.trim(),
          subject: body.subject,
          level: body.level,
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from('classrooms')
          .insert(minimalData)
          .select()
          .single()
          
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
        
        return NextResponse.json(retryData, { status: 201 })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Classroom created:', data.id)
    return NextResponse.json(data, { status: 201 })

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}