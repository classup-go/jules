import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get assignment details
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

    const { data: assignment, error } = await supabase
      .from('assignments')
      .select(`
        *,
        classroom:classrooms(id, title, teacher_id),
        rubrics:assignment_rubrics(*)
      `)
      .eq('id', id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check authorization
    const isTeacher = assignment.classroom.teacher_id === user.id;

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('classroom_id', assignment.classroom_id)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!isTeacher && !enrollment) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Students can only see published assignments
    if (!isTeacher && assignment.status !== 'published') {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ assignment });

  } catch (error) {
    console.error('Assignment fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update assignment
export async function PATCH(
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

    // Verify ownership
    const { data: assignment } = await supabase
      .from('assignments')
      .select('teacher_id, classroom_id, title, status')
      .eq('id', id)
      .single();

    if (!assignment || assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};
    const wasPublished = assignment.status === 'published';

    // Only update provided fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.instructions !== undefined) updateData.instructions = body.instructions;
    if (body.assignmentType !== undefined) updateData.assignment_type = body.assignmentType;
    if (body.maxPoints !== undefined) updateData.max_points = body.maxPoints;
    if (body.passingGrade !== undefined) updateData.passing_grade = body.passingGrade;
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate;
    if (body.lateSubmissionAllowed !== undefined) updateData.late_submission_allowed = body.lateSubmissionAllowed;
    if (body.latePenaltyPercent !== undefined) updateData.late_penalty_percent = body.latePenaltyPercent;
    if (body.allowResubmission !== undefined) updateData.allow_resubmission = body.allowResubmission;
    if (body.maxAttempts !== undefined) updateData.max_attempts = body.maxAttempts;
    if (body.resourceUrls !== undefined) updateData.resource_urls = body.resourceUrls;

    // Handle status change
    const isNowPublishing = body.status === 'published' && !wasPublished;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (isNowPublishing) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: updatedAssignment, error } = await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Assignment update error:', error);
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    // If assignment was just published, send notifications to all enrolled students
    if (isNowPublishing) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('classroom_id', assignment.classroom_id)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        const notificationTitle = body.title || assignment.title;
        const notifications = enrollments.map((enrollment) => ({
          user_id: enrollment.student_id,
          type: 'assignment_new',
          title: 'Nouveau devoir',
          message: `Un nouveau devoir "${notificationTitle}" a été ajouté`,
          assignment_id: id,
          classroom_id: assignment.classroom_id,
          action_url: `/student/assignments`,
          priority: 'normal'
        }));

        await supabase.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json({ assignment: updatedAssignment });

  } catch (error) {
    console.error('Assignment update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete assignment
export async function DELETE(
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

    // Verify ownership
    const { data: assignment } = await supabase
      .from('assignments')
      .select('teacher_id')
      .eq('id', id)
      .single();

    if (!assignment || assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Assignment deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Assignment deletion API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
