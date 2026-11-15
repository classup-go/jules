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

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const chapterId = searchParams.get('chapter')

  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startTime] = useState(Date.now())

  // QCM answers: questionId -> answerId
  const [qcmAnswers, setQcmAnswers] = useState<Record<string, string>>({})

  // Fill in Blanks answers: position -> answer
  const [fibAnswers, setFibAnswers] = useState<Record<string, string>>({})

  const [lessonTitle, setLessonTitle] = useState('')
  const [classroomId, setClassroomId] = useState('')

  useEffect(() => {
    fetchQuiz()
  }, [id])

  const fetchQuiz = async () => {
    const supabase = createClient()

    // Get lesson info
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('title, classroom_id, chapter_id')
      .eq('id', id)
      .single()

    if (lessonData) {
      setLessonTitle(lessonData.title)
      setClassroomId(lessonData.classroom_id)
    }

    // Get quiz
    const { data: quizData, error } = await supabase
      .from('lesson_quizzes')
      .select('*')
      .eq('lesson_id', id)
      .single()

    if (error) {
      console.error('Error fetching quiz:', error)
      setLoading(false)
      return
    }

    if (quizData) {
      setQuiz(quizData as QuizData)

      // Randomize if needed
      if (quizData.quiz_type === 'qcm') {
        const qcmData = quizData.data as QCMData
        let questions = [...qcmData.questions]

        if (qcmData.randomizeQuestions) {
          questions = shuffleArray(questions)
        }

        if (qcmData.randomizeAnswers) {
          questions = questions.map((q) => ({
            ...q,
            answers: shuffleArray([...q.answers]),
          }))
        }

        setQuiz({
          ...quizData,
          data: { ...qcmData, questions },
        } as QuizData)
      }
    }

    setLoading(false)
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const handleSubmit = async () => {
    if (!quiz) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSubmitting(true)

    let score = 0
    let totalPoints = 0
    let correctCount = 0
    let totalCount = 0

    if (quiz.quiz_type === 'qcm') {
      const qcmData = quiz.data as QCMData
      totalCount = qcmData.questions.length

      qcmData.questions.forEach((q) => {
        totalPoints += q.points
        const selectedAnswerId = qcmAnswers[q.id]
        const correctAnswer = q.answers.find((a) => a.isCorrect)

        if (selectedAnswerId === correctAnswer?.id) {
          score += q.points
          correctCount++
        }
      })
    } else {
      const fibData = quiz.data as FillInBlanksData
      totalCount = fibData.blanks.length

      fibData.blanks.forEach((blank) => {
        totalPoints += blank.points
        const userAnswer = fibAnswers[blank.position.toString()]?.trim() || ''

        const isCorrect = blank.correctAnswers.some((correct) => {
          if (fibData.caseSensitive) {
            return correct === userAnswer
          } else {
            return correct.toLowerCase() === userAnswer.toLowerCase()
          }
        })

        if (isCorrect) {
          score += blank.points
          correctCount++
        }
      })
    }

    const percentageScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
    const passed = percentageScore >= (quiz.data.passingScore || 60)
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)

    // Save submission
    const { error } = await supabase.from('quiz_submissions').insert({
      lesson_id: id,
      student_id: user.id,
      quiz_type: quiz.quiz_type,
      answers: quiz.quiz_type === 'qcm' ? qcmAnswers : fibAnswers,
      score: percentageScore,
      passed,
      time_spent: timeSpent,
    })

    if (error) {
      console.error('Error saving submission:', error)
      alert('Erreur lors de la soumission')
      setSubmitting(false)
      return
    }

    // Mark lesson as completed if passed
    if (passed) {
      await supabase.from('student_progress').upsert(
        {
          student_id: user.id,
          lesson_id: id,
          classroom_id: classroomId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,lesson_id' }
      )
    }

    // Redirect to results
    router.push(`/quiz/${id}/results?score=${percentageScore}&passed=${passed}`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement du quiz...</p>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Quiz non trouvé</h2>
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
          href={chapterId ? `/learn/${classroomId}` : '/student/my-courses'}
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
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              backgroundColor: '#dbeafe',
              color: '#2563eb',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '12px',
            }}
          >
            {quiz.quiz_type === 'qcm' ? '✅ QCM' : '📝 Texte à trou'}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
            {quiz.data.title || lessonTitle}
          </h1>
          {quiz.data.description && <p style={{ color: '#617589', lineHeight: '1.6' }}>{quiz.data.description}</p>}
        </div>
      </div>

      {/* Quiz Content */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '32px' }}>
        {/* QCM */}
        {qcmData && (
          <div>
            {qcmData.questions.map((q, qIndex) => (
              <div key={q.id} style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      backgroundColor: '#f3f4f6',
                      color: '#617589',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    Question {qIndex + 1}/{qcmData.questions.length}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', lineHeight: '1.5' }}>{q.question}</h3>
                  <p style={{ fontSize: '13px', color: '#617589', marginTop: '4px' }}>{q.points} point(s)</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {q.answers.map((a) => {
                    const isSelected = qcmAnswers[q.id] === a.id

                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setQcmAnswers({ ...qcmAnswers, [q.id]: a.id })}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #2b8cee' : '2px solid #e5e7eb',
                          backgroundColor: isSelected ? 'rgba(43, 140, 238, 0.05)' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: isSelected ? '2px solid #2b8cee' : '2px solid #d1d5db',
                            backgroundColor: isSelected ? '#2b8cee' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '15px', color: '#111418', fontWeight: isSelected ? '500' : '400' }}>
                          {a.text}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fill in Blanks */}
        {fibData && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '15px', color: '#111418', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {fibData.text.split(/(\{\{\d+\}\})/).map((part, index) => {
                  const match = part.match(/\{\{(\d+)\}\}/)
                  if (match) {
                    const position = match[1]
                    const blank = fibData.blanks.find((b) => b.position === parseInt(position))

                    return (
                      <span key={index} style={{ display: 'inline-block', margin: '0 4px' }}>
                        <input
                          type="text"
                          value={fibAnswers[position] || ''}
                          onChange={(e) => setFibAnswers({ ...fibAnswers, [position]: e.target.value })}
                          placeholder={`Trou #${position}`}
                          style={{
                            width: '200px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '2px solid #2b8cee',
                            fontSize: '15px',
                            backgroundColor: 'rgba(43, 140, 238, 0.05)',
                          }}
                        />
                        {fibData.showHints && blank?.hint && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#617589',
                              marginLeft: '8px',
                              fontStyle: 'italic',
                            }}
                          >
                            💡 {blank.hint}
                          </span>
                        )}
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
                padding: '16px',
                border: '1px solid #e5e7eb',
              }}
            >
              <p style={{ fontSize: '13px', color: '#617589', marginBottom: '8px' }}>
                <strong>Instructions:</strong>
              </p>
              <ul style={{ fontSize: '13px', color: '#617589', marginLeft: '20px', lineHeight: '1.6' }}>
                <li>Remplissez tous les trous dans le texte</li>
                {fibData.caseSensitive && <li>⚠️ Attention aux majuscules et minuscules</li>}
                {fibData.showHints && <li>💡 Des indices sont disponibles pour certains trous</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div
        style={{
          marginTop: '24px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #dbe0e6',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#617589' }}>
              Score de passage : <strong style={{ color: '#111418' }}>{quiz.data.passingScore}%</strong>
            </p>
            {qcmData && (
              <p style={{ fontSize: '13px', color: '#617589', marginTop: '4px' }}>
                {Object.keys(qcmAnswers).length}/{qcmData.questions.length} questions répondues
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '14px 32px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Envoi en cours...' : '✓ Soumettre mes réponses'}
          </button>
        </div>
      </div>
    </div>
  )
}
