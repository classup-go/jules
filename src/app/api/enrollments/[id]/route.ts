import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/enrollments/[id] - Remove or deactivate enrollment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Get enrollment and verify classroom ownership
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        classroom_id,
        student_id,
        classrooms (
          teacher_id
        )
      `)
      .eq('id', id)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Inscription non trouvée' }, { status: 404 });
    }

    // Verify user is teacher of this classroom
    if ((enrollment.classrooms as any).teacher_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Deactivate enrollment instead of deleting (preserve history)
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (updateError) {
      console.error('Error deactivating enrollment:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la désactivation' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Inscription désactivée avec succès' });

  } catch (error) {
    console.error('Enrollments DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
