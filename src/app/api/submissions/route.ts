import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - List submissions (for teacher to see all submissions for an assignment)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const studentId = searchParams.get('studentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 });
    }

    // Check if user is the teacher
    const { data: assignment } = await supabase
      .from('assignments')
      .select('teacher_id, classroom_id')
      .eq('id', assignmentId)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const isTeacher = assignment.teacher_id === user.id;

    let query = supabase
      .from('submissions')
      .select(`
        *,
        student:users!submissions_student_id_fkey(id, display_name, email),
        graded_by_user:users!submissions_graded_by_fkey(id, display_name, email)
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    // Teachers see all submissions, students only see their own
    if (!isTeacher) {
      query = query.eq('student_id', user.id);
    } else if (studentId) {
      // Teacher filtering by specific student
      query = query.eq('student_id', studentId);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Submissions fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ submissions });

  } catch (error) {
    console.error('Submissions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create/Submit homework
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      assignmentId,
      submissionText,
      submissionFiles
    } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 });
    }

    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*, classroom:classrooms(id)')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if student is enrolled
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('classroom_id', assignment.classroom_id)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this classroom' },
        { status: 403 }
      );
    }

    // Check if assignment is published
    if (assignment.status !== 'published') {
      return NextResponse.json(
        { error: 'This assignment is not available for submission' },
        { status: 400 }
      );
    }

    // Check if already submitted and resubmission not allowed
    const { data: existingSubmissions, error: existingError } = await supabase
      .from('submissions')
      .select('id, attempt_number')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .order('attempt_number', { ascending: false });

    if (existingError) {
      console.error('Existing submissions check error:', existingError);
    }

    const attemptNumber = (existingSubmissions?.length || 0) + 1;

    // Check if max attempts reached
    if (existingSubmissions && existingSubmissions.length >= assignment.max_attempts) {
      if (!assignment.allow_resubmission) {
        return NextResponse.json(
          { error: 'Maximum submission attempts reached' },
          { status: 400 }
        );
      }
    }

    // Check if late
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isLate = now > dueDate;

    if (isLate && !assignment.late_submission_allowed) {
      return NextResponse.json(
        { error: 'Late submissions are not allowed for this assignment' },
        { status: 400 }
      );
    }

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        submission_text: submissionText || null,
        submission_files: submissionFiles || [],
        attempt_number: attemptNumber,
        submitted_at: now.toISOString(),
        is_late: isLate,
        status: 'submitted',
        max_points: assignment.max_points
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Submission creation error:', submissionError);
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission }, { status: 201 });

  } catch (error) {
    console.error('Submission API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
