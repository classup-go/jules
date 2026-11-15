import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/enrollments?classroomId=xxx - Get all enrollments for a classroom
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classroomId = searchParams.get('classroomId');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId requis' }, { status: 400 });
    }

    // Verify user is teacher of this classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('teacher_id')
      .eq('id', classroomId)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classe non trouvée' }, { status: 404 });
    }

    if (classroom.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Get all enrollments with student info
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        status,
        enrolled_at,
        users:student_id (
          id,
          email,
          display_name,
          avatar_url
        )
      `)
      .eq('classroom_id', classroomId)
      .order('enrolled_at', { ascending: false });

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des inscriptions' }, { status: 500 });
    }

    return NextResponse.json({ enrollments: enrollments || [] });

  } catch (error) {
    console.error('Enrollments GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/enrollments - Create new enrollment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { classroomId, studentId } = body;

    if (!classroomId || !studentId) {
      return NextResponse.json({ error: 'classroomId et studentId requis' }, { status: 400 });
    }

    // Verify user is teacher of this classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('teacher_id')
      .eq('id', classroomId)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classe non trouvée' }, { status: 404 });
    }

    if (classroom.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Verify student exists and has student role
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Étudiant non trouvé' }, { status: 404 });
    }

    if (student.role !== 'student') {
      return NextResponse.json({ error: 'Utilisateur n\'est pas un étudiant' }, { status: 400 });
    }

    // Check if enrollment already exists
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('classroom_id', classroomId)
      .eq('student_id', studentId)
      .single();

    if (existingEnrollment) {
      // If exists but inactive, reactivate it
      if (existingEnrollment.status !== 'active') {
        const { data: updated, error: updateError } = await supabase
          .from('enrollments')
          .update({ status: 'active', enrolled_at: new Date().toISOString() })
          .eq('id', existingEnrollment.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: 'Erreur lors de la réactivation' }, { status: 500 });
        }

        return NextResponse.json({ enrollment: updated, message: 'Inscription réactivée' });
      }

      return NextResponse.json({ error: 'Étudiant déjà inscrit' }, { status: 409 });
    }

    // Create new enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        classroom_id: classroomId,
        student_id: studentId,
        status: 'active',
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError);
      return NextResponse.json({ error: 'Erreur lors de la création de l\'inscription' }, { status: 500 });
    }

    return NextResponse.json({ enrollment, message: 'Étudiant inscrit avec succès' }, { status: 201 });

  } catch (error) {
    console.error('Enrollments POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
