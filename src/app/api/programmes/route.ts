import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateProgrammeInput } from '@/types/programme'

/**
 * GET /api/programmes
 * Liste tous les programmes (avec filtres optionnels)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Paramètres de recherche
    const teacherId = searchParams.get('teacher_id')
    const durationtype = searchParams.get('duration_type')
    const pacingType = searchParams.get('pacing_type')
    const accessMode = searchParams.get('access_mode')
    const isPublished = searchParams.get('is_published')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construire la requête
    let query = supabase
      .from('courses') // Table courses = programmes
      .select(`
        *,
        teacher:profiles!courses_teacher_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)

    // Filtres
    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    if (isPublished !== null) {
      query = query.eq('is_published', isPublished === 'true')
    }

    if (durationtype) {
      query = query.eq(supabase.raw("settings->>'duration_type'"), durationtype)
    }

    if (pacingType) {
      query = query.eq(supabase.raw("settings->>'pacing_type'"), pacingType)
    }

    if (accessMode) {
      query = query.eq(supabase.raw("settings->>'access_mode'"), accessMode)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Pagination et tri
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: programmes, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      programmes,
      total: count,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Erreur GET /api/programmes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/programmes
 * Créer un nouveau programme
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const input: CreateProgrammeInput & { chapters?: any[] } = body

    // Valider les champs requis
    if (!input.title || !input.settings) {
      return NextResponse.json(
        { error: 'Titre et configuration requis' },
        { status: 400 }
      )
    }

    // Créer le programme
    const { data: programme, error: programmeError } = await supabase
      .from('courses')
      .insert({
        teacher_id: user.id,
        title: input.title,
        description: input.description || null,
        thumbnail: input.thumbnail || null,
        price: input.price,
        currency: input.currency || 'EUR',
        settings: input.settings,
        target_audience: input.target_audience || null,
        is_published: body.is_published || false,
      })
      .select()
      .single()

    if (programmeError) throw programmeError

    // Créer les chapitres et leçons si fournis
    if (input.chapters && input.chapters.length > 0) {
      for (let i = 0; i < input.chapters.length; i++) {
        const chapter = input.chapters[i]

        const { data: newChapter, error: chapterError } = await supabase
          .from('chapters')
          .insert({
            course_id: programme.id,
            title: chapter.title,
            description: chapter.description || null,
            order_index: i,
            is_published: body.is_published || false,
          })
          .select()
          .single()

        if (chapterError) {
          console.error('Erreur création chapitre:', chapterError)
          continue
        }

        // Créer les leçons
        if (chapter.lessons && chapter.lessons.length > 0) {
          const lessonsToInsert = chapter.lessons.map((lesson: any, j: number) => ({
            chapter_id: newChapter.id,
            title: lesson.title,
            content: lesson.content || null,
            video_url: lesson.video_url || null,
            duration_minutes: lesson.duration_minutes || null,
            order_index: j,
            is_free_preview: lesson.is_free_preview || false,
            is_published: body.is_published || false,
          }))

          const { error: lessonsError } = await supabase
            .from('lessons')
            .insert(lessonsToInsert)

          if (lessonsError) {
            console.error('Erreur création leçons:', lessonsError)
          }
        }
      }
    }

    // Récupérer le programme complet avec chapitres et leçons
    const { data: fullProgramme } = await supabase
      .from('courses')
      .select(`
        *,
        teacher:profiles!courses_teacher_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        chapters(
          *,
          lessons(*)
        )
      `)
      .eq('id', programme.id)
      .single()

    return NextResponse.json(fullProgramme, { status: 201 })
  } catch (error: any) {
    console.error('Erreur POST /api/programmes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
