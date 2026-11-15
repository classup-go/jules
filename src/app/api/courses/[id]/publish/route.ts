import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { courseWizardSchema } from '@/lib/validations/course-wizard'
import { canPublishCourse } from '@/lib/business-rules/course-validation'

// POST /api/courses/[id]/publish - Publish a course
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: courseId } = await params
    const body = await request.json()

    // Validate course data
    const validation = courseWizardSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    // Check business rules
    const { canPublish, blockers } = canPublishCourse(body)
    if (!canPublish) {
      return NextResponse.json(
        {
          error: 'Le cours ne peut pas être publié',
          blockers,
        },
        { status: 400 }
      )
    }

    // Check ownership
    const { data: classroom, error: checkError } = await supabase
      .from('classrooms')
      .select('teacher_id')
      .eq('id', courseId)
      .single()

    if (checkError || !classroom) {
      return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
    }

    if (classroom.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Update classroom to published
    const { error: updateError } = await supabase
      .from('classrooms')
      .update({
        title: body.title,
        description: body.description,
        subject: body.subject,
        level: body.level,
        price: body.price || 0,
        is_free: body.access_type === 'free',
        is_public: true, // Publish the course
      })
      .eq('id', courseId)

    if (updateError) {
      console.error('Error publishing course:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la publication' }, { status: 500 })
    }

    // Note: In a full implementation, you would also:
    // 1. Create chapters in the database
    // 2. Create lessons in the database
    // 3. Create lesson_contents based on lesson types
    // 4. Store quiz questions, exercises, etc.
    // This is simplified for the MVP

    return NextResponse.json({
      success: true,
      courseId,
    })
  } catch (error) {
    console.error('Error in POST /api/courses/[id]/publish:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
