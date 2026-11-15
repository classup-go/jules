'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

interface Question {
  id?: string
  question: string
  answers: { id?: string; text: string; isCorrect: boolean }[]
}

export default function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [qcmId, setQcmId] = useState<string | null>(null)

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
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()

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

      // Get QCM if type is qcm
      if (lessonData.type === 'qcm') {
        const { data: qcmData } = await supabase
          .from('qcm')
          .select('id')
          .eq('lesson_id', id)
          .single()

        if (qcmData) {
          setQcmId(qcmData.id)

          // Get questions with answers
          const { data: questionsData } = await supabase
            .from('qcm_questions')
            .select(`
              id,
              question,
              order_index,
              qcm_answers (id, answer_text, is_correct, order_index)
            `)
            .eq('qcm_id', qcmData.id)
            .order('order_index', { ascending: true })

          if (questionsData) {
            setQuestions(questionsData.map(q => ({
              id: q.id,
              question: q.question,
              answers: (q.qcm_answers as any[])?.sort((a, b) => a.order_index - b.order_index).map(a => ({
                id: a.id,
                text: a.answer_text,
                isCorrect: a.is_correct,
              })) || []
            })))
          }
        }
      }
    }

    setLoading(false)
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

    // Update QCM if needed
    if (formData.type === 'qcm') {
      if (!qcmId) {
        // Create QCM
        const { data: newQcm } = await supabase
          .from('qcm')
          .insert({ lesson_id: id, title: formData.title, passing_score: 70 })
          .select()
          .single()

        if (newQcm) {
          setQcmId(newQcm.id)
          await saveQuestions(newQcm.id)
        }
      } else {
        await saveQuestions(qcmId)
      }
    }

    router.push(`/teacher/classrooms/${lesson?.classroom_id}`)
  }

  const saveQuestions = async (qcmIdToUse: string) => {
    const supabase = createClient()

    // Delete existing questions and answers
    await supabase.from('qcm_questions').delete().eq('qcm_id', qcmIdToUse)

    // Create new questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const { data: questionData } = await supabase
        .from('qcm_questions')
        .insert({
          qcm_id: qcmIdToUse,
          question: q.question,
          question_type: 'single',
          order_index: i,
        })
        .select()
        .single()

      if (questionData) {
        for (let j = 0; j < q.answers.length; j++) {
          await supabase.from('qcm_answers').insert({
            question_id: questionData.id,
            answer_text: q.answers[j].text,
            is_correct: q.answers[j].isCorrect,
            order_index: j,
          })
        }
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const fileExt = file.name.split('.').pop()
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage.from('courses').upload(fileName, file)

    if (error) {
      alert('Erreur upload: ' + error.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('courses').getPublicUrl(fileName)
    setFormData(prev => ({ ...prev, content_url: urlData.publicUrl }))
    setUploading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette leçon ?')) return

    const supabase = createClient()
    await supabase.from('lessons').delete().eq('id', id)
    router.push(`/teacher/classrooms/${lesson?.classroom_id}`)
  }

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      answers: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]
    }])
  }

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions]
    updated[index].question = value
    setQuestions(updated)
  }

  const updateAnswer = (qIndex: number, aIndex: number, field: string, value: any) => {
    const updated = [...questions]
    if (field === 'isCorrect' && value) {
      updated[qIndex].answers.forEach((a, i) => { a.isCorrect = i === aIndex })
    } else if (field === 'text') {
      updated[qIndex].answers[aIndex].text = value
    }
    setQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
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
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link href={`/teacher/classrooms/${lesson.classroom_id}`} style={{ color: '#617589', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
        ← Retour à la classe
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>Modifier la leçon</h1>
          <button
            onClick={handleDelete}
            style={{ padding: '8px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
          >
            🗑️ Supprimer
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>Type de contenu</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {[
                { key: 'pdf', icon: '📄', label: 'PDF' },
                { key: 'video', icon: '🎥', label: 'Vidéo' },
                { key: 'qcm', icon: '✅', label: 'QCM' },
                { key: 'micro_learning', icon: '💡', label: 'Micro-learning' },
                { key: 'text', icon: '📝', label: 'Texte' },
              ].map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.key }))}
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
                  <span style={{ fontSize: '13px', fontWeight: '500', color: formData.type === type.key ? '#2b8cee' : '#617589' }}>{type.label}</span>
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
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe0e6', fontSize: '14px' }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe0e6', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          {/* Content based on type */}
          {(formData.type === 'pdf' || formData.type === 'video') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Fichier</label>
              <div style={{ border: '2px dashed #dbe0e6', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                {formData.content_url ? (
                  <div>
                    <p style={{ color: '#16a34a', fontWeight: '500', marginBottom: '8px' }}>✅ Fichier uploadé</p>
                    <a href={formData.content_url} target="_blank" style={{ color: '#2b8cee', fontSize: '14px' }}>Voir le fichier</a>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, content_url: '' }))}
                      style={{ display: 'block', margin: '12px auto 0', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Supprimer le fichier
                    </button>
                  </div>
                ) : (
                  <div>
                    <input type="file" accept={formData.type === 'pdf' ? '.pdf' : 'video/*'} onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
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
                onChange={(e) => setFormData(prev => ({ ...prev, content_text: e.target.value }))}
                rows={10}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe0e6', fontSize: '14px', resize: 'vertical' }}
              />
            </div>
          )}

         {/* QCM Builder */}
{formData.type === 'qcm' && (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>Questions du QCM</label>
    
    {questions.map((q, qIndex) => (
      <div key={qIndex} style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: '600', color: '#111418' }}>Question {qIndex + 1}</span>
          <button type="button" onClick={() => removeQuestion(qIndex)} style={{ padding: '6px 10px', color: '#dc2626', backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
            🗑️
          </button>
        </div>
        
        <input
          type="text"
          value={q.question}
          onChange={(e) => updateQuestion(qIndex, e.target.value)}
          placeholder="Écrivez votre question..."
          style={{ 
            width: '100%', 
            padding: '12px 16px', 
            borderRadius: '10px', 
            border: '1px solid #dbe0e6', 
            marginBottom: '16px', 
            fontSize: '14px',
            backgroundColor: 'white'
          }}
        />
        
        <p style={{ fontSize: '13px', fontWeight: '500', color: '#617589', marginBottom: '10px' }}>Réponses (sélectionnez la bonne réponse)</p>
        
        {q.answers.map((a, aIndex) => (
          <div key={aIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            {/* Radio button stylé */}
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
                transition: 'all 0.2s'
              }}
            >
              {a.isCorrect && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            
            {/* Input réponse */}
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
                transition: 'all 0.2s'
              }}
            />
            
            {/* Indicateur bonne réponse */}
            {a.isCorrect && (
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500', whiteSpace: 'nowrap' }}>
                ✓ Correcte
              </span>
            )}
          </div>
        ))}
        
        {/* Ajouter une réponse */}
        {q.answers.length < 6 && (
          <button
            type="button"
            onClick={() => {
              const updated = [...questions]
              updated[qIndex].answers.push({ text: '', isCorrect: false })
              setQuestions(updated)
            }}
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
    
    <button 
      type="button" 
      onClick={addQuestion} 
      style={{ 
        width: '100%', 
        padding: '16px', 
        border: '2px dashed #dbe0e6', 
        borderRadius: '12px', 
        background: 'white', 
        color: '#2b8cee', 
        cursor: 'pointer', 
        fontWeight: '600',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
    >
      + Ajouter une question
    </button>
    
    {questions.length > 0 && (
      <p style={{ marginTop: '12px', fontSize: '13px', color: '#617589', textAlign: 'center' }}>
        {questions.length} question{questions.length > 1 ? 's' : ''} • Cliquez sur le cercle pour marquer la bonne réponse
      </p>
    )}
  </div>
)}

          {/* Duration */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>Durée (minutes)</label>
            <input
              type="number"
              min="0"
              value={formData.duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
              style={{ width: '120px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe0e6', fontSize: '14px' }}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: '24px', display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.is_free} onChange={(e) => setFormData(prev => ({ ...prev, is_free: e.target.checked }))} />
              <span style={{ fontSize: '14px', color: '#111418' }}>Gratuit</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.is_mandatory} onChange={(e) => setFormData(prev => ({ ...prev, is_mandatory: e.target.checked }))} />
              <span style={{ fontSize: '14px', color: '#111418' }}>Obligatoire</span>
            </label>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 1, padding: '14px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link href={`/teacher/classrooms/${lesson.classroom_id}`} style={{ padding: '14px 24px', backgroundColor: '#f3f4f6', color: '#617589', borderRadius: '10px', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}