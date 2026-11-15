'use client'

import { useState } from 'react'
import { FillInBlanksData, FillInBlank } from '@/types/quiz'

interface FillInBlanksEditorProps {
  initialData?: FillInBlanksData
  onSave: (data: FillInBlanksData) => void
  onCancel: () => void
}

export function FillInBlanksEditor({ initialData, onSave, onCancel }: FillInBlanksEditorProps) {
  const [fibData, setFibData] = useState<FillInBlanksData>(
    initialData || {
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

  const [errors, setErrors] = useState<string[]>([])
  const [textPreview, setTextPreview] = useState('')

  // Extract placeholders from text and create blanks
  const extractBlanks = (text: string) => {
    const regex = /\{\{(\d+)\}\}/g
    const matches = [...text.matchAll(regex)]
    const positions = new Set(matches.map((m) => parseInt(m[1])))

    // Create blanks for new positions
    const newBlanks: FillInBlank[] = []
    const existingBlanks = new Map(fibData.blanks.map((b) => [b.position, b]))

    positions.forEach((pos) => {
      if (existingBlanks.has(pos)) {
        newBlanks.push(existingBlanks.get(pos)!)
      } else {
        newBlanks.push({
          id: `b-${Date.now()}-${pos}`,
          position: pos,
          correctAnswers: [],
          hint: '',
          points: 1,
        })
      }
    })

    // Sort by position
    newBlanks.sort((a, b) => a.position - b.position)

    setFibData({ ...fibData, blanks: newBlanks })
    updateTextPreview(text, newBlanks)
  }

  // Update text preview with highlighted blanks
  const updateTextPreview = (text: string, blanks: FillInBlank[]) => {
    let preview = text
    blanks.forEach((blank) => {
      const placeholder = `{{${blank.position}}}`
      const replacement = `<span style="background-color: #dbeafe; padding: 2px 8px; border-radius: 4px; font-weight: 600; color: #1d4ed8;">{{${blank.position}}}</span>`
      preview = preview.replace(placeholder, replacement)
    })
    setTextPreview(preview)
  }

  // Update text
  const handleTextChange = (newText: string) => {
    setFibData({ ...fibData, text: newText })
    extractBlanks(newText)
  }

  // Update a blank
  const updateBlank = (blankId: string, updates: Partial<FillInBlank>) => {
    setFibData({
      ...fibData,
      blanks: fibData.blanks.map((b) => (b.id === blankId ? { ...b, ...updates } : b)),
    })
  }

  // Add correct answer to a blank
  const addCorrectAnswer = (blankId: string, answer: string) => {
    const blank = fibData.blanks.find((b) => b.id === blankId)
    if (!blank || !answer.trim()) return

    updateBlank(blankId, {
      correctAnswers: [...blank.correctAnswers, answer.trim()],
    })
  }

  // Remove correct answer from a blank
  const removeCorrectAnswer = (blankId: string, answerIndex: number) => {
    const blank = fibData.blanks.find((b) => b.id === blankId)
    if (!blank) return

    updateBlank(blankId, {
      correctAnswers: blank.correctAnswers.filter((_, i) => i !== answerIndex),
    })
  }

  // Validation
  const validate = (): boolean => {
    const newErrors: string[] = []

    if (!fibData.title || fibData.title.trim().length < 3) {
      newErrors.push('Le titre doit contenir au moins 3 caractères')
    }

    if (!fibData.text || fibData.text.trim().length < 10) {
      newErrors.push('Le texte doit contenir au moins 10 caractères')
    }

    if (fibData.blanks.length === 0) {
      newErrors.push('Vous devez avoir au moins un trou (ex: {{1}})')
    }

    fibData.blanks.forEach((blank) => {
      if (blank.correctAnswers.length === 0) {
        newErrors.push(`Trou {{${blank.position}}}: Vous devez définir au moins une réponse correcte`)
      }
    })

    if (fibData.passingScore < 0 || fibData.passingScore > 100) {
      newErrors.push('Le score de passage doit être entre 0 et 100')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  // Handle save
  const handleSave = () => {
    if (validate()) {
      onSave(fibData)
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111418', marginBottom: '8px' }}>
            ✏️ Créer un Texte à Trou
          </h1>
          <p style={{ color: '#617589', fontSize: '14px' }}>
            Créez un exercice de texte à trou pour évaluer vos étudiants
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

        {/* Settings */}
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
            Paramètres de l'exercice
          </h2>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
              Titre de l'exercice <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={fibData.title}
              onChange={(e) => setFibData({ ...fibData, title: e.target.value })}
              placeholder="Ex: Exercice de vocabulaire - Chapitre 2"
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
              value={fibData.description}
              onChange={(e) => setFibData({ ...fibData, description: e.target.value })}
              placeholder="Décrivez brièvement cet exercice..."
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

          {/* Passing Score */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
              Score de passage (%) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={fibData.passingScore}
              onChange={(e) => setFibData({ ...fibData, passingScore: parseInt(e.target.value) || 0 })}
              style={{
                width: '150px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fibData.caseSensitive}
                onChange={(e) => setFibData({ ...fibData, caseSensitive: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Sensible à la casse (majuscules/minuscules)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fibData.acceptSynonyms}
                onChange={(e) => setFibData({ ...fibData, acceptSynonyms: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Accepter les synonymes définis</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fibData.showHints}
                onChange={(e) => setFibData({ ...fibData, showHints: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Afficher les indices</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fibData.allowRetry}
                onChange={(e) => setFibData({ ...fibData, allowRetry: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Permettre de refaire l'exercice</span>
            </label>
          </div>
        </div>

        {/* Text Editor */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '32px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111418', marginBottom: '12px' }}>
            Texte avec trous
          </h2>

          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: '#eff6ff',
              borderRadius: '12px',
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600', marginBottom: '4px' }}>
              💡 Comment créer des trous
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6' }}>
              Utilisez la syntaxe <code style={{ backgroundColor: 'white', padding: '2px 6px', borderRadius: '4px' }}>{'{{1}}'}</code>,{' '}
              <code style={{ backgroundColor: 'white', padding: '2px 6px', borderRadius: '4px' }}>{'{{2}}'}</code>, etc. pour créer des
              trous dans votre texte.
            </div>
          </div>

          {/* Text Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
              Texte <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={fibData.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Exemple: La capitale de la France est {{1}}. Elle compte environ {{2}} millions d'habitants."
              rows={8}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Text Preview */}
          {fibData.text && (
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
                Aperçu
              </label>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: '#374151',
                }}
                dangerouslySetInnerHTML={{ __html: textPreview }}
              />
            </div>
          )}
        </div>

        {/* Blanks Configuration */}
        {fibData.blanks.length > 0 && (
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
              Configuration des trous ({fibData.blanks.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {fibData.blanks.map((blank) => (
                <BlankConfig
                  key={blank.id}
                  blank={blank}
                  onUpdate={(updates) => updateBlank(blank.id, updates)}
                  onAddAnswer={(answer) => addCorrectAnswer(blank.id, answer)}
                  onRemoveAnswer={(index) => removeCorrectAnswer(blank.id, index)}
                />
              ))}
            </div>
          </div>
        )}

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
            ✅ Enregistrer l'exercice
          </button>
        </div>
      </div>
    </div>
  )
}

// Component for configuring a single blank
function BlankConfig({
  blank,
  onUpdate,
  onAddAnswer,
  onRemoveAnswer,
}: {
  blank: FillInBlank
  onUpdate: (updates: Partial<FillInBlank>) => void
  onAddAnswer: (answer: string) => void
  onRemoveAnswer: (index: number) => void
}) {
  const [newAnswer, setNewAnswer] = useState('')

  const handleAddAnswer = () => {
    if (newAnswer.trim()) {
      onAddAnswer(newAnswer)
      setNewAnswer('')
    }
  }

  return (
    <div
      style={{
        border: '2px solid #e5e7eb',
        borderRadius: '16px',
        padding: '20px',
        backgroundColor: '#fafafa',
      }}
    >
      {/* Header */}
      <div style={{ fontWeight: '700', color: '#2b8cee', fontSize: '16px', marginBottom: '16px' }}>
        Trou {'{{'}{blank.position}{'}}'}
      </div>

      {/* Points */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '13px' }}>
          Points
        </label>
        <input
          type="number"
          min="1"
          value={blank.points}
          onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 1 })}
          style={{
            width: '100px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #dbe0e6',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Correct Answers */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '13px' }}>
          Réponses correctes <span style={{ color: '#dc2626' }}>*</span>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {blank.correctAnswers.map((answer, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
              }}
            >
              <span style={{ flex: 1, fontSize: '14px', color: '#111418' }}>{answer}</span>
              <button
                onClick={() => onRemoveAnswer(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0',
                }}
                title="Supprimer"
              >
                ❌
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddAnswer()
              }
            }}
            placeholder="Ajouter une réponse..."
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #dbe0e6',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleAddAnswer}
            style={{
              padding: '10px 16px',
              backgroundColor: '#2b8cee',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ➕
          </button>
        </div>

        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
          Vous pouvez ajouter plusieurs réponses correctes (synonymes, variantes...)
        </p>
      </div>

      {/* Hint */}
      <div>
        <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '13px' }}>
          Indice (optionnel)
        </label>
        <input
          type="text"
          value={blank.hint || ''}
          onChange={(e) => onUpdate({ hint: e.target.value })}
          placeholder="Ex: Capitale de la France"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #dbe0e6',
            fontSize: '14px',
          }}
        />
      </div>
    </div>
  )
}
