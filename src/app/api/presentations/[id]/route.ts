import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Récupérer une présentation avec ses slides et blocs
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Récupérer la présentation
    const { data: presentation, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Vérifier les droits d'accès
    if (!presentation.is_published && !presentation.is_template && presentation.teacher_id !== user?.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer les slides
    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', id)
      .order('order_index', { ascending: true })

    if (slidesError) throw slidesError

    // Récupérer les blocs pour chaque slide
    const slideIds = slides.map((s: any) => s.id)
    
    const { data: blocks, error: blocksError } = await supabase
      .from('slide_blocks')
      .select('*')
      .in('slide_id', slideIds)
      .order('order_index', { ascending: true })

    if (blocksError) throw blocksError

    // Associer les blocs aux slides
    const slidesWithBlocks = slides.map((slide: any) => ({
      ...slide,
      blocks: blocks.filter((b: any) => b.slide_id === slide.id)
    }))

    return NextResponse.json({
      ...presentation,
      slides: slidesWithBlocks
    })
  } catch (error: any) {
    console.error('Erreur GET presentation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Mettre à jour une présentation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier la propriété
    const { data: existing } = await supabase
      .from('presentations')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (existing?.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()

    // Champs autorisés à mettre à jour
    const allowedFields = [
      'title', 'description', 'thumbnail_url', 'theme', 'transition',
      'aspect_ratio', 'estimated_duration', 'difficulty_level',
      'is_published', 'is_template', 'template_category'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from('presentations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erreur PATCH presentation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Supprimer une présentation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier la propriété
    const { data: existing } = await supabase
      .from('presentations')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (existing?.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Les slides et blocs seront supprimés en cascade
    const { error } = await supabase
      .from('presentations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur DELETE presentation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

