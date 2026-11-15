'use client'

import { useState } from 'react'
import { QCMData, FillInBlanksData, QCMQuestion, FillInBlank } from '@/types/quiz'

interface QuizEditorProps {
  lessonId: string
  initialData?: QCMData | FillInBlanksData | null
  quizType: 'qcm' | 'fill_in_blanks'
  onSave: (data: QCMData | FillInBlanksData) => Promise<void>
}

export default function QuizEditor({ lessonId, initialData, quizType, onSave }: QuizEditorProps) {
  const [saving, setSaving] = useState(false)

  // QCM State
  const [qcmData, setQcmData] = useState<QCMData>(
    quizType === 'qcm' && initialData
      ? (initialData as QCMData)
      : {
          title: '',
          description: '',
          questions: [],
          passingScore: 60,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showCorrectAnswers: true,
          allowRetry: true,
        }
  )

  // Fill in Blanks State
  const [fibData, setFibData] = useState<FillInBlanksData>(
    quizType === 'fill_in_blanks' && initialData
      ? (initialData as FillInBlanksData)
      : {
          title: '',
          description: '',
          text: '',
          blanks: [],
          caseSensitive: false,
          acceptSynonyms: true,
          showHints: true,
          passingScore: 60,
          allowRetry: true,
        }
  )

  // ==================== QCM Functions ====================

  const addQuestion = () => {
    const newQuestion: QCMQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      points: 1,
      answers: [
        { id: `a_${Date.now()}_1`, text: '', isCorrect: false },
        { id: `a_${Date.now()}_2`, text: '', isCorrect: false },
      ],
    }
    setQcmData({ ...qcmData, questions: [...qcmData.questions, newQuestion] })
  }

  const updateQuestion = (index: number, field: keyof QCMQuestion, value: any) => {
    const updated = [...qcmData.questions]
    updated[index] = { ...updated[index], [field]: value }
    setQcmData({ ...qcmData, questions: updated })
  }

  const removeQuestion = (index: number) => {
    const updated = qcmData.questions.filter((_, i) => i !== index)
    setQcmData({ ...qcmData, questions: updated })
  }

  const addAnswer = (questionIndex: number) => {
    const updated = [...qcmData.questions]
    const newAnswer = {
      id: `a_${Date.now()}_${updated[questionIndex].answers.length}`,
      text: '',
      isCorrect: false,
    }
    updated[questionIndex].answers.push(newAnswer)
    setQcmData({ ...qcmData, questions: updated })
  }

  const updateAnswer = (questionIndex: number, answerIndex: number, field: 'text' | 'isCorrect', value: any) => {
    const updated = [...qcmData.questions]
    if (field === 'isCorrect' && value) {
      // Only one correct answer
      updated[questionIndex].answers.forEach((a, i) => {
        a.isCorrect = i === answerIndex
      })
    } else {
      updated[questionIndex].answers[answerIndex][field] = value
    }
    setQcmData({ ...qcmData, questions: updated })
  }

  const removeAnswer = (questionIndex: number, answerIndex: number) => {
    const updated = [...qcmData.questions]
    updated[questionIndex].answers = updated[questionIndex].answers.filter((_, i) => i !== answerIndex)
    setQcmData({ ...qcmData, questions: updated })
  }

  // ==================== Fill in Blanks Functions ====================

  const detectBlanks = (text: string) => {
    // Detect {{1}}, {{2}}, etc.
    const regex = /\{\{(\d+)\}\}/g
    const matches = Array.from(text.matchAll(regex))
    const positions = matches.map((m) => parseInt(m[1]))
    const uniquePositions = [...new Set(positions)].sort((a, b) => a - b)

    // Create blanks for new positions
    const newBlanks: FillInBlank[] = uniquePositions.map((pos) => {
      const existing = fibData.blanks.find((b) => b.position === pos)
      return (
        existing || {
          id: `b_${pos}`,
          position: pos,
          correctAnswers: [''],
          points: 1,
        }
      )
    })

    setFibData({ ...fibData, text, blanks: newBlanks })
  }

  const updateBlank = (position: number, field: keyof FillInBlank, value: any) => {
    const updated = fibData.blanks.map((blank) =>
      blank.position === position ? { ...blank, [field]: value } : blank
    )
    setFibData({ ...fibData, blanks: updated })
  }

  const addCorrectAnswer = (position: number) => {
    const updated = fibData.blanks.map((blank) =>
      blank.position === position ? { ...blank, correctAnswers: [...blank.correctAnswers, ''] } : blank
    )
    setFibData({ ...fibData, blanks: updated })
  }

  const updateCorrectAnswer = (position: number, answerIndex: number, value: string) => {
    const updated = fibData.blanks.map((blank) => {
      if (blank.position === position) {
        const answers = [...blank.correctAnswers]
        answers[answerIndex] = value
        return { ...blank, correctAnswers: answers }
      }
      return blank
    })
    setFibData({ ...fibData, blanks: updated })
  }

  const removeCorrectAnswer = (position: number, answerIndex: number) => {
    const updated = fibData.blanks.map((blank) => {
      if (blank.position === position) {
        return { ...blank, correctAnswers: blank.correctAnswers.filter((_, i) => i !== answerIndex) }
      }
      return blank
    })
    setFibData({ ...fibData, blanks: updated })
  }

  // ==================== Save ====================

  const handleSave = async () => {
    setSaving(true)
    try {
      const dataToSave = quizType === 'qcm' ? qcmData : fibData
      console.log('QuizEditor: Saving quiz data:', {
        quizType,
        hasQuestions: quizType === 'qcm' ? qcmData.questions.length : fibData.blanks.length,
        title: dataToSave.title
      })
      await onSave(dataToSave)
      console.log('QuizEditor: Quiz data saved successfully')
      alert('✓ Quiz configuré! Cliquez sur "Enregistrer la leçon" en bas pour finaliser.')
    } catch (error) {
      console.error('QuizEditor: Error saving quiz:', error)
      alert('Erreur lors de la sauvegarde du quiz: ' + (error instanceof Error ? error.message : 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  // ==================== Render ====================

  return (
    <div>
      {/* Common Fields */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
          Titre du {quizType === 'qcm' ? 'QCM' : 'Texte à trou'}
        </label>
        <input
          type="text"
          value={quizType === 'qcm' ? qcmData.title : fibData.title}
          onChange={(e) => {
            if (quizType === 'qcm') {
              setQcmData({ ...qcmData, title: e.target.value })
            } else {
              setFibData({ ...fibData, title: e.target.value })
            }
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #dbe0e6',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Description</label>
        <textarea
          value={quizType === 'qcm' ? qcmData.description : fibData.description}
          onChange={(e) => {
            if (quizType === 'qcm') {
              setQcmData({ ...qcmData, description: e.target.value })
            } else {
              setFibData({ ...fibData, description: e.target.value })
            }
          }}
          rows={2}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #dbe0e6',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* QCM Content */}
      {quizType === 'qcm' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>Questions</h3>
            <button
              type="button"
              onClick={addQuestion}
              style={{
                padding: '10px 16px',
                backgroundColor: '#2b8cee',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              + Ajouter une question
            </button>
          </div>

          {qcmData.questions.map((q, qIndex) => (
            <div
              key={q.id}
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', color: '#111418' }}>Question {qIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  style={{
                    padding: '6px 10px',
                    color: '#dc2626',
                    backgroundColor: '#fee2e2',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  🗑️
                </button>
              </div>

              <textarea
                value={q.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                placeholder="Écrivez votre question..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #dbe0e6',
                  marginBottom: '12px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  resize: 'vertical',
                }}
              />

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#617589', marginBottom: '4px', display: 'block' }}>Points</label>
                  <input
                    type="number"
                    min="1"
                    value={q.points}
                    onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                    style={{
                      width: '80px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #dbe0e6',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <p style={{ fontSize: '13px', fontWeight: '500', color: '#617589', marginBottom: '10px' }}>
                Réponses (cliquez sur le cercle pour marquer la bonne réponse)
              </p>

              {q.answers.map((a, aIndex) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div
                    onClick={() => updateAnswer(qIndex, aIndex, 'isCorrect', true)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: a.isCorrect ? '2px solid #16a34a' : '2px solid #d1d5db',
                      backgroundColor: a.isCorrect ? '#16a34a' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                  >
                    {a.isCorrect && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <input
                    type="text"
                    value={a.text}
                    onChange={(e) => updateAnswer(qIndex, aIndex, 'text', e.target.value)}
                    placeholder={`Réponse ${aIndex + 1}`}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: a.isCorrect ? '2px solid #16a34a' : '1px solid #dbe0e6',
                      fontSize: '14px',
                      backgroundColor: a.isCorrect ? 'rgba(22, 163, 74, 0.05)' : 'white',
                      transition: 'all 0.2s',
                    }}
                  />

                  {a.isCorrect && (
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      ✓ Correcte
                    </span>
                  )}

                  {q.answers.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeAnswer(qIndex, aIndex)}
                      style={{
                        padding: '8px',
                        color: '#dc2626',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {q.answers.length < 6 && (
                <button
                  type="button"
                  onClick={() => addAnswer(qIndex)}
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#617589',
                    backgroundColor: 'white',
                    border: '1px dashed #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  + Ajouter une réponse
                </button>
              )}
            </div>
          ))}

          {qcmData.questions.length === 0 && (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '2px dashed #dbe0e6',
              }}
            >
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📝</span>
              <p style={{ color: '#617589', marginBottom: '16px' }}>Aucune question pour le moment</p>
              <button
                type="button"
                onClick={addQuestion}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2b8cee',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Créer la première question
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fill in Blanks Content */}
      {quizType === 'fill_in_blanks' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Texte avec trous
            </label>
            <p style={{ fontSize: '13px', color: '#617589', marginBottom: '8px' }}>
              Utilisez <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{'{{1}}'}</code>,{' '}
              <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{'{{2}}'}</code>, etc. pour
              marquer les trous
            </p>
            <textarea
              value={fibData.text}
              onChange={(e) => detectBlanks(e.target.value)}
              placeholder="Exemple: La capitale de la France est {{1}}. Elle compte {{2}} millions d'habitants."
              rows={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {fibData.blanks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '12px' }}>
                Configuration des trous
              </h3>

              {fibData.blanks.map((blank) => (
                <div
                  key={blank.id}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600', color: '#111418' }}>Trou #{blank.position}</span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', color: '#617589', marginBottom: '6px', display: 'block' }}>
                      Réponses correctes
                    </label>
                    {blank.correctAnswers.map((answer, aIndex) => (
                      <div key={aIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => updateCorrectAnswer(blank.position, aIndex, e.target.value)}
                          placeholder={`Réponse ${aIndex + 1}`}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #dbe0e6',
                            fontSize: '14px',
                          }}
                        />
                        {blank.correctAnswers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCorrectAnswer(blank.position, aIndex)}
                            style={{
                              padding: '8px',
                              color: '#dc2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addCorrectAnswer(blank.position)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#617589',
                        backgroundColor: 'white',
                        border: '1px dashed #d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      + Ajouter une variante
                    </button>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', color: '#617589', marginBottom: '6px', display: 'block' }}>
                      Indice (optionnel)
                    </label>
                    <input
                      type="text"
                      value={blank.hint || ''}
                      onChange={(e) => updateBlank(blank.position, 'hint', e.target.value)}
                      placeholder="Donnez un indice pour aider l'étudiant"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #dbe0e6',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', color: '#617589', marginBottom: '6px', display: 'block' }}>Points</label>
                    <input
                      type="number"
                      min="1"
                      value={blank.points}
                      onChange={(e) => updateBlank(blank.position, 'points', parseInt(e.target.value) || 1)}
                      style={{
                        width: '80px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #dbe0e6',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>Paramètres</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '14px', color: '#617589', marginBottom: '6px', display: 'block' }}>
            Score de passage (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={quizType === 'qcm' ? qcmData.passingScore : fibData.passingScore}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0
              if (quizType === 'qcm') {
                setQcmData({ ...qcmData, passingScore: value })
              } else {
                setFibData({ ...fibData, passingScore: value })
              }
            }}
            style={{
              width: '100px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #dbe0e6',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={quizType === 'qcm' ? qcmData.allowRetry : fibData.allowRetry}
              onChange={(e) => {
                if (quizType === 'qcm') {
                  setQcmData({ ...qcmData, allowRetry: e.target.checked })
                } else {
                  setFibData({ ...fibData, allowRetry: e.target.checked })
                }
              }}
            />
            <span style={{ fontSize: '14px', color: '#111418' }}>Autoriser les étudiants à refaire le quiz</span>
          </label>

          {quizType === 'qcm' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={qcmData.showCorrectAnswers}
                  onChange={(e) => setQcmData({ ...qcmData, showCorrectAnswers: e.target.checked })}
                />
                <span style={{ fontSize: '14px', color: '#111418' }}>Afficher les corrections après soumission</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={qcmData.randomizeQuestions}
                  onChange={(e) => setQcmData({ ...qcmData, randomizeQuestions: e.target.checked })}
                />
                <span style={{ fontSize: '14px', color: '#111418' }}>Mélanger l'ordre des questions</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={qcmData.randomizeAnswers}
                  onChange={(e) => setQcmData({ ...qcmData, randomizeAnswers: e.target.checked })}
                />
                <span style={{ fontSize: '14px', color: '#111418' }}>Mélanger l'ordre des réponses</span>
              </label>
            </>
          )}

          {quizType === 'fill_in_blanks' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fibData.caseSensitive}
                  onChange={(e) => setFibData({ ...fibData, caseSensitive: e.target.checked })}
                />
                <span style={{ fontSize: '14px', color: '#111418' }}>Sensible à la casse (majuscules/minuscules)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fibData.showHints}
                  onChange={(e) => setFibData({ ...fibData, showHints: e.target.checked })}
                />
                <span style={{ fontSize: '14px', color: '#111418' }}>Afficher les indices</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '600',
          fontSize: '16px',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Enregistrement...' : '✓ Enregistrer le quiz'}
      </button>
    </div>
  )
}
