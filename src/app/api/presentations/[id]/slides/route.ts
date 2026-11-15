import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: presentationId } = await params
    const supabase = await createClient()

    const { data: slides, error } = await supabase
      .from('slides')
      .select(`
        *,
        blocks:slide_blocks(*)
      `)
      .eq('presentation_id', presentationId)
      .order('order_index', { ascending: true })

    if (error) throw error

    // Trier les blocs par order_index
    const slidesWithSortedBlocks = slides.map((slide: any) => ({
      ...slide,
      blocks: (slide.blocks || []).sort((a: any, b: any) => a.order_index - b.order_index)
    }))

    return NextResponse.json(slidesWithSortedBlocks)
  } catch (error: any) {
    console.error('Erreur GET slides:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Créer une nouvelle slide
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: presentationId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier la propriété de la présentation
    const { data: presentation } = await supabase
      .from('presentations')
      .select('teacher_id')
      .eq('id', presentationId)
      .single()

    if (presentation?.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()

    // Déterminer l'index (à la fin par défaut)
    let orderIndex = body.order_index
    if (orderIndex === undefined) {
      const { count } = await supabase
        .from('slides')
        .select('*', { count: 'exact', head: true })
        .eq('presentation_id', presentationId)
      
      orderIndex = count || 0
    }

    const { data, error } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentationId,
        order_index: orderIndex,
        title: body.title || null,
        subtitle: body.subtitle || null,
        layout: body.layout || 'default',
        background_color: body.background_color || null,
        background_image: body.background_image || null,
        speaker_notes: body.speaker_notes || null,
        duration_seconds: body.duration_seconds || null,
        is_interactive: body.is_interactive || false,
        requires_completion: body.requires_completion || false
      })
      .select()
      .single()

    if (error) throw error

    // Si des blocs sont fournis, les créer
    if (body.blocks && body.blocks.length > 0) {
      const blocksToInsert = body.blocks.map((block: any, index: number) => ({
        slide_id: data.id,
        block_type: block.block_type,
        order_index: block.order_index ?? index,
        column_index: block.column_index || 0,
        content: block.content || {},
        style: block.style || {},
        animation: block.animation || null,
        animation_delay: block.animation_delay || 0,
        is_interactive: block.is_interactive || false
      }))

      const { error: blocksError } = await supabase
        .from('slide_blocks')
        .insert(blocksToInsert)

      if (blocksError) {
        console.error('Erreur création blocs:', blocksError)
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Erreur POST slide:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Sauvegarder toutes les slides (batch update)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: presentationId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier la propriété
    const { data: presentation } = await supabase
      .from('presentations')
      .select('teacher_id')
      .eq('id', presentationId)
      .single()

    if (presentation?.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { slides } = await request.json()

    // Supprimer les anciennes slides et blocs
    await supabase
      .from('slides')
      .delete()
      .eq('presentation_id', presentationId)

    // Insérer les nouvelles slides
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      
      const { data: newSlide, error: slideError } = await supabase
        .from('slides')
        .insert({
          presentation_id: presentationId,
          order_index: i,
          section_title: slide.section_title || null,
          title: slide.title || null,
          subtitle: slide.subtitle || null,
          layout: slide.layout || 'default',
          background_color: slide.background_color || null,
          background_image: slide.background_image || null,
          background_opacity: slide.background_opacity ?? 1,
          speaker_notes: slide.speaker_notes || null,
          duration_seconds: slide.duration_seconds || null,
          auto_advance: slide.auto_advance || false,
          is_interactive: slide.is_interactive || false,
          requires_completion: slide.requires_completion || false
        })
        .select()
        .single()

      if (slideError) {
        console.error('Erreur insertion slide:', slideError)
        continue
      }

      // Insérer les blocs de cette slide
      if (slide.blocks && slide.blocks.length > 0) {
        const blocksToInsert = slide.blocks.map((block: any, blockIndex: number) => ({
          slide_id: newSlide.id,
          block_type: block.block_type,
          order_index: block.order_index ?? blockIndex,
          column_index: block.column_index || 0,
          content: block.content || {},
          style: block.style || {},
          animation: block.animation || null,
          animation_delay: block.animation_delay || 0,
          is_interactive: block.is_interactive || false,
          interaction_type: block.interaction_type || null
        }))

        const { error: blocksError } = await supabase
          .from('slide_blocks')
          .insert(blocksToInsert)

        if (blocksError) {
          console.error('Erreur insertion blocs:', blocksError)
        }
      }
    }

    // Mettre à jour le compteur de slides
    await supabase
      .from('presentations')
      .update({ total_slides: slides.length })
      .eq('id', presentationId)

    return NextResponse.json({ success: true, count: slides.length })
  } catch (error: any) {
    console.error('Erreur PUT slides:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}






