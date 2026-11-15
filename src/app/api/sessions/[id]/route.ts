import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer la session avec le classroom
    const { data: session, error } = await supabase
      .from('live_sessions')
      .select(`
        *,
        classroom:classrooms(id, title, subject)
      `)
      .eq('id', id)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer le teacher séparément
    const { data: teacher } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, bio')
      .eq('id', session.teacher_id)
      .single()

    // Récupérer le student si c'est une session 1-to-1
    let student = null
    if (session.student_id) {
      const { data: studentData } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .eq('id', session.student_id)
        .single()
      student = studentData
    }

    // Récupérer les participants
    const { data: participants } = await supabase
      .from('session_participants')
      .select('user_id, joined_at, left_at')
      .eq('session_id', id)

    // Vérifier les permissions
    const isTeacher = session.teacher_id === user.id
    const isOneToOneStudent = session.session_type === 'one_to_one' && session.student_id === user.id

    // Vérifier si l'étudiant est inscrit au cours
    let isEnrolled = false
    if (session.classroom_id) {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('classroom_id', session.classroom_id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

      console.log('Enrollment check:', {
        classroom_id: session.classroom_id,
        student_id: user.id,
        enrollment,
        enrollmentError
      })

      isEnrolled = !!enrollment
    }

    console.log('Permission check:', {
      user_id: user.id,
      session_id: id,
      session_type: session.session_type,
      classroom_id: session.classroom_id,
      teacher_id: session.teacher_id,
      student_id: session.student_id,
      isTeacher,
      isOneToOneStudent,
      isEnrolled
    })

    if (!isTeacher && !isOneToOneStudent && !isEnrolled) {
      console.error('Access denied for user:', user.id, 'to session:', id)
      return NextResponse.json(
        { error: 'Accès refusé - Vous devez être inscrit à ce cours pour accéder à cette session' },
        { status: 403 }
      )
    }

    // Déterminer le rôle de l'utilisateur courant par rapport à cette session
    const currentUserRole = isTeacher ? 'teacher' : (isOneToOneStudent ? 'student_one_to_one' : 'student_enrolled')

    return NextResponse.json({
      session: {
        ...session,
        teacher,
        student,
        participants
      },
      currentUserRole,
      canModify: isTeacher,
      canJoin: isTeacher || isOneToOneStudent || isEnrolled
    })

  } catch (error) {
    console.error('Session details error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la session' },
      { status: 500 }
    )
  }
}

// PATCH - Update session (start, end, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { action, reason, ...updateData } = body

    // Vérifier que l'utilisateur est le professeur de la session
    const { data: session } = await supabase
      .from('live_sessions')
      .select('teacher_id, status')
      .eq('id', id)
      .single()

    if (!session || session.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Seul le professeur peut modifier cette session' },
        { status: 403 }
      )
    }

    let updateFields: any = {}

    switch (action) {
      case 'start':
        if (session.status !== 'scheduled') {
          return NextResponse.json(
            { error: 'Seules les sessions programmées peuvent être démarrées' },
            { status: 400 }
          )
        }
        updateFields = {
          status: 'live',
          started_at: new Date().toISOString()
        }
        break

      case 'end':
        if (session.status !== 'live') {
          return NextResponse.json(
            { error: 'Seules les sessions en cours peuvent être terminées' },
            { status: 400 }
          )
        }
        updateFields = {
          status: 'ended',
          ended_at: new Date().toISOString()
        }
        break

      case 'cancel':
        if (session.status !== 'scheduled') {
          return NextResponse.json(
            { error: 'Seules les sessions programmées peuvent être annulées' },
            { status: 400 }
          )
        }
        updateFields = {
          status: 'cancelled',
          cancellation_reason: reason || null
        }
        break

      case 'update':
        // Mise à jour simple des champs
        updateFields = updateData
        break

      default:
        return NextResponse.json(
          { error: 'Action inconnue' },
          { status: 400 }
        )
    }

    // Mettre à jour la session
    const { data: updatedSession, error: updateError } = await supabase
      .from('live_sessions')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Session update error:', updateError)
      throw updateError
    }

    return NextResponse.json({
      session: updatedSession,
      message: action === 'start' ? 'Session démarrée' : 
               action === 'end' ? 'Session terminée' : 
               action === 'cancel' ? 'Session annulée' : 'Session mise à jour'
    })

  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la session' },
      { status: 500 }
    )
  }
}

// DELETE - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est le professeur
    const { data: session } = await supabase
      .from('live_sessions')
      .select('teacher_id, status')
      .eq('id', id)
      .single()

    if (!session || session.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Seul le professeur peut supprimer cette session' },
        { status: 403 }
      )
    }

    // On ne peut supprimer que les sessions programmées ou annulées
    if (session.status === 'live' || session.status === 'ended') {
      return NextResponse.json(
        { error: 'Impossible de supprimer une session en cours ou terminée' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('live_sessions')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      message: 'Session supprimée'
    })

  } catch (error) {
    console.error('Session delete error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}