'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'

const chapterSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  description: z.string().optional(),
  required_score: z.number().min(0).max(100).default(75),
})

type ChapterFormData = z.infer<typeof chapterSchema>

interface PageProps {
  params: Promise<{ id: string }>
}

export default function NewChapterPage({ params }: PageProps) {
  const { id: courseId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ChapterFormData>({
    title: '',
    description: '',
    required_score: 75,
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof ChapterFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors({})

    // Validate form data
    try {
      chapterSchema.parse(formData)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.errors.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0].toString()] = error.message
          }
        })
        setValidationErrors(errors)
        return
      }
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Verify user owns this course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, classroom:classrooms(teacher_id)')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        throw new Error('Cours non trouvé')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || course.classroom?.teacher_id !== user.id) {
        throw new Error('Accès non autorisé')
      }

      // Get current max order_index
      const { data: existingChapters } = await supabase
        .from('chapters')
        .select('order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrderIndex = existingChapters && existingChapters.length > 0
        ? existingChapters[0].order_index + 1
        : 0

      // Create the chapter
      const { error: insertError } = await supabase
        .from('chapters')
        .insert({
          course_id: courseId,
          title: formData.title,
          description: formData.description || null,
          required_score: formData.required_score,
          order_index: nextOrderIndex,
        })

      if (insertError) {
        throw insertError
      }

      // Success - redirect to builder
      router.push(`/teacher/courses/${courseId}/builder`)
    } catch (err: any) {
      console.error('Create chapter error:', err)
      setError(err.message || 'Erreur lors de la création du chapitre')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (formData.title && !confirm('Abandonner la création du chapitre ?')) {
      return
    }
    router.push(`/teacher/courses/${courseId}/builder`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f8fafc, #e0f2fe)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#64748b',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            ← Retour au cours
          </button>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '0.5rem'
          }}>
            Nouveau Chapitre
          </h1>
          <p style={{ color: '#64748b' }}>
            Ajoutez un nouveau chapitre à votre cours
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            padding: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#991b1b'
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {/* Title */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Titre du chapitre *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                disabled={loading}
                placeholder="Ex: Introduction aux fonctions"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `2px solid ${validationErrors.title ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => {
                  if (!validationErrors.title) {
                    e.target.style.borderColor = '#2b8cee'
                  }
                }}
                onBlur={(e) => {
                  if (!validationErrors.title) {
                    e.target.style.borderColor = '#e2e8f0'
                  }
                }}
              />
              {validationErrors.title && (
                <p style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>
                  {validationErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Description (optionnelle)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={loading}
                placeholder="Décrivez brièvement le contenu de ce chapitre..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  resize: 'vertical',
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'text',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2b8cee'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0'
                }}
              />
            </div>

            {/* Required Score */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Score requis pour valider (%)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.required_score}
                  onChange={(e) => handleChange('required_score', parseInt(e.target.value))}
                  disabled={loading}
                  style={{
                    flex: 1,
                    accentColor: '#2b8cee',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}
                />
                <div style={{
                  width: '60px',
                  padding: '0.5rem',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  {formData.required_score}%
                </div>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginTop: '0.5rem'
              }}>
                Les étudiants doivent obtenir ce score minimum aux quiz pour valider le chapitre
              </p>
            </div>

            {/* Info Box */}
            <div style={{
              padding: '1rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                fontSize: '0.875rem',
                color: '#1e40af'
              }}>
                <span>💡</span>
                <div>
                  <strong>Astuce:</strong> Après avoir créé le chapitre, vous pourrez ajouter des leçons et organiser le contenu dans le builder.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.875rem 1.5rem',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#f8fafc'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                }}
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                style={{
                  flex: 1,
                  padding: '0.875rem 1.5rem',
                  border: 'none',
                  background: loading || !formData.title.trim() ? '#94a3b8' : '#2b8cee',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading || !formData.title.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!loading && formData.title.trim()) {
                    e.currentTarget.style.background = '#2563eb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && formData.title.trim()) {
                    e.currentTarget.style.background = '#2b8cee'
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Création...
                  </>
                ) : (
                  <>
                    ✓ Créer le chapitre
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
