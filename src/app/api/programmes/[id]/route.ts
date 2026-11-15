import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateProgrammeInput } from '@/types/programme'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/programmes/[id]
 * Récupérer un programme par ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: programme, error } = await supabase
      .from('courses')
      .select(`
        *,
        teacher:profiles!courses_teacher_id_fkey(
          id,
          full_name,
          avatar_url,
          bio
        ),
        chapters(
          *,
          lessons(
            *,
            presentation:presentations(
              id,
              title,
              total_slides,
              thumbnail
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Programme non trouvé' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json(programme)
  } catch (error: any) {
    console.error(`Erreur GET /api/programmes/${(await params).id}:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/programmes/[id]
 * Mettre à jour un programme
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier la propriété
    const { data: programme } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (!programme) {
      return NextResponse.json(
        { error: 'Programme non trouvé' },
        { status: 404 }
      )
    }

    if (programme.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    const body: UpdateProgrammeInput = await request.json()

    // Construire l'objet de mise à jour
    const updateData: any = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail
    if (body.price !== undefined) updateData.price = body.price
    if (body.target_audience !== undefined) updateData.target_audience = body.target_audience

    // Mise à jour partielle des settings
    if (body.settings) {
      // Récupérer les settings actuels
      const { data: current } = await supabase
        .from('courses')
        .select('settings')
        .eq('id', id)
        .single()

      if (current) {
        updateData.settings = {
          ...current.settings,
          ...body.settings,
          // Fusionner les sous-objets
          features: {
            ...(current.settings as any)?.features,
            ...body.settings.features,
          },
          restrictions: {
            ...(current.settings as any)?.restrictions,
            ...body.settings.restrictions,
          },
          ...(body.settings.schedule && {
            schedule: {
              ...(current.settings as any)?.schedule,
              ...body.settings.schedule,
            },
          }),
        }
      }
    }

    updateData.updated_at = new Date().toISOString()

    // Mettre à jour
    const { data: updated, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
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
      .single()

    if (error) throw error

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error(`Erreur PUT /api/programmes/${(await params).id}:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/programmes/[id]
 * Supprimer un programme
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier la propriété
    const { data: programme } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (!programme) {
      return NextResponse.json(
        { error: 'Programme non trouvé' },
        { status: 404 }
      )
    }

    if (programme.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // Supprimer (cascade sur chapitres et leçons)
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`Erreur DELETE /api/programmes/${(await params).id}:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
