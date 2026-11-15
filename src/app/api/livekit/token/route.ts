import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AccessToken } from 'livekit-server-sdk'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, roomName } = body

    // 1. Validation : l'erreur 400 venait souvent d'ici si roomName était vide
    if (!sessionId || !roomName) {
      return NextResponse.json(
        { error: 'sessionId et roomName requis' },
        { status: 400 }
      )
    }

    // 2. Récupérer la session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Session query error:', sessionError)
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      )
    }

    // 3. Vérification des permissions
    const isTeacher = session.teacher_id === user.id
    const isOneToOneStudent = session.session_type === 'one_to_one' && session.student_id === user.id

    // Pour les sessions de groupe, vérifier si l'utilisateur est inscrit au cours
    let isEnrolled = false
    if (session.classroom_id) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('classroom_id', session.classroom_id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

      isEnrolled = !!enrollment
    }

    if (!isTeacher && !isOneToOneStudent && !isEnrolled) {
      return NextResponse.json(
        { error: 'Accès refusé à cette session' },
        { status: 403 }
      )
    }

    // 4. Infos utilisateur pour le token
    const { data: userData } = await supabase
      .from('users')
      .select('display_name, avatar_url, role')
      .eq('id', user.id)
      .single()

    // 5. Génération du token LiveKit
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplète' },
        { status: 500 }
      )
    }

    // Utilisation de roomName passé par le front ou room_id de la DB
    const finalRoomName = session.room_id || roomName

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: userData?.display_name || 'Utilisateur',
      metadata: JSON.stringify({
        role: userData?.role || 'student',
        avatar_url: userData?.avatar_url || '',
        is_teacher: isTeacher
      })
    })

    at.addGrant({
      roomJoin: true,
      room: finalRoomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      ...(isTeacher && {
        roomAdmin: true,
        roomRecord: true,
        canUpdateOwnMetadata: true
      })
    })

    const token = await at.toJwt()

    // 6. Enregistrement participation (RPC join_session)
    try {
      await supabase.rpc('join_session', {
        p_session_id: sessionId,
        p_device_type: request.headers.get('sec-ch-ua-platform') || 'web',
        p_user_agent: request.headers.get('user-agent') || 'unknown'
      })
    } catch (rpcError) {
      console.warn('RPC join_session failed, continuing...', rpcError)
    }

    return NextResponse.json({
      token,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: finalRoomName
    })

  } catch (error: any) {
    console.error('Global API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    )
  }
}