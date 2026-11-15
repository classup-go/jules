'use client'

import { useState, useEffect, use } from 'react'
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
  params: Promise<{ id: string; chapterId: string }>
}

export default function EditChapterPage({ params }: PageProps) {
  const { id: courseId, chapterId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ChapterFormData>({
    title: '',
    description: '',
    required_score: 75,
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [lessonCount, setLessonCount] = useState(0)

  useEffect(() => {
    loadChapter()
  }, [chapterId])

  const loadChapter = async () => {
    try {
      setLoading(true)
      setError(null)
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

      // Load chapter
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .select('*, lessons(id)')
        .eq('id', chapterId)
        .eq('course_id', courseId)
        .single()

      if (chapterError || !chapter) {
        throw new Error('Chapitre non trouvé')
      }

      setFormData({
        title: chapter.title,
        description: chapter.description || '',
        required_score: chapter.required_score || 75,
      })
      setLessonCount(chapter.lessons?.length || 0)
    } catch (err: any) {
      console.error('Load chapter error:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

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

    setSaving(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          title: formData.title,
          description: formData.description || null,
          required_score: formData.required_score,
        })
        .eq('id', chapterId)

      if (updateError) {
        throw updateError
      }

      // Success - redirect to builder
      router.push(`/teacher/courses/${courseId}/builder`)
    } catch (err: any) {
      console.error('Update chapter error:', err)
      setError(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmMessage = lessonCount > 0
      ? `Ce chapitre contient ${lessonCount} leçon(s). Êtes-vous sûr de vouloir le supprimer avec toutes ses leçons ?`
      : 'Êtes-vous sûr de vouloir supprimer ce chapitre ?'

    if (!confirm(confirmMessage)) {
      return
    }

    setDeleting(true)

    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId)

      if (deleteError) {
        throw deleteError
      }

      // Success - redirect to builder
      router.push(`/teacher/courses/${courseId}/builder`)
    } catch (err: any) {
      console.error('Delete chapter error:', err)
      setError(err.message || 'Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/teacher/courses/${courseId}/builder`)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f8fafc, #e0f2fe)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            border: '4px solid #2b8cee',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#64748b' }}>Chargement du chapitre...</p>
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

  if (error && !formData.title) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f8fafc, #e0f2fe)'
      }}>
        <div style={{
          maxWidth: '500px',
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '0.5rem'
          }}>
            Erreur
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            {error}
          </p>
          <button
            onClick={() => router.push(`/teacher/courses/${courseId}/builder`)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2b8cee',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2b8cee'
            }}
          >
            Retour au cours
          </button>
        </div>
      </div>
    )
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
            disabled={saving || deleting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#64748b',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              background: 'none',
              border: 'none',
              cursor: saving || deleting ? 'not-allowed' : 'pointer',
              opacity: saving || deleting ? 0.5 : 1
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
            Modifier le Chapitre
          </h1>
          <p style={{ color: '#64748b' }}>
            Modifiez les informations du chapitre
          </p>
        </div>

        {/* Error Banner */}
        {error && formData.title && (
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
            {/* Stats Badge */}
            {lessonCount > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#eff6ff',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#1e40af',
                marginBottom: '1.5rem'
              }}>
                <span>📚</span>
                <span><strong>{lessonCount}</strong> leçon{lessonCount > 1 ? 's' : ''} dans ce chapitre</span>
              </div>
            )}

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
                disabled={saving || deleting}
                placeholder="Ex: Introduction aux fonctions"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `2px solid ${validationErrors.title ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  opacity: saving || deleting ? 0.5 : 1,
                  cursor: saving || deleting ? 'not-allowed' : 'text'
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
                disabled={saving || deleting}
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
                  opacity: saving || deleting ? 0.5 : 1,
                  cursor: saving || deleting ? 'not-allowed' : 'text',
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
                  disabled={saving || deleting}
                  style={{
                    flex: 1,
                    accentColor: '#2b8cee',
                    cursor: saving || deleting ? 'not-allowed' : 'pointer',
                    opacity: saving || deleting ? 0.5 : 1
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
                disabled={saving || deleting}
                style={{
                  padding: '0.875rem 1.5rem',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: saving || deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: saving || deleting ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!saving && !deleting) {
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
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                style={{
                  padding: '0.875rem 1.5rem',
                  border: 'none',
                  background: deleting ? '#dc2626' : '#fee2e2',
                  color: deleting ? 'white' : '#991b1b',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: saving || deleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!saving && !deleting) {
                    e.currentTarget.style.background = '#fecaca'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving && !deleting) {
                    e.currentTarget.style.background = '#fee2e2'
                  }
                }}
              >
                {deleting ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Suppression...
                  </>
                ) : (
                  <>
                    🗑️ Supprimer
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving || deleting || !formData.title.trim()}
                style={{
                  flex: 1,
                  padding: '0.875rem 1.5rem',
                  border: 'none',
                  background: saving || deleting || !formData.title.trim() ? '#94a3b8' : '#2b8cee',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: saving || deleting || !formData.title.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!saving && !deleting && formData.title.trim()) {
                    e.currentTarget.style.background = '#2563eb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving && !deleting && formData.title.trim()) {
                    e.currentTarget.style.background = '#2b8cee'
                  }
                }}
              >
                {saving ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    ✓ Enregistrer les modifications
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
