import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - List assignments for a classroom
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    const status = searchParams.get('status'); // 'all', 'published', 'draft'

    let isTeacher = false;
    let studentEnrolledClassrooms: string[] = [];

    // If classroomId is provided, check permissions
    if (classroomId) {
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single();

      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }

      isTeacher = classroom.teacher_id === user.id;

      // Check if student is enrolled
      if (!isTeacher) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('student_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!enrollment) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
      }
    } else {
      // No classroomId provided - check if user is a teacher
      const { data: teacherClassrooms } = await supabase
        .from('classrooms')
        .select('id')
        .eq('teacher_id', user.id)
        .limit(1);

      isTeacher = teacherClassrooms && teacherClassrooms.length > 0;

      // If not a teacher, get all enrolled classrooms for student
      if (!isTeacher) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('classroom_id')
          .eq('student_id', user.id)
          .eq('status', 'active');

        studentEnrolledClassrooms = enrollments?.map(e => e.classroom_id) || [];
      }
    }

    let query = supabase
      .from('assignments')
      .select(`
        *,
        classroom:classrooms(id, title, subject),
        submissions:submissions(
          id,
          student_id,
          status,
          grade,
          percentage,
          submitted_at,
          is_late
        )
      `)
      .order('due_date', { ascending: false });

    // Filter by classroom if provided
    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    } else if (isTeacher) {
      // If no classroomId and user is teacher, show teacher's assignments
      query = query.eq('teacher_id', user.id);
    } else if (studentEnrolledClassrooms.length > 0) {
      // If no classroomId and user is student, show assignments from enrolled classrooms
      query = query.in('classroom_id', studentEnrolledClassrooms);
    } else {
      // Student not enrolled in any classroom
      return NextResponse.json({ assignments: [] });
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Students only see published assignments
    if (!isTeacher) {
      query = query.eq('status', 'published');
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Assignments fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    // Filter submissions to only show current user's if student
    const filteredAssignments = assignments?.map(assignment => ({
      ...assignment,
      submissions: isTeacher
        ? assignment.submissions
        : assignment.submissions?.filter((s: any) => s.student_id === user.id)
    }));

    return NextResponse.json({ assignments: filteredAssignments });

  } catch (error) {
    console.error('Assignments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new assignment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      classroomId,
      chapterId,
      title,
      description,
      instructions,
      assignmentType,
      maxPoints,
      passingGrade,
      dueDate,
      lateSubmissionAllowed,
      latePenaltyPercent,
      allowResubmission,
      maxAttempts,
      resourceUrls,
      status
    } = body;

    // Validate required fields
    if (!classroomId || !title || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields: classroomId, title, dueDate' },
        { status: 400 }
      );
    }

    // Verify user is the teacher of this classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('teacher_id')
      .eq('id', classroomId)
      .single();

    if (!classroom || classroom.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to create assignments for this classroom' },
        { status: 403 }
      );
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        classroom_id: classroomId,
        teacher_id: user.id,
        chapter_id: chapterId || null,
        title,
        description: description || null,
        instructions: instructions || null,
        assignment_type: assignmentType || 'file_upload',
        max_points: maxPoints || 100,
        passing_grade: passingGrade || 60,
        due_date: dueDate,
        late_submission_allowed: lateSubmissionAllowed !== false,
        late_penalty_percent: latePenaltyPercent || 10,
        status: status || 'draft',
        allow_resubmission: allowResubmission || false,
        max_attempts: maxAttempts || 1,
        resource_urls: resourceUrls || [],
        published_at: status === 'published' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Assignment creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      );
    }

    // If assignment is published, send notifications to all enrolled students
    if (status === 'published') {
      // Get all enrolled students in the classroom
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('classroom_id', classroomId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        // Create notifications for each student
        const notifications = enrollments.map((enrollment) => ({
          user_id: enrollment.student_id,
          type: 'assignment_new',
          title: 'Nouveau devoir',
          message: `Un nouveau devoir "${title}" a été ajouté`,
          assignment_id: assignment.id,
          classroom_id: classroomId,
          action_url: `/student/assignments`,
          priority: 'normal',
          is_read: false
        }));

        await supabase.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json({ assignment }, { status: 201 });

  } catch (error) {
    console.error('Assignment creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
