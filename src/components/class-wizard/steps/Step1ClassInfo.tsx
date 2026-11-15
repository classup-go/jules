'use client'

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

interface Step1ClassInfoProps {
  form: UseFormReturn<ClassWizardData>
}

const SUBJECTS = [
  { value: 'Mathématiques', icon: '🔢' },
  { value: 'Physique', icon: '⚛️' },
  { value: 'Chimie', icon: '🧪' },
  { value: 'SVT', icon: '🌿' },
  { value: 'Français', icon: '📖' },
  { value: 'Anglais', icon: '🇬🇧' },
  { value: 'Arabe', icon: '🇹🇳' },
  { value: 'Histoire-Géo', icon: '🗺️' },
  { value: 'Philosophie', icon: '🤔' },
  { value: 'Informatique', icon: '💻' },
  { value: 'Économie', icon: '📊' },
  { value: 'Autre', icon: '📚' },
]

const LEVELS = [
  { value: '6ème', group: 'Collège' },
  { value: '5ème', group: 'Collège' },
  { value: '4ème', group: 'Collège' },
  { value: '3ème', group: 'Collège' },
  { value: '2nde', group: 'Lycée' },
  { value: '1ère', group: 'Lycée' },
  { value: 'Terminale', group: 'Lycée' },
  { value: 'Bac', group: 'Lycée' },
  { value: 'BTS', group: 'Supérieur' },
  { value: 'Licence', group: 'Supérieur' },
  { value: 'Master', group: 'Supérieur' },
  { value: 'Prépa', group: 'Supérieur' },
  { value: 'Adulte', group: 'Formation' },
]

export function Step1ClassInfo({ form }: Step1ClassInfoProps) {
  const { register, watch, setValue, formState: { errors } } = form
  const classType = watch('class_type')
  const isPublic = watch('is_public')

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🏫</span>
          Informations de la classe
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
          Définissez le contexte pédagogique de votre classe
        </p>
      </div>

      {/* Class Name */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
          Nom de la classe <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          {...register('class_name')}
          type="text"
          placeholder="Ex: Terminale HGGSP – Révisions Bac 2025"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: `2px solid ${errors.class_name ? '#fecaca' : '#e5e7eb'}`,
            borderRadius: '12px',
            fontSize: '15px',
            boxSizing: 'border-box',
            backgroundColor: errors.class_name ? '#fef2f2' : 'white'
          }}
        />
        {errors.class_name && (
          <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px' }}>{errors.class_name.message}</p>
        )}
        <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '6px' }}>
          Choisissez un nom clair qui aide vos élèves à s'y retrouver
        </p>
      </div>

      {/* Subject and Level */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
            Matière <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            {...register('subject')}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `2px solid ${errors.subject ? '#fecaca' : '#e5e7eb'}`,
              borderRadius: '12px',
              fontSize: '15px',
              backgroundColor: 'white',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Sélectionnez une matière</option>
            {SUBJECTS.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.icon} {subject.value}
              </option>
            ))}
          </select>
          {errors.subject && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px' }}>{errors.subject.message}</p>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
            Niveau <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            {...register('level')}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `2px solid ${errors.level ? '#fecaca' : '#e5e7eb'}`,
              borderRadius: '12px',
              fontSize: '15px',
              backgroundColor: 'white',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Sélectionnez un niveau</option>
            {['Collège', 'Lycée', 'Supérieur', 'Formation'].map((group) => (
              <optgroup key={group} label={group}>
                {LEVELS.filter(l => l.group === group).map((level) => (
                  <option key={level.value} value={level.value}>{level.value}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.level && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px' }}>{errors.level.message}</p>
          )}
        </div>
      </div>

      {/* Class Type */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
          Type de classe
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setValue('class_type', 'cursus')}
            style={{
              padding: '20px',
              backgroundColor: classType === 'cursus' ? 'rgba(139, 92, 246, 0.08)' : 'white',
              border: `2px solid ${classType === 'cursus' ? '#8b5cf6' : '#e5e7eb'}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>📅</span>
              <span style={{ fontWeight: '600', fontSize: '16px', color: classType === 'cursus' ? '#8b5cf6' : '#374151' }}>
                Cursus régulier
              </span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Cours étalés sur plusieurs mois</p>
          </button>

          <button
            type="button"
            onClick={() => setValue('class_type', 'intensive')}
            style={{
              padding: '20px',
              backgroundColor: classType === 'intensive' ? 'rgba(245, 158, 11, 0.08)' : 'white',
              border: `2px solid ${classType === 'intensive' ? '#f59e0b' : '#e5e7eb'}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>⚡</span>
              <span style={{ fontWeight: '600', fontSize: '16px', color: classType === 'intensive' ? '#f59e0b' : '#374151' }}>
                Programme intensif
              </span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Stage ou révisions courtes</p>
          </button>
        </div>
      </div>

      {/* Public Toggle */}
      <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '16px' }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setValue('is_public', e.target.checked)}
            style={{ width: '22px', height: '22px', marginTop: '2px', accentColor: '#8b5cf6' }}
          />
          <div>
            <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Classe publique</p>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
              Si cochée, cette classe sera visible dans le catalogue et les élèves pourront s'inscrire directement.
            </p>
          </div>
        </label>
      </div>

      {/* Tip */}
      <div style={{ padding: '16px 20px', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
          <strong style={{ color: '#7c3aed' }}>Astuce :</strong> Vous pourrez toujours modifier ces informations plus tard.
        </p>
      </div>
    </div>
  )
}