'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LessonEditorV2 from '@/components/lesson-editor/LessonEditorV2'
import { QCMData, FillInBlanksData } from '@/types/quiz'

interface LessonData {
  id?: string
  title: string
  description?: string
  type: 'text' | 'video' | 'pdf' | 'slides' | 'qcm' | 'fill_in_blanks'
  content_text?: string
  content_url?: string
  storage_path?: string
  video_duration?: number
  video_size?: number
  duration_minutes?: number
  is_free: boolean
  is_mandatory: boolean
  order_index: number
  quizData?: QCMData | FillInBlanksData
}

export default function NewLessonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chapterId = searchParams.get('chapter')
  const classroomId = searchParams.get('classroom')

  if (!chapterId || !classroomId) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Paramètres manquants
          </h2>
          <p style={{ color: '#617589', marginBottom: '24px' }}>
            Les identifiants du chapitre et de la classe sont requis
          </p>
          <button
            onClick={() => router.back()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2b8cee',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  const handleSave = async (lessonData: LessonData) => {
    const supabase = createClient()

    // Get max order index
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: false })
      .limit(1)

    const orderIndex = existingLessons?.[0]?.order_index ?? -1

    // Build lesson insert object
    const lessonInsert: any = {
      chapter_id: chapterId,
      classroom_id: classroomId,
      title: lessonData.title,
      description: lessonData.description,
      type: lessonData.type,
      order_index: orderIndex + 1,
      duration_minutes: lessonData.duration_minutes,
      is_free: lessonData.is_free,
      is_mandatory: lessonData.is_mandatory,
      content_text: lessonData.content_text,
      content_url: lessonData.content_url,
      storage_path: lessonData.storage_path,
      video_duration: lessonData.video_duration,
      video_size: lessonData.video_size,
      processing_status: 'ready'
    }

    // Create lesson
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert(lessonInsert)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Save quiz data if this is a quiz lesson
    if (lessonData.quizData && (lessonData.type === 'qcm' || lessonData.type === 'fill_in_blanks')) {
      console.log('Saving quiz:', {
        lesson_id: lesson.id,
        quiz_type: lessonData.type,
        data: lessonData.quizData
      })

      const { data: quizResult, error: quizError } = await supabase
        .from('lesson_quizzes')
        .insert({
          lesson_id: lesson.id,
          quiz_type: lessonData.type,
          data: lessonData.quizData
        })
        .select()

      if (quizError) {
        console.error('Error saving quiz:', quizError)
        console.error('Error details:', JSON.stringify(quizError, null, 2))
        // Don't throw, the lesson is already created
      } else {
        console.log('Quiz saved successfully:', quizResult)
      }
    }

    // Redirect to classroom
    router.push(`/teacher/classrooms/${classroomId}`)
  }

  const handleCancel = () => {
    router.push(`/teacher/classrooms/${classroomId}`)
  }

  return (
    <LessonEditorV2
      chapterId={chapterId}
      classroomId={classroomId}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}