import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Leave session (record participant departure)
export async function POST(
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

    // Call the leave_session RPC function
    const { error } = await supabase.rpc('leave_session', {
      p_session_id: id
    })

    if (error) {
      console.error('Leave session error:', error)
      throw error
    }

    return NextResponse.json({
      message: 'Session quittée avec succès'
    })

  } catch (error) {
    console.error('Leave session error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    )
  }
}
