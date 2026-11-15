import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List sessions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'upcoming', 'active', 'past'
    const classroomId = searchParams.get('classroomId')

    // Récupérer le rôle de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Construire la requête de base - SANS les relations problématiques
    let query = supabase
      .from('live_sessions')
      .select(`
        *,
        classroom:classrooms(id, title)
      `)

    // Filtrer selon le rôle
    if (userData?.role === 'teacher') {
      query = query.eq('teacher_id', user.id)
    } else {
      // Pour les étudiants: récupérer les cours auxquels ils sont inscrits
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('classroom_id')
        .eq('student_id', user.id)
        .eq('status', 'active')

      const enrolledClassroomIds = enrollments?.map(e => e.classroom_id) || []

      // Filtrer: sessions 1-to-1 OU sessions de groupe des cours inscrits
      if (enrolledClassroomIds.length > 0) {
        query = query.or(`student_id.eq.${user.id},classroom_id.in.(${enrolledClassroomIds.join(',')})`)
      } else {
        // Si pas d'enrollments, seulement les sessions 1-to-1
        query = query.eq('student_id', user.id)
      }
    }

    // Filtres additionnels
    if (classroomId) {
      query = query.eq('classroom_id', classroomId)
    }

    if (type === 'upcoming') {
      query = query
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
    } else if (type === 'active') {
      query = query.eq('status', 'live')
    } else if (type === 'past') {
      query = query
        .in('status', ['ended', 'cancelled'])
        .order('scheduled_at', { ascending: false })
        .limit(20)
    } else {
      query = query.order('scheduled_at', { ascending: false })
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Sessions query error:', error)
      throw error
    }

    // Récupérer les infos des teachers et students séparément si nécessaire
    const sessionsWithDetails = await Promise.all(
      (sessions || []).map(async (session) => {
        // Récupérer le teacher
        const { data: teacher } = await supabase
          .from('users')
          .select('id, display_name, avatar_url')
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

        return {
          ...session,
          teacher,
          student
        }
      })
    )

    return NextResponse.json({ sessions: sessionsWithDetails })

  } catch (error) {
    console.error('Sessions list error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des sessions' },
      { status: 500 }
    )
  }
}

// POST - Create session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est un enseignant
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Seuls les enseignants peuvent créer des sessions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      sessionType, // 'group' ou 'one_to_one'
      classroomId,
      studentId, // Pour les sessions 1-to-1
      scheduledAt,
      duration,
      recordingEnabled,
      maxParticipants
    } = body

    // Validation
    if (!title || !sessionType || !scheduledAt || !duration) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    if (sessionType === 'group' && !classroomId) {
      return NextResponse.json(
        { error: 'classroomId requis pour les sessions de groupe' },
        { status: 400 }
      )
    }

    if (sessionType === 'one_to_one' && !studentId) {
      return NextResponse.json(
        { error: 'studentId requis pour les sessions 1-to-1' },
        { status: 400 }
      )
    }

    // Générer un room_id unique
    const roomId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Créer la session
    const { data: session, error: createError } = await supabase
      .from('live_sessions')
      .insert({
        teacher_id: user.id,
        classroom_id: sessionType === 'group' ? classroomId : null,
        student_id: sessionType === 'one_to_one' ? studentId : null,
        title,
        description,
        session_type: sessionType,
        scheduled_at: scheduledAt,
        duration,
        recording_enabled: recordingEnabled || false,
        max_participants: maxParticipants || 50,
        room_id: roomId,
        status: 'scheduled'
      })
      .select()
      .single()

    if (createError) {
      console.error('Session creation error:', createError)
      throw createError
    }

    return NextResponse.json({
      session,
      message: 'Session créée avec succès'
    }, { status: 201 })

  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session' },
      { status: 500 }
    )
  }
}