'use client'

import { useState } from 'react'
import { QCMData, QCMQuestion, QCMAnswer } from '@/types/quiz'

interface QCMEditorProps {
  initialData?: QCMData
  onSave: (data: QCMData) => void
  onCancel: () => void
}

export function QCMEditor({ initialData, onSave, onCancel }: QCMEditorProps) {
  const [qcmData, setQcmData] = useState<QCMData>(
    initialData || {
      title: '',
      description: '',
      questions: [],
      passingScore: 60,
      randomizeQuestions: false,
      randomizeAnswers: false,
      showCorrectAnswers: true,
      allowRetry: true,
      timeLimit: undefined,
    }
  )

  const [errors, setErrors] = useState<string[]>([])

  // Add a new question
  const addQuestion = () => {
    const newQuestion: QCMQuestion = {
      id: `q-${Date.now()}`,
      question: '',
      explanation: '',
      points: 1,
      answers: [
        { id: `a-${Date.now()}-1`, text: '', isCorrect: false },
        { id: `a-${Date.now()}-2`, text: '', isCorrect: false },
      ],
    }

    setQcmData({
      ...qcmData,
      questions: [...qcmData.questions, newQuestion],
    })
  }

  // Remove a question
  const removeQuestion = (questionId: string) => {
    setQcmData({
      ...qcmData,
      questions: qcmData.questions.filter((q) => q.id !== questionId),
    })
  }

  // Update a question
  const updateQuestion = (questionId: string, updates: Partial<QCMQuestion>) => {
    setQcmData({
      ...qcmData,
      questions: qcmData.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    })
  }

  // Add an answer to a question
  const addAnswer = (questionId: string) => {
    const question = qcmData.questions.find((q) => q.id === questionId)
    if (!question) return

    const newAnswer: QCMAnswer = {
      id: `a-${Date.now()}`,
      text: '',
      isCorrect: false,
    }

    updateQuestion(questionId, {
      answers: [...question.answers, newAnswer],
    })
  }

  // Remove an answer from a question
  const removeAnswer = (questionId: string, answerId: string) => {
    const question = qcmData.questions.find((q) => q.id === questionId)
    if (!question || question.answers.length <= 2) return // Keep at least 2 answers

    updateQuestion(questionId, {
      answers: question.answers.filter((a) => a.id !== answerId),
    })
  }

  // Update an answer
  const updateAnswer = (questionId: string, answerId: string, updates: Partial<QCMAnswer>) => {
    const question = qcmData.questions.find((q) => q.id === questionId)
    if (!question) return

    updateQuestion(questionId, {
      answers: question.answers.map((a) => (a.id === answerId ? { ...a, ...updates } : a)),
    })
  }

  // Validation
  const validate = (): boolean => {
    const newErrors: string[] = []

    if (!qcmData.title || qcmData.title.trim().length < 3) {
      newErrors.push('Le titre doit contenir au moins 3 caractères')
    }

    if (qcmData.questions.length === 0) {
      newErrors.push('Vous devez ajouter au moins une question')
    }

    qcmData.questions.forEach((q, index) => {
      if (!q.question || q.question.trim().length < 5) {
        newErrors.push(`Question ${index + 1}: Le texte doit contenir au moins 5 caractères`)
      }

      if (q.answers.length < 2) {
        newErrors.push(`Question ${index + 1}: Vous devez avoir au moins 2 réponses`)
      }

      const hasCorrectAnswer = q.answers.some((a) => a.isCorrect)
      if (!hasCorrectAnswer) {
        newErrors.push(`Question ${index + 1}: Vous devez marquer au moins une réponse comme correcte`)
      }

      q.answers.forEach((a, aIndex) => {
        if (!a.text || a.text.trim().length === 0) {
          newErrors.push(`Question ${index + 1}, Réponse ${aIndex + 1}: Le texte ne peut pas être vide`)
        }
      })
    })

    if (qcmData.passingScore < 0 || qcmData.passingScore > 100) {
      newErrors.push('Le score de passage doit être entre 0 et 100')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // Handle save
  const handleSave = () => {
    if (validate()) {
      onSave(qcmData)
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111418', marginBottom: '8px' }}>
            ✏️ Créer un QCM
          </h1>
          <p style={{ color: '#617589', fontSize: '14px' }}>
            Créez un quiz à choix multiples pour évaluer vos étudiants
          </p>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div
            style={{
              marginBottom: '24px',
              backgroundColor: '#fef2f2',
              border: '2px solid #fecaca',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
              ⚠️ Erreurs de validation
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#dc2626', fontSize: '14px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* QCM Settings */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '32px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111418', marginBottom: '20px' }}>
            Paramètres du QCM
          </h2>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
              Titre du QCM <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={qcmData.title}
              onChange={(e) => setQcmData({ ...qcmData, title: e.target.value })}
              placeholder="Ex: Quiz de révision - Chapitre 1"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
              Description (optionnel)
            </label>
            <textarea
              value={qcmData.description}
              onChange={(e) => setQcmData({ ...qcmData, description: e.target.value })}
              placeholder="Décrivez brièvement ce QCM..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Settings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Passing Score */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
                Score de passage (%) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={qcmData.passingScore}
                onChange={(e) => setQcmData({ ...qcmData, passingScore: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #dbe0e6',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Time Limit */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
                Limite de temps (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={qcmData.timeLimit || ''}
                onChange={(e) =>
                  setQcmData({ ...qcmData, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="Aucune limite"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #dbe0e6',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={qcmData.randomizeQuestions}
                onChange={(e) => setQcmData({ ...qcmData, randomizeQuestions: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Mélanger l'ordre des questions</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={qcmData.randomizeAnswers}
                onChange={(e) => setQcmData({ ...qcmData, randomizeAnswers: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Mélanger l'ordre des réponses</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={qcmData.showCorrectAnswers}
                onChange={(e) => setQcmData({ ...qcmData, showCorrectAnswers: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Afficher les bonnes réponses après soumission</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={qcmData.allowRetry}
                onChange={(e) => setQcmData({ ...qcmData, allowRetry: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Permettre de refaire le QCM</span>
            </label>
          </div>
        </div>

        {/* Questions */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '32px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111418' }}>
              Questions ({qcmData.questions.length})
            </h2>
            <button
              onClick={addQuestion}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #2b8cee, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ➕ Ajouter une question
            </button>
          </div>

          {qcmData.questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#617589' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>❓</span>
              <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Aucune question</p>
              <p style={{ fontSize: '14px' }}>Commencez par ajouter votre première question</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {qcmData.questions.map((question, qIndex) => (
                <div
                  key={question.id}
                  style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '700', color: '#2b8cee', fontSize: '16px' }}>Question {qIndex + 1}</div>
                    <button
                      onClick={() => removeQuestion(question.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '0',
                      }}
                      title="Supprimer cette question"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Question Text */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '13px' }}>
                      Texte de la question <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                      placeholder="Posez votre question ici..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #dbe0e6',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Points */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '13px' }}>
                      Points
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={question.points}
                      onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 1 })}
                      style={{
                        width: '100px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #dbe0e6',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  {/* Answers */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontWeight: '600', color: '#111418', fontSize: '13px' }}>
                        Réponses <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <button
                        onClick={() => addAnswer(question.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ➕ Ajouter réponse
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {question.answers.map((answer, aIndex) => (
                        <div
                          key={answer.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: 'white',
                            borderRadius: '10px',
                            border: answer.isCorrect ? '2px solid #16a34a' : '1px solid #dbe0e6',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af', minWidth: '20px' }}>
                            {String.fromCharCode(65 + aIndex)}.
                          </div>

                          <input
                            type="text"
                            value={answer.text}
                            onChange={(e) => updateAnswer(question.id, answer.id, { text: e.target.value })}
                            placeholder={`Réponse ${aIndex + 1}`}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #dbe0e6',
                              fontSize: '14px',
                            }}
                          />

                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: answer.isCorrect ? '#16a34a' : '#9ca3af',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={answer.isCorrect}
                              onChange={(e) => updateAnswer(question.id, answer.id, { isCorrect: e.target.checked })}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            Correcte
                          </label>

                          {question.answers.length > 2 && (
                            <button
                              onClick={() => removeAnswer(question.id, answer.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: '0',
                              }}
                              title="Supprimer cette réponse"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '13px' }}>
                      Explication (optionnel)
                    </label>
                    <textarea
                      value={question.explanation || ''}
                      onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                      placeholder="Expliquez la bonne réponse..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #dbe0e6',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <button
            onClick={onCancel}
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
            ← Annuler
          </button>

          <button
            onClick={handleSave}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #2b8cee, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(43, 140, 238, 0.3)',
            }}
          >
            ✅ Enregistrer le QCM
          </button>
        </div>
      </div>
    </div>
  )
}
