import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get submission details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch submission with related data
    const { data: submission, error } = await supabase
      .from('submissions')
      .select(`
        *,
        student:users!submissions_student_id_fkey(id, display_name, email),
        assignment:assignments(
          id,
          title,
          description,
          max_points,
          passing_grade,
          classroom_id,
          teacher_id,
          classroom:classrooms(id, title, subject)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check authorization
    const isTeacher = submission.assignment.teacher_id === user.id;
    const isStudent = submission.student_id === user.id;

    if (!isTeacher && !isStudent) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({ submission });

  } catch (error) {
    console.error('Submission fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
