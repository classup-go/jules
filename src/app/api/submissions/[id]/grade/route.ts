import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST - Grade a submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { grade, feedbackText, feedbackFiles, rubricGrades } = body;

    // Get submission and verify authorization
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        *,
        assignment:assignments(
          id,
          teacher_id,
          max_points,
          passing_grade
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Verify user is the teacher
    if (submission.assignment.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the teacher can grade submissions' },
        { status: 403 }
      );
    }

    // Validate grade
    if (grade === undefined || grade === null) {
      return NextResponse.json({ error: 'Grade is required' }, { status: 400 });
    }

    if (grade < 0 || grade > submission.assignment.max_points) {
      return NextResponse.json(
        { error: `Grade must be between 0 and ${submission.assignment.max_points}` },
        { status: 400 }
      );
    }

    // Calculate percentage and pass/fail
    const percentage = (grade / submission.assignment.max_points) * 100;
    const passed = percentage >= submission.assignment.passing_grade;

    // Update submission with grade
    const { data: gradedSubmission, error: gradeError } = await supabase
      .from('submissions')
      .update({
        grade,
        percentage,
        passed,
        feedback_text: feedbackText || null,
        feedback_files: feedbackFiles || [],
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId)
      .select(`
        *,
        student:users!submissions_student_id_fkey(id, display_name, email),
        graded_by_user:users!submissions_graded_by_fkey(id, display_name, email)
      `)
      .single();

    if (gradeError) {
      console.error('Grading error:', gradeError);
      return NextResponse.json({ error: 'Failed to grade submission' }, { status: 500 });
    }

    // If rubric grades provided, save them
    if (rubricGrades && Array.isArray(rubricGrades)) {
      for (const rubricGrade of rubricGrades) {
        await supabase
          .from('rubric_grades')
          .upsert({
            submission_id: submissionId,
            rubric_id: rubricGrade.rubricId,
            points_earned: rubricGrade.pointsEarned,
            feedback: rubricGrade.feedback || null
          }, {
            onConflict: 'submission_id,rubric_id'
          });
      }
    }

    return NextResponse.json({
      submission: gradedSubmission,
      message: 'Submission graded successfully'
    });

  } catch (error) {
    console.error('Grading API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
