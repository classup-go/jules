'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Chapter {
  id: string
  title: string
  order_index: number
  required_score: number
  lessons: Lesson[]
  isUnlocked: boolean
  isCompleted: boolean
  qcmScore?: number
}

interface Lesson {
  id: string
  title: string
  type: string
  is_chapter_validation: boolean
  isCompleted: boolean
}

export default function LearnPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = use(params)
  const [classroom, setClassroom] = useState<any>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [classroomId])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)

    try {
      // Get classroom
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .single()

      if (classroomData) {
        setClassroom(classroomData)
      }

      // Get the student's enrollment to find which course they're enrolled in
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id)
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!enrollment || !enrollment.course_id) {
        console.log('No enrollment found for this classroom')
        setLoading(false)
        return
      }

      // Get chapters for the enrolled course (using course_id)
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id, title, order_index, required_score')
        .eq('course_id', enrollment.course_id)
        .order('order_index', { ascending: true })

      if (!chaptersData || chaptersData.length === 0) {
        setLoading(false)
        return
      }

      // Get lessons for all chapters
      const chapterIds = chaptersData.map(c => c.id)
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, type, chapter_id, is_chapter_validation')
        .in('chapter_id', chapterIds)
        .order('order_index', { ascending: true })

      // Get student progress for chapters
      const { data: chapterProgress } = await supabase
        .from('student_chapter_progress')
        .select('chapter_id, is_completed, is_unlocked')
        .eq('student_id', user.id)
        .eq('classroom_id', classroomId)

      const progressMap = new Map(chapterProgress?.map(p => [p.chapter_id, p]) || [])

      // Get best QCM attempts per chapter
      const { data: qcmAttempts } = await supabase
        .from('qcm_attempts')
        .select('chapter_id, percentage, passed')
        .eq('student_id', user.id)
        .in('chapter_id', chapterIds)
        .order('percentage', { ascending: false })

      // Get best score per chapter
      const bestScores = new Map<string, number>()
      qcmAttempts?.forEach(a => {
        if (!bestScores.has(a.chapter_id) || a.percentage > bestScores.get(a.chapter_id)!) {
          bestScores.set(a.chapter_id, a.percentage)
        }
      })

      // Get completed lessons
      const { data: lessonProgress } = await supabase
        .from('student_progress')
        .select('lesson_id, status')
        .eq('student_id', user.id)
        .eq('status', 'completed')

      const completedLessons = new Set(lessonProgress?.map(p => p.lesson_id) || [])

      // Build chapters with lessons and progress
      const enrichedChapters: Chapter[] = chaptersData.map((chapter, index) => {
        const chapterLessons = lessonsData?.filter(l => l.chapter_id === chapter.id) || []
        const progress = progressMap.get(chapter.id)
        const qcmScore = bestScores.get(chapter.id)

        // First chapter is always unlocked
        // Other chapters are unlocked if previous chapter is completed
        let isUnlocked = index === 0
        if (index > 0) {
          const prevChapterId = chaptersData[index - 1].id
          const prevProgress = progressMap.get(prevChapterId)
          isUnlocked = prevProgress?.is_completed || false
        }

        // Check if explicitly unlocked in DB
        if (progress?.is_unlocked) {
          isUnlocked = true
        }

        return {
          ...chapter,
          required_score: chapter.required_score || 75,
          lessons: chapterLessons.map(l => ({
            ...l,
            isCompleted: completedLessons.has(l.id)
          })),
          isUnlocked,
          isCompleted: progress?.is_completed || false,
          qcmScore
        }
      })

      setChapters(enrichedChapters)
    } catch (error) {
      console.error('Error:', error)
    }

    setLoading(false)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'video': return '🎥'
      case 'qcm': return '✅'
      case 'text': return '📝'
      default: return '📚'
    }
  }

  const getSubjectStyle = (subject: string) => {
    const styles: Record<string, { gradient: string, icon: string }> = {
      'Mathématiques': { gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: '📐' },
      'Physique': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '⚡' },
      'Chimie': { gradient: 'linear-gradient(135deg, #ec4899, #db2777)', icon: '🧪' },
      'Français': { gradient: 'linear-gradient(135deg, #a855f7, #9333ea)', icon: '📝' },
    }
    return styles[subject] || { gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', icon: '📚' }
  }

  // Calculate overall progress
  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
  const completedLessons = chapters.reduce((sum, ch) => sum + ch.lessons.filter(l => l.isCompleted).length, 0)
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <p>Cours non trouvé</p>
      </div>
    )
  }

  const style = getSubjectStyle(classroom.subject)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: style.gradient, borderRadius: '20px', padding: '32px', marginBottom: '32px', color: 'white' }}>
        <Link href="/student/my-courses" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
          ← Mes cours
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>{classroom.title}</h1>
        <p style={{ opacity: 0.8, marginBottom: '24px' }}>{classroom.subject} • {classroom.level}</p>
        
        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
            <span>Progression</span>
            <span>{progressPercent}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'white', borderRadius: '4px', transition: 'width 0.3s' }}></div>
          </div>
          <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px' }}>{completedLessons} / {totalLessons} leçons complétées</p>
        </div>
      </div>

      {/* Chapters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {chapters.map((chapter, chapterIndex) => (
          <div
            key={chapter.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #dbe0e6',
              overflow: 'hidden',
              opacity: chapter.isUnlocked ? 1 : 0.6,
            }}
          >
            {/* Chapter Header */}
            <div style={{ 
              padding: '20px 24px', 
              backgroundColor: chapter.isCompleted ? '#d1fae5' : chapter.isUnlocked ? '#f9fafb' : '#f3f4f6',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  backgroundColor: chapter.isCompleted ? '#16a34a' : chapter.isUnlocked ? '#2b8cee' : '#9ca3af',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {chapter.isCompleted ? '✓' : chapter.isUnlocked ? chapterIndex + 1 : '🔒'}
                </div>
                <div>
                  <h3 style={{ fontWeight: '600', color: '#111418', marginBottom: '4px' }}>{chapter.title}</h3>
                  <p style={{ fontSize: '13px', color: '#617589' }}>
                    {chapter.lessons.length} leçons • Score requis: {chapter.required_score}%
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              {chapter.isCompleted ? (
                <span style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: 'white', borderRadius: '20px', fontSize: '13px', fontWeight: '500' }}>
                  ✅ Complété
                </span>
              ) : chapter.qcmScore !== undefined ? (
                <span style={{ 
                  padding: '6px 12px', 
                  backgroundColor: chapter.qcmScore >= chapter.required_score ? '#d1fae5' : '#fef3c7', 
                  color: chapter.qcmScore >= chapter.required_score ? '#16a34a' : '#d97706', 
                  borderRadius: '20px', 
                  fontSize: '13px', 
                  fontWeight: '500' 
                }}>
                  Score: {chapter.qcmScore}%
                </span>
              ) : !chapter.isUnlocked ? (
                <span style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', color: '#9ca3af', borderRadius: '20px', fontSize: '13px' }}>
                  🔒 Verrouillé
                </span>
              ) : null}
            </div>

            {/* Lessons */}
            {chapter.isUnlocked && (
              <div>
                {chapter.lessons.map((lesson, lessonIndex) => (
                  <Link
                    key={lesson.id}
                    href={lesson.type === 'qcm' ? `/quiz/${lesson.id}?chapter=${chapter.id}` : `/lesson/${lesson.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 24px',
                      borderBottom: lessonIndex < chapter.lessons.length - 1 ? '1px solid #f3f4f6' : 'none',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '8px', 
                        backgroundColor: lesson.isCompleted ? '#d1fae5' : '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                      }}>
                        {lesson.isCompleted ? '✓' : getTypeIcon(lesson.type)}
                      </div>
                      <div>
                        <p style={{ fontWeight: '500', color: '#111418', marginBottom: '2px' }}>{lesson.title}</p>
                        <p style={{ fontSize: '12px', color: '#617589' }}>
                          {lesson.type === 'qcm' && lesson.is_chapter_validation ? '📝 QCM de validation' : lesson.type}
                        </p>
                      </div>
                    </div>
                    
                    {lesson.isCompleted ? (
                      <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: '500' }}>Terminé ✓</span>
                    ) : (
                      <span style={{ color: '#2b8cee', fontSize: '13px', fontWeight: '500' }}>Commencer →</span>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Locked Message */}
            {!chapter.isUnlocked && (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  🔒 Complétez le chapitre précédent avec un score ≥ {chapters[chapterIndex - 1]?.required_score || 75}% pour débloquer
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}