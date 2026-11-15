// src/app/api/chapters/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/chapters - Create a new chapter
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Creating chapter with data:', body)

    // Validation
    if (!body.course_id) {
      return NextResponse.json({ error: 'course_id est requis' }, { status: 400 })
    }

    if (!body.title || body.title.trim().length < 1) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
    }

    // Verify the course belongs to this user (via classroom)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        classroom:classrooms!inner(teacher_id)
      `)
      .eq('id', body.course_id)
      .single()

    if (courseError || !course) {
      console.error('Course not found:', courseError)
      return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
    }

    // Check ownership
    const classroom = course.classroom as any
    if (classroom?.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas le propriétaire de ce cours' }, { status: 403 })
    }

    // Handle initial_content from wizard
    let content = body.content || ''
    let contentType = body.content_type || 'text'
    let videoUrl = body.video_url || null

    if (body.initial_content) {
      contentType = body.initial_content.type || 'text'
      content = body.initial_content.content || ''
      if (contentType === 'video') {
        videoUrl = body.initial_content.content || body.initial_content.video_url
        content = '' // Video URL goes in video_url field
      }
    }

    // Build insert data
    const insertData: Record<string, any> = {
      course_id: body.course_id,
      title: body.title.trim(),
      order_index: body.order_index ?? 0,
    }

    // Add optional fields
    if (content) insertData.content = content
    if (contentType) insertData.content_type = contentType
    if (videoUrl) insertData.video_url = videoUrl
    if (body.description) insertData.description = body.description
    if (body.duration_minutes) insertData.duration_minutes = body.duration_minutes

    console.log('Inserting chapter:', insertData)

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert(insertData)
      .select()
      .single()

    if (chapterError) {
      console.error('Error creating chapter:', chapterError)
      
      // Try minimal insert if column error
      if (chapterError.code === '42703') {
        const minimalData = {
          course_id: body.course_id,
          title: body.title.trim(),
          order_index: body.order_index ?? 0,
        }
        
        const { data: retryChapter, error: retryError } = await supabase
          .from('chapters')
          .insert(minimalData)
          .select()
          .single()
          
        if (retryError) {
          return NextResponse.json({
            error: 'Erreur lors de la création du chapitre',
            details: retryError.message
          }, { status: 500 })
        }
        
        return NextResponse.json(retryChapter, { status: 201 })
      }

      return NextResponse.json({
        error: 'Erreur lors de la création du chapitre',
        details: chapterError.message
      }, { status: 500 })
    }

    console.log('Chapter created successfully:', chapter)
    return NextResponse.json(chapter, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/chapters:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET /api/chapters - Get chapters for a course
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')

    if (!courseId) {
      return NextResponse.json({ error: 'course_id est requis' }, { status: 400 })
    }

    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des chapitres' },
        { status: 500 }
      )
    }

    return NextResponse.json(chapters || [], { status: 200 })

  } catch (error: any) {
    console.error('Error in GET /api/chapters:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}