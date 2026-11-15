import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', user.id)
    .single()

  if (!existing) {
    // Create enrollment
    await supabase.from('enrollments').insert({
      classroom_id: classroomId,
      student_id: user.id,
      status: 'active',
      progress: 0,
    })

    // Update enrolled count
    await supabase.rpc('increment_enrolled_count', { classroom_id: classroomId })
  }

  redirect('/classroom/' + classroomId)
}