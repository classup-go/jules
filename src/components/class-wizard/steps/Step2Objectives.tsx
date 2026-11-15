'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'

// Define the type inline to avoid import issues
interface ClassWizardData {
  class_name: string
  subject: string
  level: string
  class_type: 'cursus' | 'intensive'
  is_public: boolean
  learning_objectives: string[]
  prerequisites: string[]
  first_course: {
    title: string
    description: string
    is_free: boolean
    price?: number
    duration_minutes?: number
    duration_hours?: number
    duration_weeks?: number
  }
  initial_content: {
    type: 'text' | 'video'
    content: string
    video_url?: string
  }
}

interface Step2ObjectivesProps {
  form: UseFormReturn<ClassWizardData>
}

export function Step2Objectives({ form }: Step2ObjectivesProps) {
  const { watch, setValue } = form
  const objectives = watch('learning_objectives') || ['']
  const prerequisites = watch('prerequisites') || []
  const [newPrerequisite, setNewPrerequisite] = useState('')

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...objectives]
    newObjectives[index] = value
    setValue('learning_objectives', newObjectives)
  }

  const addObjective = () => {
    if (objectives.length < 5) {
      setValue('learning_objectives', [...objectives, ''])
    }
  }

  const removeObjective = (index: number) => {
    if (objectives.length > 1) {
      setValue('learning_objectives', objectives.filter((_, i) => i !== index))
    }
  }

  const addPrerequisite = () => {
    if (newPrerequisite.trim() && prerequisites.length < 5) {
      setValue('prerequisites', [...prerequisites, newPrerequisite.trim()])
      setNewPrerequisite('')
    }
  }

  const removePrerequisite = (index: number) => {
    setValue('prerequisites', prerequisites.filter((_, i) => i !== index))
  }

  const validObjectives = objectives.filter(obj => obj.length >= 10).length

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🎯</span>
          Objectifs d'apprentissage & Prérequis
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
          Définissez ce que les étudiants apprendront et les connaissances nécessaires
        </p>
      </div>

      {/* Learning Objectives */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <label style={{ fontWeight: '600', color: '#374151', fontSize: '15px' }}>
              Objectifs d'apprentissage <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Minimum 1, maximum 5 objectifs (10 caractères min.)</p>
          </div>
          {objectives.length < 5 && (
            <button
              type="button"
              onClick={addObjective}
              style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              + Ajouter
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {objectives.map((objective, index) => {
            const charCount = objective.length
            const isValid = charCount >= 10
            const hasError = charCount > 0 && charCount < 10

            return (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: isValid ? '#10b981' : '#e5e7eb',
                  color: isValid ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '14px',
                  flexShrink: 0,
                  marginTop: '8px'
                }}>
                  {isValid ? '✓' : index + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    placeholder="Ex: Maîtriser les concepts fondamentaux de..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `2px solid ${hasError ? '#fecaca' : isValid ? '#86efac' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      backgroundColor: hasError ? '#fef2f2' : 'white'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    {hasError ? (
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>Minimum 10 caractères</span>
                    ) : <span></span>}
                    <span style={{ fontSize: '12px', color: isValid ? '#10b981' : '#9ca3af' }}>{charCount} caractères</span>
                  </div>
                </div>

                {objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObjective(index)}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer', marginTop: '6px', fontSize: '18px' }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: validObjectives >= 1 ? 'rgba(16, 185, 129, 0.1)' : '#f9fafb', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{validObjectives >= 1 ? '✅' : '📝'}</span>
          <span style={{ fontSize: '13px', color: validObjectives >= 1 ? '#065f46' : '#6b7280' }}>
            {validObjectives} objectif{validObjectives > 1 ? 's' : ''} valide{validObjectives > 1 ? 's' : ''} sur {objectives.length}
          </span>
        </div>
      </div>

      {/* Prerequisites */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <label style={{ fontWeight: '600', color: '#374151', fontSize: '15px' }}>
              Prérequis <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '13px', marginLeft: '8px' }}>(optionnel)</span>
            </label>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Maximum 5 prérequis</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={newPrerequisite}
            onChange={(e) => setNewPrerequisite(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrerequisite())}
            placeholder="Ex: Connaissances de base en algèbre"
            style={{ flex: 1, padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }}
          />
          <button
            type="button"
            onClick={addPrerequisite}
            disabled={!newPrerequisite.trim() || prerequisites.length >= 5}
            style={{
              padding: '12px 20px',
              backgroundColor: newPrerequisite.trim() ? '#10b981' : '#e5e7eb',
              color: newPrerequisite.trim() ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: newPrerequisite.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            + Ajouter
          </button>
        </div>

        {prerequisites.length === 0 ? (
          <div style={{ padding: '32px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af' }}>Aucun prérequis défini</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {prerequisites.map((prereq, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '20px', fontSize: '14px', color: '#7c3aed' }}>
                <span>📌</span>
                <span>{prereq}</span>
                <button type="button" onClick={() => removePrerequisite(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', fontSize: '16px', padding: '0 4px' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div style={{ padding: '16px 20px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>ℹ️</span>
          <div>
            <p style={{ fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>Conseils pour de bons objectifs</p>
            <ul style={{ color: '#3b82f6', fontSize: '14px', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Utilisez des verbes d'action mesurables (maîtriser, analyser, créer...)</li>
              <li>Soyez spécifique et réaliste</li>
              <li>Focalisez sur ce que l'étudiant saura <strong>faire</strong> à la fin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}