import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/classrooms - Create a new classroom
export async function POST(request: NextRequest) {
  console.log('\n=== POST /api/classrooms ===')

  try {
    const supabase = await createClient()

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    console.log('✅ User authenticated:', user.id)

    // 2. Parse body
    let body
    try {
      body = await request.json()
      console.log('📦 Request body:', JSON.stringify(body, null, 2))
    } catch (e) {
      console.error('❌ JSON parse error:', e)
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }

    // 3. Validation
    if (!body.title || body.title.trim().length < 5) {
      return NextResponse.json({ error: 'Le titre doit contenir au moins 5 caractères' }, { status: 400 })
    }

    if (!body.subject) {
      return NextResponse.json({ error: 'La matière est requise' }, { status: 400 })
    }

    if (!body.level) {
      return NextResponse.json({ error: 'Le niveau est requis' }, { status: 400 })
    }

    // 4. Build insert data
    const insertData: Record<string, any> = {
      teacher_id: user.id,
      title: body.title.trim(),
      subject: body.subject,
      level: body.level,
      is_public: body.is_public === true, // Default to false
      description: body.description || '',
      enrolled_count: 0,
    }

    console.log('📝 Insert data:', JSON.stringify(insertData, null, 2))

    // 5. Insert into database
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .insert(insertData)
      .select()
      .single()

    if (classroomError) {
      console.error('❌ Classroom insert error:', classroomError)

      // Handle specific errors
      if (classroomError.code === '42P01') {
        return NextResponse.json({
          error: 'La table classrooms n\'existe pas',
          details: 'La table classrooms doit être créée dans Supabase',
          code: classroomError.code
        }, { status: 500 })
      }

      if (classroomError.code === '42501') {
        return NextResponse.json({
          error: 'Permissions insuffisantes (RLS)',
          details: 'Les politiques RLS bloquent l\'insertion',
          code: classroomError.code
        }, { status: 403 })
      }

      return NextResponse.json({
        error: 'Erreur lors de la création de la classe',
        details: classroomError.message,
        code: classroomError.code
      }, { status: 500 })
    }

    console.log('✅ Classroom created:', classroom.id)
    return NextResponse.json(classroom, { status: 201 })

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      error: error.message || 'Erreur serveur inattendue'
    }, { status: 500 })
  }
}

// GET /api/classrooms - Get classrooms for the authenticated teacher
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching classrooms:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
