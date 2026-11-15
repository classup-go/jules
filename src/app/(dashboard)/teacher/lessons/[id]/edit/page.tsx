'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QuizEditor from '@/components/quiz/QuizEditor'
import { QCMData, FillInBlanksData } from '@/types/quiz'

interface Lesson {
  id: string
  chapter_id: string
  classroom_id: string
  title: string
  description: string
  type: string
  content_url: string
  content_text: string
  duration_minutes: number
  is_free: boolean
  is_mandatory: boolean
}

interface QuizData {
  id?: string
  lesson_id: string
  quiz_type: 'qcm' | 'fill_in_blanks'
  data: QCMData | FillInBlanksData
}

export default function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [existingQuiz, setExistingQuiz] = useState<QuizData | null>(null)
  const [quizType, setQuizType] = useState<'qcm' | 'fill_in_blanks'>('qcm')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pdf',
    content_url: '',
    content_text: '',
    duration_minutes: 0,
    is_free: false,
    is_mandatory: true,
  })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    const supabase = createClient()

    // Get lesson
    const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', id).single()

    if (lessonData) {
      setLesson(lessonData)
      setFormData({
        title: lessonData.title || '',
        description: lessonData.description || '',
        type: lessonData.type || 'pdf',
        content_url: lessonData.content_url || '',
        content_text: lessonData.content_text || '',
        duration_minutes: lessonData.duration_minutes || 0,
        is_free: lessonData.is_free || false,
        is_mandatory: lessonData.is_mandatory ?? true,
      })

      // Get quiz if type is qcm or fill_in_blanks
      if (lessonData.type === 'qcm' || lessonData.type === 'fill_in_blanks') {
        const { data: quizData } = await supabase.from('lesson_quizzes').select('*').eq('lesson_id', id).maybeSingle()

        if (quizData) {
          setExistingQuiz(quizData as QuizData)
          setQuizType(quizData.quiz_type)
        } else {
          // Set default quiz type based on lesson type
          setQuizType(lessonData.type === 'fill_in_blanks' ? 'fill_in_blanks' : 'qcm')
        }
      }
    }

    setLoading(false)
  }

  const handleSaveQuiz = async (quizData: QCMData | FillInBlanksData) => {
    const supabase = createClient()

    if (existingQuiz?.id) {
      // Update existing quiz
      const { error } = await supabase
        .from('lesson_quizzes')
        .update({
          quiz_type: quizType,
          data: quizData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingQuiz.id)

      if (error) throw error
    } else {
      // Create new quiz
      const { error } = await supabase.from('lesson_quizzes').insert({
        lesson_id: id,
        quiz_type: quizType,
        data: quizData,
      })

      if (error) throw error
    }

    alert('Quiz enregistré avec succès!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()

    // Update lesson
    const { error } = await supabase
      .from('lessons')
      .update({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        content_url: formData.content_url,
        content_text: formData.content_text,
        duration_minutes: formData.duration_minutes,
        is_free: formData.is_free,
        is_mandatory: formData.is_mandatory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      alert('Erreur: ' + error.message)
      setSaving(false)
      return
    }

    alert('Leçon enregistrée!')
    setSaving(false)
    router.push(`/teacher/classrooms/${lesson?.classroom_id}`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const fileExt = file.name.split('.').pop()
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage.from('courses').upload(fileName, file)

    if (error) {
      alert('Erreur upload: ' + error.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('courses').getPublicUrl(fileName)
    setFormData((prev) => ({ ...prev, content_url: urlData.publicUrl }))
    setUploading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette leçon ? Cette action est irréversible.')) return

    const supabase = createClient()

    // Delete quiz if exists
    await supabase.from('lesson_quizzes').delete().eq('lesson_id', id)

    // Delete lesson
    await supabase.from('lessons').delete().eq('id', id)
    router.push(`/teacher/classrooms/${lesson?.classroom_id}`)
  }

  const handleChangeType = (newType: string) => {
    setFormData((prev) => ({ ...prev, type: newType }))

    // Set default quiz type when switching to quiz types
    if (newType === 'qcm') {
      setQuizType('qcm')
    } else if (newType === 'fill_in_blanks') {
      setQuizType('fill_in_blanks')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <h2>Leçon non trouvée</h2>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '48px' }}>
      <Link
        href={`/teacher/classrooms/${lesson.classroom_id}`}
        style={{
          color: '#617589',
          textDecoration: 'none',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '24px',
        }}
      >
        ← Retour à la classe
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>Modifier la leçon</h1>
          <button
            onClick={handleDelete}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
            }}
          >
            🗑️ Supprimer
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>
              Type de contenu
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              {[
                { key: 'pdf', icon: '📄', label: 'PDF' },
                { key: 'video', icon: '🎥', label: 'Vidéo' },
                { key: 'text', icon: '📝', label: 'Texte' },
                { key: 'micro_learning', icon: '💡', label: 'Micro-learning' },
                { key: 'qcm', icon: '✅', label: 'QCM' },
                { key: 'fill_in_blanks', icon: '📋', label: 'Texte à trou' },
              ].map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => handleChangeType(type.key)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: formData.type === type.key ? '2px solid #2b8cee' : '2px solid #dbe0e6',
                    backgroundColor: formData.type === type.key ? 'rgba(43, 140, 238, 0.05)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>{type.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: formData.type === type.key ? '#2b8cee' : '#617589' }}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Titre *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
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

          {/* Content based on type */}
          {(formData.type === 'pdf' || formData.type === 'video') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Fichier</label>
              <div
                style={{
                  border: '2px dashed #dbe0e6',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                {formData.content_url ? (
                  <div>
                    <p style={{ color: '#16a34a', fontWeight: '500', marginBottom: '8px' }}>✅ Fichier uploadé</p>
                    <a href={formData.content_url} target="_blank" style={{ color: '#2b8cee', fontSize: '14px' }}>
                      Voir le fichier
                    </a>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, content_url: '' }))}
                      style={{
                        display: 'block',
                        margin: '12px auto 0',
                        color: '#dc2626',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Supprimer le fichier
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept={formData.type === 'pdf' ? '.pdf' : 'video/*'}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                      <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📤</span>
                      <p style={{ color: '#617589' }}>{uploading ? 'Upload en cours...' : 'Cliquez pour uploader'}</p>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {(formData.type === 'text' || formData.type === 'micro_learning') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Contenu</label>
              <textarea
                value={formData.content_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, content_text: e.target.value }))}
                rows={10}
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
          )}

          {/* Quiz Editor */}
          {(formData.type === 'qcm' || formData.type === 'fill_in_blanks') && (
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>
                  Configuration du quiz
                </h3>

                <QuizEditor
                  lessonId={id}
                  initialData={existingQuiz?.data || null}
                  quizType={formData.type as 'qcm' | 'fill_in_blanks'}
                  onSave={handleSaveQuiz}
                />
              </div>
            </div>
          )}

          {/* Duration */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Durée estimée (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={formData.duration_minutes}
              onChange={(e) => setFormData((prev) => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
              style={{
                width: '120px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #dbe0e6',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: '24px', display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_free}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_free: e.target.checked }))}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Gratuit</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_mandatory: e.target.checked }))}
              />
              <span style={{ fontSize: '14px', color: '#111418' }}>Obligatoire</span>
            </label>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: '#2b8cee',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer la leçon'}
            </button>
            <Link
              href={`/teacher/classrooms/${lesson.classroom_id}`}
              style={{
                padding: '14px 24px',
                backgroundColor: '#f3f4f6',
                color: '#617589',
                borderRadius: '10px',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
