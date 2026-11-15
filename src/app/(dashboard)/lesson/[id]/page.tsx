'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedVideoPlayer from '@/components/video/protected-video-player'

interface Lesson {
  id: string
  title: string
  description: string
  type: string
  content_url: string
  content_text: string
  duration_minutes: number
  chapter_id: string
  classroom_id: string
  order_index: number
}

interface Chapter {
  id: string
  title: string
  classroom_id: string
}

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get lesson
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()

    if (!lessonData) {
      setLoading(false)
      return
    }

    setLesson(lessonData)

    // Get chapter
    const { data: chapterData } = await supabase
      .from('chapters')
      .select('id, title, classroom_id')
      .eq('id', lessonData.chapter_id)
      .single()

    if (chapterData) {
      setChapter(chapterData)
    }

    // Get all lessons in this chapter for navigation
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id, title, type, order_index')
      .eq('chapter_id', lessonData.chapter_id)
      .order('order_index', { ascending: true })

    if (allLessons) {
      const currentIndex = allLessons.findIndex(l => l.id === id)
      if (currentIndex > 0) {
        setPrevLesson(allLessons[currentIndex - 1] as Lesson)
      }
      if (currentIndex < allLessons.length - 1) {
        setNextLesson(allLessons[currentIndex + 1] as Lesson)
      }
    }

    // Check if completed
    if (user) {
      const { data: progress } = await supabase
        .from('student_progress')
        .select('status')
        .eq('student_id', user.id)
        .eq('lesson_id', id)
        .maybeSingle()

      setIsCompleted(progress?.status === 'completed')
    }

    setLoading(false)
  }

  const markAsCompleted = async () => {
    setCompleting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !lesson) {
      setCompleting(false)
      return
    }

    await supabase.from('student_progress').upsert({
      student_id: user.id,
      lesson_id: id,
      classroom_id: lesson.classroom_id,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,lesson_id' })

    setIsCompleted(true)
    setCompleting(false)

    // Go to next lesson if exists
    if (nextLesson) {
      if (nextLesson.type === 'qcm') {
        router.push(`/quiz/${nextLesson.id}?chapter=${lesson.chapter_id}`)
      } else {
        router.push(`/lesson/${nextLesson.id}`)
      }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'video': return '🎥'
      case 'qcm': return '✅'
      case 'text': return '📝'
      case 'micro_learning': return '💡'
      default: return '📚'
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Leçon non trouvée</h2>
        <Link href="/student/my-courses" style={{ color: '#2b8cee', fontWeight: '600', textDecoration: 'none' }}>
          Retour à mes cours →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          href={`/learn/${chapter?.classroom_id}`} 
          style={{ color: '#617589', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          ← Retour au cours
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {getTypeIcon(lesson.type)}
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#617589', marginBottom: '4px' }}>{chapter?.title}</p>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{lesson.title}</h1>
          </div>
        </div>

        {lesson.description && (
          <p style={{ color: '#617589', marginTop: '12px', lineHeight: '1.6' }}>{lesson.description}</p>
        )}
      </div>

      {/* Content */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden', marginBottom: '24px' }}>
        {/* PDF Viewer */}
        {lesson.type === 'pdf' && lesson.content_url && (
          <div style={{ height: '700px' }}>
            <iframe
              src={`${lesson.content_url}#toolbar=1&navpanes=0`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={lesson.title}
            />
          </div>
        )}

        {/* Video Player */}
        {lesson.type === 'video' && (
          <ProtectedVideoPlayer
            lessonId={lesson.id}
            onProgress={(progress) => {
              if (progress > 90 && !isCompleted) {
                markAsCompleted();
              }
            }}
          />
        )}

        {/* Text Content */}
        {(lesson.type === 'text' || lesson.type === 'micro_learning') && lesson.content_text && (
          <div style={{ padding: '32px' }}>
            <div 
              style={{ 
                lineHeight: '1.8', 
                color: '#111418',
                fontSize: '16px',
                whiteSpace: 'pre-wrap'
              }}
            >
              {lesson.content_text}
            </div>
          </div>
        )}

        {/* No Content */}
        {!lesson.content_url && !lesson.content_text && (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📂</div>
            <p style={{ color: '#617589' }}>Contenu non disponible</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '16px', 
        border: '1px solid #dbe0e6', 
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Previous */}
        <div>
          {prevLesson ? (
            <Link
              href={prevLesson.type === 'qcm' ? `/quiz/${prevLesson.id}` : `/lesson/${prevLesson.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#617589',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              ← Précédent
            </Link>
          ) : (
            <span style={{ color: '#d1d5db', fontSize: '14px' }}>← Précédent</span>
          )}
        </div>

        {/* Mark Complete / Status */}
        <div>
          {isCompleted ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 24px', 
              backgroundColor: '#d1fae5', 
              borderRadius: '10px',
              color: '#16a34a',
              fontWeight: '600'
            }}>
              ✅ Leçon terminée
            </div>
          ) : (
            <button
              onClick={markAsCompleted}
              disabled={completing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: completing ? 'not-allowed' : 'pointer',
                opacity: completing ? 0.7 : 1,
              }}
            >
              {completing ? 'Enregistrement...' : '✓ Marquer comme terminé'}
            </button>
          )}
        </div>

        {/* Next */}
        <div>
          {nextLesson ? (
            <Link
              href={nextLesson.type === 'qcm' ? `/quiz/${nextLesson.id}?chapter=${lesson.chapter_id}` : `/lesson/${nextLesson.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#2b8cee',
                color: 'white',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Suivant →
            </Link>
          ) : (
            <Link
              href={`/learn/${chapter?.classroom_id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#2b8cee',
                color: 'white',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Terminer le chapitre →
            </Link>
          )}
        </div>
      </div>

      {/* Duration info */}
      {lesson.duration_minutes > 0 && (
        <p style={{ textAlign: 'center', color: '#617589', fontSize: '13px', marginTop: '16px' }}>
          ⏱️ Durée estimée : {lesson.duration_minutes} minutes
        </p>
      )}
    </div>
  )
}