'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { QCMData, FillInBlanksData, QuizType } from '@/types/quiz'

interface QuizData {
  id: string
  lesson_id: string
  quiz_type: QuizType
  data: QCMData | FillInBlanksData
}

interface Submission {
  answers: any
  score: number
  passed: boolean
  time_spent: number
  submitted_at: string
}

export default function QuizResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const score = searchParams.get('score')
  const passed = searchParams.get('passed') === 'true'

  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [lessonTitle, setLessonTitle] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [nextLesson, setNextLesson] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get lesson info
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('title, classroom_id, chapter_id, order_index')
      .eq('id', id)
      .single()

    if (lessonData) {
      setLessonTitle(lessonData.title)
      setClassroomId(lessonData.classroom_id)

      // Get next lesson
      const { data: nextLessonData } = await supabase
        .from('lessons')
        .select('id, title, type')
        .eq('chapter_id', lessonData.chapter_id)
        .gt('order_index', lessonData.order_index)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (nextLessonData) {
        setNextLesson(nextLessonData)
      }
    }

    // Get quiz
    const { data: quizData } = await supabase.from('lesson_quizzes').select('*').eq('lesson_id', id).single()

    if (quizData) {
      setQuiz(quizData as QuizData)
    }

    // Get latest submission
    const { data: submissionData } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('lesson_id', id)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (submissionData) {
      setSubmission(submissionData as Submission)
    }

    setLoading(false)
  }

  const handleRetry = () => {
    router.push(`/quiz/${id}`)
  }

  const handleNext = () => {
    if (nextLesson) {
      if (nextLesson.type === 'qcm') {
        router.push(`/quiz/${nextLesson.id}`)
      } else {
        router.push(`/lesson/${nextLesson.id}`)
      }
    } else {
      router.push(`/learn/${classroomId}`)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement des résultats...</p>
      </div>
    )
  }

  if (!quiz || !submission) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
          Résultats non disponibles
        </h2>
        <Link href="/student/my-courses" style={{ color: '#2b8cee', fontWeight: '600', textDecoration: 'none' }}>
          Retour à mes cours →
        </Link>
      </div>
    )
  }

  const qcmData = quiz.quiz_type === 'qcm' ? (quiz.data as QCMData) : null
  const fibData = quiz.quiz_type === 'fill_in_blanks' ? (quiz.data as FillInBlanksData) : null

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link
          href={`/learn/${classroomId}`}
          style={{
            color: '#617589',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← Retour au cours
        </Link>

        <div style={{ marginTop: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
            Résultats du quiz
          </h1>
          <p style={{ color: '#617589' }}>{quiz.data.title || lessonTitle}</p>
        </div>
      </div>

      {/* Score Card */}
      <div
        style={{
          backgroundColor: passed ? '#d1fae5' : '#fee2e2',
          borderRadius: '16px',
          border: `2px solid ${passed ? '#16a34a' : '#dc2626'}`,
          padding: '32px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{passed ? '🎉' : '😔'}</div>
        <h2
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: passed ? '#16a34a' : '#dc2626',
            marginBottom: '8px',
          }}
        >
          {submission.score}%
        </h2>
        <p style={{ fontSize: '18px', color: passed ? '#15803d' : '#b91c1c', fontWeight: '600', marginBottom: '16px' }}>
          {passed ? 'Quiz réussi !' : 'Quiz échoué'}
        </p>
        <p style={{ fontSize: '14px', color: '#617589' }}>
          Score de passage : {quiz.data.passingScore}% • Temps passé : {formatTime(submission.time_spent)}
        </p>
      </div>

      {/* Correction - QCM */}
      {qcmData && qcmData.showCorrectAnswers && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '24px' }}>Correction détaillée</h3>

          {qcmData.questions.map((q, qIndex) => {
            const userAnswerId = submission.answers[q.id]
            const correctAnswer = q.answers.find((a) => a.isCorrect)
            const userAnswer = q.answers.find((a) => a.id === userAnswerId)
            const isCorrect = userAnswerId === correctAnswer?.id

            return (
              <div
                key={q.id}
                style={{
                  marginBottom: '24px',
                  paddingBottom: '24px',
                  borderBottom: qIndex < qcmData.questions.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isCorrect ? '#d1fae5' : '#fee2e2',
                      color: isCorrect ? '#16a34a' : '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                    }}
                  >
                    {isCorrect ? '✓' : '✗'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: '#617589', marginBottom: '4px' }}>
                      Question {qIndex + 1}/{qcmData.questions.length}
                    </p>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>{q.question}</h4>
                  </div>
                </div>

                <div style={{ marginLeft: '44px' }}>
                  {q.answers.map((a) => {
                    const isUserAnswer = a.id === userAnswerId
                    const isCorrectAnswer = a.isCorrect

                    let backgroundColor = 'white'
                    let borderColor = '#e5e7eb'
                    let textColor = '#617589'

                    if (isCorrectAnswer) {
                      backgroundColor = '#d1fae5'
                      borderColor = '#16a34a'
                      textColor = '#16a34a'
                    } else if (isUserAnswer && !isCorrect) {
                      backgroundColor = '#fee2e2'
                      borderColor = '#dc2626'
                      textColor = '#dc2626'
                    }

                    return (
                      <div
                        key={a.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: `2px solid ${borderColor}`,
                          backgroundColor,
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        {isCorrectAnswer && <span style={{ fontSize: '16px' }}>✓</span>}
                        {isUserAnswer && !isCorrect && <span style={{ fontSize: '16px' }}>✗</span>}
                        <span style={{ fontSize: '14px', color: textColor, fontWeight: isCorrectAnswer ? '600' : '400' }}>
                          {a.text}
                        </span>
                        {isUserAnswer && <span style={{ fontSize: '12px', color: textColor, marginLeft: 'auto' }}>(Votre réponse)</span>}
                      </div>
                    )
                  })}

                  {q.explanation && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        borderLeft: '3px solid #2b8cee',
                      }}
                    >
                      <p style={{ fontSize: '13px', color: '#617589' }}>
                        <strong>💡 Explication :</strong> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Correction - Fill in Blanks */}
      {fibData && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '24px' }}>Correction détaillée</h3>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '15px', color: '#111418', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {fibData.text.split(/(\{\{\d+\}\})/).map((part, index) => {
                const match = part.match(/\{\{(\d+)\}\}/)
                if (match) {
                  const position = match[1]
                  const blank = fibData.blanks.find((b) => b.position === parseInt(position))
                  const userAnswer = submission.answers[position]?.trim() || ''

                  const isCorrect = blank?.correctAnswers.some((correct) => {
                    if (fibData.caseSensitive) {
                      return correct === userAnswer
                    } else {
                      return correct.toLowerCase() === userAnswer.toLowerCase()
                    }
                  })

                  return (
                    <span
                      key={index}
                      style={{
                        display: 'inline-block',
                        margin: '0 4px',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        backgroundColor: isCorrect ? '#d1fae5' : '#fee2e2',
                        color: isCorrect ? '#16a34a' : '#dc2626',
                        fontWeight: '600',
                      }}
                    >
                      {userAnswer || '(vide)'}
                    </span>
                  )
                }
                return <span key={index}>{part}</span>
              })}
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111418', marginBottom: '12px' }}>Réponses correctes</h4>
            {fibData.blanks.map((blank) => {
              const userAnswer = submission.answers[blank.position.toString()]?.trim() || ''
              const isCorrect = blank.correctAnswers.some((correct) => {
                if (fibData.caseSensitive) {
                  return correct === userAnswer
                } else {
                  return correct.toLowerCase() === userAnswer.toLowerCase()
                }
              })

              return (
                <div key={blank.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>Trou #{blank.position}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#617589', marginLeft: '24px' }}>
                    Votre réponse : <strong style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>{userAnswer || '(vide)'}</strong>
                  </p>
                  {!isCorrect && (
                    <p style={{ fontSize: '13px', color: '#617589', marginLeft: '24px' }}>
                      Réponses acceptées : <strong style={{ color: '#16a34a' }}>{blank.correctAnswers.join(', ')}</strong>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        {quiz.data.allowRetry && (
          <button
            onClick={handleRetry}
            style={{
              padding: '14px 24px',
              backgroundColor: '#f3f4f6',
              color: '#111418',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🔄 Refaire le quiz
          </button>
        )}

        <button
          onClick={handleNext}
          style={{
            padding: '14px 24px',
            backgroundColor: '#2b8cee',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          {nextLesson ? 'Continuer le cours →' : 'Retour au cours'}
        </button>
      </div>
    </div>
  )
}
