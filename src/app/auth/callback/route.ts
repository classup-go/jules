import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') || 'student'
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Vérifier si le profil existe déjà
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // Créer le profil pour les nouveaux utilisateurs (Google)
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
          role: role,
          avatar_url: data.user.user_metadata?.avatar_url || null
        })
      }

      // Rediriger vers le bon dashboard
      const userRole = existingProfile?.role || role
      if (userRole === 'teacher') {
        return NextResponse.redirect(`${origin}/teacher/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/student/home`)
      }
    }
  }

  // Erreur - rediriger vers login
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}