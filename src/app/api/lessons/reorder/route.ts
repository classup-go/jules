import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un professeur
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Accès refusé - Professeurs uniquement' },
        { status: 403 }
      )
    }

    // Récupérer les données de la requête
    const body = await request.json()
    const { chapterId, lessons } = body

    if (!chapterId || !Array.isArray(lessons)) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    // Vérifier que le chapitre existe et appartient au professeur
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id, classroom_id, classrooms(teacher_id)')
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      return NextResponse.json(
        { error: 'Chapitre non trouvé' },
        { status: 404 }
      )
    }

    // @ts-ignore - Supabase typing issue with nested select
    const teacherId = chapter.classrooms?.teacher_id

    if (teacherId !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé - Vous n\'êtes pas le propriétaire de ce cours' },
        { status: 403 }
      )
    }

    // Mettre à jour l'ordre des leçons
    let updatedCount = 0
    for (const lesson of lessons) {
      if (!lesson.id || typeof lesson.order_index !== 'number') {
        continue
      }

      const { error: updateError } = await supabase
        .from('lessons')
        .update({ order_index: lesson.order_index })
        .eq('id', lesson.id)
        .eq('chapter_id', chapterId) // Sécurité supplémentaire

      if (!updateError) {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      message: `${updatedCount} leçon(s) mise(s) à jour`
    })

  } catch (error) {
    console.error('Error reordering lessons:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la réorganisation' },
      { status: 500 }
    )
  }
}
