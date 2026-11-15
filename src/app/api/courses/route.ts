// src/app/api/courses/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ COPIER CE FICHIER DANS: src/app/api/courses/route.ts
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/courses - Create a new course
export async function POST(request: NextRequest) {
  console.log('\n=== POST /api/courses ===')
  
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
    if (!body.classroom_id) {
      return NextResponse.json({ error: 'classroom_id est requis' }, { status: 400 })
    }

    if (!body.title || body.title.trim().length < 3) {
      return NextResponse.json({ error: 'Le titre doit contenir au moins 3 caractères' }, { status: 400 })
    }

    // 4. Verify classroom exists and belongs to user
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id, teacher_id, subject, level')
      .eq('id', body.classroom_id)
      .single()

    if (classroomError) {
      console.error('❌ Classroom lookup error:', classroomError)
      return NextResponse.json({ 
        error: 'Classe non trouvée', 
        details: classroomError.message,
        code: classroomError.code
      }, { status: 404 })
    }

    if (classroom.teacher_id !== user.id) {
      console.error('❌ User is not classroom owner')
      return NextResponse.json({ error: 'Vous n\'êtes pas le propriétaire de cette classe' }, { status: 403 })
    }
    console.log('✅ Classroom verified:', classroom.id)

    // 5. Build SETTINGS object (REQUIRED for CHECK constraints)
    // Determine duration_type based on duration values
    const durMin = Number(body.duration_minutes) || 0
    const durHours = Number(body.duration_hours) || 0
    const durWeeks = Number(body.duration_weeks) || 0
    const totalMinutes = durMin + (durHours * 60) + (durWeeks * 7 * 24 * 60)

    let duration_type = 'moyen'
    if (totalMinutes > 0) {
      if (totalMinutes <= 60) duration_type = 'court'      // ≤ 1 hour
      else if (totalMinutes <= 300) duration_type = 'moyen' // ≤ 5 hours
      else duration_type = 'long'                            // > 5 hours
    }

    const settings: Record<string, any> = {
      // Determine access_mode based on access_type
      access_mode: body.access_type === 'premium' ? 'acces_individuel' : 'classe_privee',

      // Duration type
      duration_type: duration_type,

      // Default pacing_type
      pacing_type: body.pacing_type || 'libre',
    }

    // Allow override from body.settings if provided
    if (body.settings) {
      if (body.settings.access_mode) settings.access_mode = body.settings.access_mode
      if (body.settings.duration_type) settings.duration_type = body.settings.duration_type
      if (body.settings.pacing_type) settings.pacing_type = body.settings.pacing_type
    }

    console.log('⚙️ Settings:', settings)

    // 6. Build insert data
    const insertData: Record<string, any> = {
      classroom_id: body.classroom_id,
      title: body.title.trim(),
      settings: settings, // ← REQUIRED for CHECK constraints
    }

    // Optional fields - add only if provided
    if (body.description) insertData.description = body.description
    if (body.subject || classroom.subject) insertData.subject = body.subject || classroom.subject
    if (body.level || classroom.level) insertData.level = body.level || classroom.level
    if (body.access_type) insertData.access_type = body.access_type
    if (typeof body.price === 'number') insertData.price = body.price
    if (typeof body.is_published === 'boolean') insertData.is_published = body.is_published

    // Array fields
    if (Array.isArray(body.learning_objectives)) {
      const filtered = body.learning_objectives.filter((o: any) => o && typeof o === 'string' && o.trim())
      if (filtered.length > 0) insertData.learning_objectives = filtered
    }

    if (Array.isArray(body.prerequisites)) {
      const filtered = body.prerequisites.filter((p: any) => p && typeof p === 'string' && p.trim())
      if (filtered.length > 0) insertData.prerequisites = filtered
    }

    // Duration fields - only if valid numbers
    if (!isNaN(durMin) && durMin > 0) insertData.duration_minutes = durMin
    if (!isNaN(durHours) && durHours > 0) insertData.duration_hours = durHours
    if (!isNaN(durWeeks) && durWeeks > 0) insertData.duration_weeks = durWeeks

    console.log('📝 Insert data:', JSON.stringify(insertData, null, 2))

    // 7. Insert into database
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert(insertData)
      .select()
      .single()

    if (courseError) {
      console.error('❌ Course insert error:', courseError)
      
      // Handle specific errors
      if (courseError.code === '42P01') {
        return NextResponse.json({
          error: 'La table courses n\'existe pas',
          details: 'Exécutez CREATE-COURSES-TABLE.sql dans Supabase SQL Editor',
          code: courseError.code
        }, { status: 500 })
      }
      
      if (courseError.code === '42703') {
        // Column doesn't exist - try minimal insert
        console.log('⚠️ Column error, trying minimal insert...')
        
        const minimalData = {
          classroom_id: body.classroom_id,
          title: body.title.trim(),
        }
        
        const { data: retryCourse, error: retryError } = await supabase
          .from('courses')
          .insert(minimalData)
          .select()
          .single()
          
        if (retryError) {
          console.error('❌ Minimal insert failed:', retryError)
          return NextResponse.json({
            error: 'Erreur lors de la création du cours',
            details: retryError.message,
            code: retryError.code
          }, { status: 500 })
        }
        
        console.log('✅ Course created (minimal):', retryCourse.id)
        return NextResponse.json(retryCourse, { status: 201 })
      }

      if (courseError.code === '42501') {
        return NextResponse.json({
          error: 'Permissions insuffisantes (RLS)',
          details: 'Les politiques RLS bloquent l\'insertion. Exécutez CREATE-COURSES-TABLE.sql',
          code: courseError.code
        }, { status: 403 })
      }

      return NextResponse.json({
        error: 'Erreur lors de la création du cours',
        details: courseError.message,
        code: courseError.code
      }, { status: 500 })
    }

    console.log('✅ Course created:', course.id)
    return NextResponse.json(course, { status: 201 })

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      error: error.message || 'Erreur serveur inattendue'
    }, { status: 500 })
  }
}

// GET /api/courses - Get courses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classroomId = searchParams.get('classroom_id')

    let query = supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (classroomId) {
      query = query.eq('classroom_id', classroomId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}