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
    const { courseId, classroomId, chapters } = body

    // Support des deux formats pour rétrocompatibilité
    const targetId = courseId || classroomId

    if (!targetId || !Array.isArray(chapters)) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    // Vérifier que le professeur est propriétaire du cours
    if (courseId) {
      // Nouveau système: vérifier via courses
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('classroom:classrooms(teacher_id)')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        return NextResponse.json(
          { error: 'Cours non trouvé' },
          { status: 404 }
        )
      }

      // @ts-ignore
      if (course.classroom?.teacher_id !== user.id) {
        return NextResponse.json(
          { error: 'Accès refusé - Vous n\'êtes pas le propriétaire de ce cours' },
          { status: 403 }
        )
      }
    } else {
      // Ancien système: vérifier via classrooms (rétrocompatibilité)
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

      if (classroomError || !classroom) {
        return NextResponse.json(
          { error: 'Cours non trouvé' },
          { status: 404 }
        )
      }

      if (classroom.teacher_id !== user.id) {
        return NextResponse.json(
          { error: 'Accès refusé - Vous n\'êtes pas le propriétaire de ce cours' },
          { status: 403 }
        )
      }
    }

    // Mettre à jour l'ordre des chapitres
    let updatedCount = 0
    for (const chapter of chapters) {
      if (!chapter.id || typeof chapter.order_index !== 'number') {
        continue
      }

      const updateQuery = supabase
        .from('chapters')
        .update({ order_index: chapter.order_index })
        .eq('id', chapter.id)

      // Sécurité supplémentaire: vérifier que le chapitre appartient bien au cours/classroom
      if (courseId) {
        updateQuery.eq('course_id', courseId)
      } else {
        updateQuery.eq('classroom_id', classroomId)
      }

      const { error: updateError } = await updateQuery

      if (!updateError) {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      message: `${updatedCount} chapitre(s) mis à jour`
    })

  } catch (error) {
    console.error('Error reordering chapters:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la réorganisation' },
      { status: 500 }
    )
  }
}
