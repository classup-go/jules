import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/students?classroomId=xxx - Get all students (optionally exclude those already enrolled)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verify user is a teacher
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'teacher') {
      return NextResponse.json({ error: 'Accès réservé aux enseignants' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classroomId = searchParams.get('classroomId');

    // Get all students
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url')
      .eq('role', 'student')
      .order('display_name', { ascending: true });

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des étudiants' }, { status: 500 });
    }

    // If classroomId provided, filter out already enrolled students
    if (classroomId) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('classroom_id', classroomId)
        .eq('status', 'active');

      const enrolledIds = new Set(enrollments?.map(e => e.student_id) || []);
      const availableStudents = students?.filter(s => !enrolledIds.has(s.id)) || [];

      return NextResponse.json({ students: availableStudents });
    }

    return NextResponse.json({ students: students || [] });

  } catch (error) {
    console.error('Students GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
