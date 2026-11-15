import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: lessonId } = await params

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
    const { targetChapterId, targetIndex } = body

    if (!targetChapterId || typeof targetIndex !== 'number') {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    // Vérifier que la leçon existe et appartient au professeur
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, chapter_id, chapters(course_id, courses(classroom_id, classrooms(teacher_id)))')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Leçon non trouvée' },
        { status: 404 }
      )
    }

    // @ts-ignore - Supabase typing issue
    const teacherId = lesson.chapters?.courses?.classrooms?.teacher_id

    if (teacherId !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé - Vous n\'êtes pas le propriétaire de ce cours' },
        { status: 403 }
      )
    }

    // Vérifier que le chapitre cible appartient au même cours
    const { data: targetChapter, error: targetError } = await supabase
      .from('chapters')
      .select('id, course_id')
      .eq('id', targetChapterId)
      .single()

    if (targetError || !targetChapter) {
      return NextResponse.json(
        { error: 'Chapitre cible non trouvé' },
        { status: 404 }
      )
    }

    // @ts-ignore
    const sourceCourseId = lesson.chapters?.course_id
    const targetCourseId = targetChapter.course_id

    if (sourceCourseId !== targetCourseId) {
      return NextResponse.json(
        { error: 'Le chapitre cible doit appartenir au même cours' },
        { status: 400 }
      )
    }

    // Déplacer la leçon vers le nouveau chapitre
    const { error: moveError } = await supabase
      .from('lessons')
      .update({
        chapter_id: targetChapterId,
        order_index: targetIndex
      })
      .eq('id', lessonId)

    if (moveError) {
      throw moveError
    }

    // Mettre à jour les order_index des autres leçons du chapitre cible
    // Récupérer toutes les leçons du chapitre cible
    const { data: targetLessons } = await supabase
      .from('lessons')
      .select('id, order_index')
      .eq('chapter_id', targetChapterId)
      .order('order_index', { ascending: true })

    if (targetLessons) {
      // Réindexer pour éviter les gaps
      for (let i = 0; i < targetLessons.length; i++) {
        await supabase
          .from('lessons')
          .update({ order_index: i })
          .eq('id', targetLessons[i].id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Leçon déplacée avec succès'
    })

  } catch (error) {
    console.error('Error moving lesson:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du déplacement' },
      { status: 500 }
    )
  }
}
