import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Liste des présentations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')
    const lessonId = searchParams.get('lesson_id')
    const isTemplate = searchParams.get('is_template') === 'true'

    let query = supabase
      .from('presentations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }
    
    if (lessonId) {
      query = query.eq('lesson_id', lessonId)
    }

    if (isTemplate) {
      query = query.eq('is_template', true)
    } else {
      query = query.eq('teacher_id', user.id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erreur GET presentations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Créer une présentation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('presentations')
      .insert({
        teacher_id: user.id,
        course_id: body.course_id || null,
        lesson_id: body.lesson_id || null,
        title: body.title || 'Nouvelle présentation',
        description: body.description || '',
        theme: body.theme || 'default',
        transition: body.transition || 'slide',
        aspect_ratio: body.aspect_ratio || '16:9',
        difficulty_level: body.difficulty_level || null,
        is_template: body.is_template || false,
        template_category: body.template_category || null
      })
      .select()
      .single()

    if (error) throw error

    // Créer une première slide vide
    const { error: slideError } = await supabase
      .from('slides')
      .insert({
        presentation_id: data.id,
        order_index: 0,
        layout: 'default'
      })

    if (slideError) {
      console.error('Erreur création slide initiale:', slideError)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Erreur POST presentation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

