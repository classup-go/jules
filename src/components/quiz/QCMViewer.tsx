'use client'

import { useState, useEffect } from 'react'
import { QCMData, QCMQuestion, QCMAnswer, QCMSubmission, QuizResult } from '@/types/quiz'

interface QCMViewerProps {
  qcmData: QCMData
  lessonId: string
  studentId: string
  onSubmit: (submission: QCMSubmission) => Promise<void>
}

export function QCMViewer({ qcmData, lessonId, studentId, onSubmit }: QCMViewerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    qcmData.timeLimit ? qcmData.timeLimit * 60 : null
  )
  const [startTime] = useState(Date.now())

  // Prepare questions (randomize if needed)
  const [questions] = useState<QCMQuestion[]>(() => {
    const qs = [...qcmData.questions]
    if (qcmData.randomizeQuestions) {
      return qs.sort(() => Math.random() - 0.5)
    }
    return qs
  })

  // Prepare answers for each question (randomize if needed)
  const [questionsWithAnswers] = useState<QCMQuestion[]>(() => {
    return questions.map((q) => ({
      ...q,
      answers: qcmData.randomizeAnswers ? [...q.answers].sort(() => Math.random() - 0.5) : q.answers,
    }))
  })

  const currentQuestion = questionsWithAnswers[currentQuestionIndex]

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || isSubmitted) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          if (!isSubmitted) {
            handleSubmit() // Auto-submit when time runs out
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, isSubmitted])

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Toggle answer selection
  const toggleAnswer = (questionId: string, answerId: string, isMultiple: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || []

      if (isMultiple) {
        // Multiple choice - toggle
        if (current.includes(answerId)) {
          return { ...prev, [questionId]: current.filter((id) => id !== answerId) }
        } else {
          return { ...prev, [questionId]: [...current, answerId] }
        }
      } else {
        // Single choice - replace
        return { ...prev, [questionId]: [answerId] }
      }
    })
  }

  // Calculate results
  const calculateResults = (): QuizResult => {
    let totalPoints = 0
    let earnedPoints = 0
    let correctCount = 0
    let incorrectCount = 0

    questions.forEach((question) => {
      totalPoints += question.points
      const selected = selectedAnswers[question.id] || []
      const correctAnswers = question.answers.filter((a) => a.isCorrect).map((a) => a.id)

      // Check if all correct answers are selected and no incorrect ones
      const isCorrect =
        selected.length === correctAnswers.length &&
        selected.every((id) => correctAnswers.includes(id))

      if (isCorrect) {
        earnedPoints += question.points
        correctCount++
      } else {
        incorrectCount++
      }
    })

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = score >= qcmData.passingScore

    return {
      score,
      passed,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
    }
  }

  // Handle submission
  const handleSubmit = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const results = calculateResults()
      setResult(results)

      const submission: QCMSubmission = {
        id: `sub-${Date.now()}`,
        lesson_id: lessonId,
        student_id: studentId,
        answers: selectedAnswers,
        score: results.score,
        passed: results.passed,
        time_spent: results.timeSpent || 0,
        submitted_at: new Date().toISOString(),
      }

      await onSubmit(submission)
      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting QCM:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle retry
  const handleRetry = () => {
    setSelectedAnswers({})
    setIsSubmitted(false)
    setResult(null)
    setCurrentQuestionIndex(0)
    setTimeRemaining(qcmData.timeLimit ? qcmData.timeLimit * 60 : null)
  }

  // Check if question has multiple correct answers
  const hasMultipleCorrectAnswers = (question: QCMQuestion) => {
    return question.answers.filter((a) => a.isCorrect).length > 1
  }

  // Get answer status after submission
  const getAnswerStatus = (questionId: string, answerId: string) => {
    if (!isSubmitted || !qcmData.showCorrectAnswers) return null

    const question = questions.find((q) => q.id === questionId)
    if (!question) return null

    const answer = question.answers.find((a) => a.id === answerId)
    if (!answer) return null

    const isSelected = (selectedAnswers[questionId] || []).includes(answerId)

    if (answer.isCorrect && isSelected) return 'correct-selected'
    if (answer.isCorrect && !isSelected) return 'correct-missed'
    if (!answer.isCorrect && isSelected) return 'incorrect-selected'
    return null
  }

  // Results view
  if (isSubmitted && result) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Results Card */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: '40px',
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            {/* Icon and Status */}
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>
              {result.passed ? '🎉' : '📚'}
            </div>

            <h1
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: result.passed ? '#16a34a' : '#dc2626',
                marginBottom: '8px',
              }}
            >
              {result.passed ? 'Félicitations !' : 'Continuez vos efforts !'}
            </h1>

            <p style={{ fontSize: '16px', color: '#617589', marginBottom: '32px' }}>
              {result.passed
                ? 'Vous avez réussi ce QCM avec succès'
                : `Score minimum requis : ${qcmData.passingScore}%`}
            </p>

            {/* Score Display */}
            <div style={{ marginBottom: '32px' }}>
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: '900',
                  background: result.passed
                    ? 'linear-gradient(135deg, #16a34a, #15803d)'
                    : 'linear-gradient(135deg, #dc2626, #991b1b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '8px',
                }}
              >
                {result.score}%
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '600' }}>SCORE OBTENU</div>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '12px',
                  border: '2px solid #bbf7d0',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', marginBottom: '4px' }}>
                  {result.correctAnswers}
                </div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>Correctes</div>
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '12px',
                  border: '2px solid #fecaca',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', marginBottom: '4px' }}>
                  {result.incorrectAnswers}
                </div>
                <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600' }}>Incorrectes</div>
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '12px',
                  border: '2px solid #bfdbfe',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', marginBottom: '4px' }}>
                  {result.totalQuestions}
                </div>
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>Total</div>
              </div>
            </div>

            {/* Time Spent */}
            {result.timeSpent && (
              <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px' }}>
                ⏱️ Temps passé : {formatTime(result.timeSpent)}
              </div>
            )}

            {/* Retry Button */}
            {qcmData.allowRetry && (
              <button
                onClick={handleRetry}
                style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, #2b8cee, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: '0 4px 15px rgba(43, 140, 238, 0.3)',
                }}
              >
                🔄 Refaire le QCM
              </button>
            )}
          </div>

          {/* Review Answers */}
          {qcmData.showCorrectAnswers && (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                padding: '32px',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111418', marginBottom: '24px' }}>
                📋 Révision des réponses
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {questions.map((question, index) => {
                  const selected = selectedAnswers[question.id] || []
                  const correctAnswers = question.answers.filter((a) => a.isCorrect).map((a) => a.id)
                  const isCorrect =
                    selected.length === correctAnswers.length &&
                    selected.every((id) => correctAnswers.includes(id))

                  return (
                    <div
                      key={question.id}
                      style={{
                        padding: '20px',
                        backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2',
                        borderRadius: '12px',
                        border: `2px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '24px' }}>{isCorrect ? '✅' : '❌'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: '#111418', marginBottom: '4px' }}>
                            Question {index + 1}
                          </div>
                          <div style={{ fontSize: '15px', color: '#374151' }}>{question.question}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {question.answers.map((answer) => {
                          const status = getAnswerStatus(question.id, answer.id)
                          const bgColor =
                            status === 'correct-selected'
                              ? '#dcfce7'
                              : status === 'correct-missed'
                              ? '#fef3c7'
                              : status === 'incorrect-selected'
                              ? '#fee2e2'
                              : '#f9fafb'

                          const borderColor =
                            status === 'correct-selected'
                              ? '#86efac'
                              : status === 'correct-missed'
                              ? '#fde047'
                              : status === 'incorrect-selected'
                              ? '#fca5a5'
                              : '#e5e7eb'

                          return (
                            <div
                              key={answer.id}
                              style={{
                                padding: '12px',
                                backgroundColor: bgColor,
                                borderRadius: '8px',
                                border: `2px solid ${borderColor}`,
                                fontSize: '14px',
                                color: '#374151',
                              }}
                            >
                              {answer.text}
                              {status === 'correct-missed' && (
                                <span style={{ marginLeft: '8px', color: '#ca8a04', fontWeight: '600' }}>
                                  (Bonne réponse)
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {question.explanation && (
                        <div
                          style={{
                            padding: '12px',
                            backgroundColor: 'rgba(43, 140, 238, 0.05)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                        >
                          <strong style={{ color: '#2563eb' }}>💡 Explication :</strong> {question.explanation}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Quiz view
  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111418', marginBottom: '4px' }}>
                {qcmData.title}
              </h1>
              {qcmData.description && (
                <p style={{ fontSize: '14px', color: '#617589' }}>{qcmData.description}</p>
              )}
            </div>

            {timeRemaining !== null && (
              <div
                style={{
                  padding: '12px 20px',
                  backgroundColor: timeRemaining < 60 ? '#fef2f2' : '#eff6ff',
                  borderRadius: '12px',
                  border: `2px solid ${timeRemaining < 60 ? '#fecaca' : '#bfdbfe'}`,
                }}
              >
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', marginBottom: '2px' }}>
                  TEMPS RESTANT
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: timeRemaining < 60 ? '#dc2626' : '#2563eb',
                  }}
                >
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#617589' }}>
                Question {currentQuestionIndex + 1} sur {questions.length}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#2b8cee' }}>
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '999px' }}>
              <div
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #2b8cee, #1d4ed8)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '32px',
            marginBottom: '24px',
          }}
        >
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#2b8cee' }}>
              Question {currentQuestionIndex + 1}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#617589',
                padding: '4px 12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '999px',
              }}
            >
              {currentQuestion.points} {currentQuestion.points > 1 ? 'points' : 'point'}
            </span>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111418', marginBottom: '24px', lineHeight: '1.5' }}>
            {currentQuestion.question}
          </h2>

          {hasMultipleCorrectAnswers(currentQuestion) && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#eff6ff',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#1e40af',
                fontWeight: '600',
              }}
            >
              💡 Plusieurs réponses correctes possibles
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.answers.map((answer, index) => {
              const isSelected = (selectedAnswers[currentQuestion.id] || []).includes(answer.id)
              const isMultiple = hasMultipleCorrectAnswers(currentQuestion)

              return (
                <label
                  key={answer.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    backgroundColor: isSelected ? 'rgba(43, 140, 238, 0.05)' : 'white',
                    border: `2px solid ${isSelected ? '#2b8cee' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#9ca3af'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }
                  }}
                >
                  <input
                    type={isMultiple ? 'checkbox' : 'radio'}
                    checked={isSelected}
                    onChange={() => toggleAnswer(currentQuestion.id, answer.id, isMultiple)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#2b8cee' : '#f3f4f6',
                        color: isSelected ? 'white' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '14px',
                      }}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span style={{ fontSize: '15px', color: '#374151', flex: 1 }}>{answer.text}</span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            style={{
              padding: '14px 28px',
              backgroundColor: currentQuestionIndex === 0 ? '#f3f4f6' : 'white',
              color: currentQuestionIndex === 0 ? '#9ca3af' : '#374151',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Précédent
          </button>

          <div style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {Object.keys(selectedAnswers).length} / {questions.length} réponses
            </span>
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              style={{
                padding: '14px 28px',
                backgroundColor: 'white',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '14px 32px',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #16a34a, #15803d)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 15px rgba(22, 163, 74, 0.3)',
              }}
            >
              {isSubmitting ? '⏳ Soumission...' : '✅ Soumettre le QCM'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
