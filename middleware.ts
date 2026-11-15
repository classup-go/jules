import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = {
  matcher: [
    '/(teacher|student)/:path*',
    '/search',
    '/find-teachers',
    '/classroom/:path*',
    '/lesson/:path*',
    '/dashboard',
    '/checkout',
    '/course/:path*'
  ],
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users to login
  if (!authUser) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Get user profile with role and profile_completed
  const { data: profile } = await supabase
    .from('users')
    .select('role, profile_completed')
    .eq('id', authUser.id)
    .single()

  if (!profile) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect users (students AND teachers) with incomplete profile to complete-profile page
  // (except if they're already on that page)
  if (
    profile.profile_completed === false &&
    !pathname.startsWith('/complete-profile') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/register')
  ) {
    const completeProfileUrl = new URL('/complete-profile', request.url)
    return NextResponse.redirect(completeProfileUrl)
  }

  // Block students from accessing teacher routes
  if (pathname.startsWith('/teacher') && profile.role !== 'teacher') {
    const studentHomeUrl = new URL('/student/home', request.url)
    return NextResponse.redirect(studentHomeUrl)
  }

  // Block teachers from accessing student routes
  if (pathname.startsWith('/student') && profile.role !== 'student') {
    const teacherDashboardUrl = new URL('/teacher/dashboard', request.url)
    return NextResponse.redirect(teacherDashboardUrl)
  }

  // Block teachers from accessing search/find-teachers (student-only features)
  if (
    (pathname === '/search' || pathname === '/find-teachers') &&
    profile.role === 'teacher'
  ) {
    const teacherDashboardUrl = new URL('/teacher/dashboard', request.url)
    return NextResponse.redirect(teacherDashboardUrl)
  }

  // For classroom and lesson routes, check enrollment (basic check)
  // Note: More granular checks should be done at the page level
  if (pathname.startsWith('/classroom/') || pathname.startsWith('/lesson/')) {
    // Allow access for now, let page-level logic handle detailed permission checks
    // This prevents blocking teachers who own the classroom
  }

  return supabaseResponse
}
