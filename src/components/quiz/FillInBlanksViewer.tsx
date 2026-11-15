'use client'

import { useState } from 'react'
import { FillInBlanksData, FillInBlank, FillInBlanksSubmission, QuizResult } from '@/types/quiz'

interface FillInBlanksViewerProps {
  fibData: FillInBlanksData
  lessonId: string
  studentId: string
  onSubmit: (submission: FillInBlanksSubmission) => Promise<void>
}

export function FillInBlanksViewer({ fibData, lessonId, studentId, onSubmit }: FillInBlanksViewerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [showHints, setShowHints] = useState<Record<string, boolean>>({})
  const [startTime] = useState(Date.now())
  const [validation, setValidation] = useState<Record<string, boolean>>({})

  // Update answer
  const updateAnswer = (position: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [position.toString()]: value }))
  }

  // Toggle hint visibility
  const toggleHint = (position: number) => {
    setShowHints((prev) => ({ ...prev, [position.toString()]: !prev[position.toString()] }))
  }

  // Check if answer is correct
  const checkAnswer = (blank: FillInBlank, answer: string): boolean => {
    const normalizedAnswer = fibData.caseSensitive ? answer.trim() : answer.trim().toLowerCase()

    return blank.correctAnswers.some((correct) => {
      const normalizedCorrect = fibData.caseSensitive ? correct.trim() : correct.trim().toLowerCase()
      return normalizedAnswer === normalizedCorrect
    })
  }

  // Calculate results
  const calculateResults = (): QuizResult => {
    let totalPoints = 0
    let earnedPoints = 0
    let correctCount = 0
    let incorrectCount = 0

    const validationResults: Record<string, boolean> = {}

    fibData.blanks.forEach((blank) => {
      totalPoints += blank.points
      const answer = answers[blank.position.toString()] || ''
      const isCorrect = checkAnswer(blank, answer)

      validationResults[blank.position.toString()] = isCorrect

      if (isCorrect) {
        earnedPoints += blank.points
        correctCount++
      } else {
        incorrectCount++
      }
    })

    setValidation(validationResults)

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = score >= fibData.passingScore

    return {
      score,
      passed,
      totalQuestions: fibData.blanks.length,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      timeSpent: Math.floor((Date.now() - startTime) / 1000),
    }
  }

  // Handle submission
  const handleSubmit = async () => {
    if (isSubmitting) return

    // Check if all blanks are filled
    const allFilled = fibData.blanks.every((blank) => {
      const answer = answers[blank.position.toString()]
      return answer && answer.trim().length > 0
    })

    if (!allFilled) {
      alert('Veuillez remplir tous les trous avant de soumettre.')
      return
    }

    setIsSubmitting(true)

    try {
      const results = calculateResults()
      setResult(results)

      const submission: FillInBlanksSubmission = {
        id: `sub-${Date.now()}`,
        lesson_id: lessonId,
        student_id: studentId,
        answers,
        score: results.score,
        passed: results.passed,
        submitted_at: new Date().toISOString(),
      }

      await onSubmit(submission)
      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting fill-in-blanks:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle retry
  const handleRetry = () => {
    setAnswers({})
    setIsSubmitted(false)
    setResult(null)
    setShowHints({})
    setValidation({})
  }

  // Parse text and create input fields
  const renderTextWithBlanks = () => {
    const parts: JSX.Element[] = []
    let lastIndex = 0
    const regex = /\{\{(\d+)\}\}/g
    let match

    while ((match = regex.exec(fibData.text)) !== null) {
      const position = parseInt(match[1])
      const blank = fibData.blanks.find((b) => b.position === position)

      // Add text before the placeholder
      if (match.index > lastIndex) {
        const textBefore = fibData.text.substring(lastIndex, match.index)
        parts.push(
          <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
            {textBefore}
          </span>
        )
      }

      // Add input field for blank
      if (blank) {
        const answer = answers[position.toString()] || ''
        const isCorrect = validation[position.toString()]
        const isIncorrect = isSubmitted && validation[position.toString()] === false

        parts.push(
          <span key={`blank-${position}`} style={{ display: 'inline-block', margin: '0 4px' }}>
            <input
              type="text"
              value={answer}
              onChange={(e) => updateAnswer(position, e.target.value)}
              disabled={isSubmitted}
              placeholder={isSubmitted ? '' : '...'}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: isSubmitted
                  ? `2px solid ${isCorrect ? '#16a34a' : '#dc2626'}`
                  : '2px solid #2b8cee',
                backgroundColor: isSubmitted
                  ? isCorrect
                    ? '#dcfce7'
                    : '#fee2e2'
                  : 'white',
                fontSize: '14px',
                fontWeight: '600',
                minWidth: '120px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {isSubmitted && isCorrect && (
              <span style={{ marginLeft: '4px', color: '#16a34a' }}>✓</span>
            )}
            {isIncorrect && (
              <span style={{ marginLeft: '4px', color: '#dc2626' }}>✗</span>
            )}
          </span>
        )
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < fibData.text.length) {
      const textAfter = fibData.text.substring(lastIndex)
      parts.push(
        <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
          {textAfter}
        </span>
      )
    }

    return parts
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
                ? 'Vous avez réussi cet exercice avec succès'
                : `Score minimum requis : ${fibData.passingScore}%`}
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
                ⏱️ Temps passé : {Math.floor(result.timeSpent / 60)}:
                {(result.timeSpent % 60).toString().padStart(2, '0')}
              </div>
            )}

            {/* Retry Button */}
            {fibData.allowRetry && (
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
                🔄 Refaire l'exercice
              </button>
            )}
          </div>

          {/* Review Answers */}
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

            <div
              style={{
                padding: '24px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                fontSize: '16px',
                lineHeight: '2',
                color: '#374151',
                marginBottom: '24px',
              }}
            >
              {renderTextWithBlanks()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {fibData.blanks.map((blank) => {
                const answer = answers[blank.position.toString()] || ''
                const isCorrect = validation[blank.position.toString()]

                return (
                  <div
                    key={blank.id}
                    style={{
                      padding: '16px',
                      backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2',
                      borderRadius: '12px',
                      border: `2px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{isCorrect ? '✅' : '❌'}</span>
                      <span style={{ fontWeight: '700', color: '#111418' }}>
                        Trou {'{{'}{blank.position}{'}}'}
                      </span>
                    </div>

                    <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                      <strong>Votre réponse :</strong>{' '}
                      <span style={{ color: isCorrect ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                        {answer || '(vide)'}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                        <strong>Réponses acceptées :</strong> {blank.correctAnswers.join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Exercise view
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
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111418', marginBottom: '4px' }}>
            {fibData.title}
          </h1>
          {fibData.description && (
            <p style={{ fontSize: '14px', color: '#617589' }}>{fibData.description}</p>
          )}

          {/* Progress */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#617589' }}>
                Progression
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#2b8cee' }}>
                {Object.keys(answers).filter((k) => answers[k]?.trim().length > 0).length} / {fibData.blanks.length} trous
                remplis
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '999px' }}>
              <div
                style={{
                  width: `${
                    (Object.keys(answers).filter((k) => answers[k]?.trim().length > 0).length /
                      fibData.blanks.length) *
                    100
                  }%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #2b8cee, #1d4ed8)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Text with Blanks */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '32px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              lineHeight: '2.2',
              color: '#374151',
              fontFamily: 'inherit',
            }}
          >
            {renderTextWithBlanks()}
          </div>
        </div>

        {/* Hints */}
        {fibData.showHints && fibData.blanks.some((b) => b.hint) && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: '32px',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111418', marginBottom: '16px' }}>
              💡 Indices
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fibData.blanks
                .filter((blank) => blank.hint)
                .map((blank) => {
                  const isShown = showHints[blank.position.toString()]

                  return (
                    <div
                      key={blank.id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#111418', fontSize: '14px' }}>
                          Trou {'{{'}{blank.position}{'}}'}
                        </span>
                        <button
                          onClick={() => toggleHint(blank.position)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: isShown ? '#eff6ff' : '#2b8cee',
                            color: isShown ? '#2563eb' : 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {isShown ? 'Masquer' : 'Afficher l\'indice'}
                        </button>
                      </div>

                      {isShown && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: '#eff6ff',
                            borderRadius: '8px',
                            fontSize: '14px',
                            color: '#1e40af',
                          }}
                        >
                          {blank.hint}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '16px 48px',
              background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: isSubmitting ? 'wait' : 'pointer',
              fontSize: '16px',
              boxShadow: '0 4px 15px rgba(22, 163, 74, 0.3)',
            }}
          >
            {isSubmitting ? '⏳ Soumission...' : '✅ Soumettre l\'exercice'}
          </button>
        </div>
      </div>
    </div>
  )
}
