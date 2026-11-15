'use client'

import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import VideoUpload from '@/components/video/video-upload'
import { SlideBuilder } from './SlideBuilder'
import { RichTextEditor } from './RichTextEditor'
import QuizEditor from '@/components/quiz/QuizEditor'
import { QCMData, FillInBlanksData } from '@/types/quiz'

interface LessonData {
  id?: string
  title: string
  description?: string
  type: 'text' | 'video' | 'pdf' | 'slides' | 'qcm' | 'fill_in_blanks'
  content_text?: string
  content_url?: string
  storage_path?: string
  video_duration?: number
  video_size?: number
  duration_minutes?: number
  is_free: boolean
  is_mandatory: boolean
  order_index: number
  quizData?: QCMData | FillInBlanksData
}

interface LessonEditorV2Props {
  lesson?: LessonData
  chapterId: string
  classroomId: string
  onSave: (lessonData: LessonData) => Promise<void>
  onCancel: () => void
}

type ContentType = 'text' | 'video' | 'pdf' | 'slides' | 'qcm' | 'fill_in_blanks'

export default function LessonEditorV2({
  lesson,
  chapterId,
  classroomId,
  onSave,
  onCancel
}: LessonEditorV2Props) {
  // State
  const [contentType, setContentType] = useState<ContentType>(lesson?.type || 'text')
  const [title, setTitle] = useState(lesson?.title || '')
  const [description, setDescription] = useState(lesson?.description || '')
  const [contentText, setContentText] = useState(lesson?.content_text || '')
  const [contentUrl, setContentUrl] = useState(lesson?.content_url || '')
  const [storagePath, setStoragePath] = useState(lesson?.storage_path || '')
  const [videoDuration, setVideoDuration] = useState(lesson?.video_duration || 0)
  const [videoSize, setVideoSize] = useState(lesson?.video_size || 0)
  const [durationMinutes, setDurationMinutes] = useState(lesson?.duration_minutes || 10)
  const [isFree, setIsFree] = useState(lesson?.is_free || false)
  const [isMandatory, setIsMandatory] = useState(lesson?.is_mandatory !== undefined ? lesson.is_mandatory : true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slidesData, setSlidesData] = useState<any[]>([])

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<string | null>(null)
  const [pdfUploading, setPdfUploading] = useState(false)

  // Quiz state
  const [quizData, setQuizData] = useState<QCMData | FillInBlanksData | null>(null)
  const [quizSaved, setQuizSaved] = useState(false)

  // Detect content type on load
  useEffect(() => {
    if (lesson) {
      setContentType(lesson.type)
    }
  }, [lesson])

  // Handle save
  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)

      // Validation
      if (!title.trim()) {
        setError('Le titre est obligatoire')
        return
      }

      // Build lesson data
      const lessonData: LessonData = {
        id: lesson?.id,
        title: title.trim(),
        description: description.trim(),
        type: contentType,
        duration_minutes: durationMinutes,
        is_free: isFree,
        is_mandatory: isMandatory,
        order_index: lesson?.order_index || 0
      }

      // Set content based on type
      switch (contentType) {
        case 'text':
          if (!contentText.trim()) {
            setError('Le contenu texte est obligatoire')
            return
          }
          lessonData.content_text = contentText.trim()
          break

        case 'video':
          if (!storagePath) {
            setError('Veuillez uploader une vidéo')
            return
          }
          lessonData.storage_path = storagePath
          lessonData.video_duration = videoDuration
          lessonData.video_size = videoSize
          break

        case 'pdf':
          if (!pdfFile) {
            setError('Veuillez uploader un fichier PDF')
            return
          }
          lessonData.content_url = pdfFile
          break

        case 'slides':
          if (slidesData.length === 0) {
            setError('Veuillez créer au moins une slide')
            return
          }
          lessonData.content_text = JSON.stringify(slidesData)
          // Calculate duration based on slides (1 min per slide)
          lessonData.duration_minutes = slidesData.length
          break

        case 'qcm':
        case 'fill_in_blanks':
          if (!quizData) {
            setError('Veuillez configurer le quiz avant d\'enregistrer')
            return
          }
          // Include quiz data so it can be saved in lesson_quizzes table
          lessonData.quizData = quizData
          break
      }

      await onSave(lessonData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle content type change
  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type)
    setError(null)
  }

  // Handle PDF upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes('pdf')) {
      setError('Veuillez sélectionner un fichier PDF')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('Le fichier PDF dépasse la limite de 50MB')
      return
    }

    setPdfUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Vous devez être connecté')
      }

      const ext = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${ext}`

      const { data, error: uploadError } = await supabase.storage
        .from('courses')
        .upload(fileName, file)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: urlData } = supabase.storage
        .from('courses')
        .getPublicUrl(fileName)

      setPdfFile(urlData.publicUrl)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload du PDF')
    } finally {
      setPdfUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={onCancel}
            style={{
              color: '#617589',
              textDecoration: 'none',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ← Retour à la classe
          </button>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
            {lesson ? 'Modifier la leçon' : 'Créer une leçon'}
          </h1>
          <p style={{ color: '#617589', fontSize: '16px' }}>
            Créez du contenu riche pour vos élèves: texte, vidéo, PDF ou présentation
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '2px solid #fca5a5',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Main Form Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '32px' }}>
          {/* Title & Description */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Titre de la leçon <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introduction aux équations du second degré"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #dbe0e6',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2b8cee'}
              onBlur={(e) => e.target.style.borderColor = '#dbe0e6'}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
              Description (optionnelle)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brève description de ce que les élèves vont apprendre..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #dbe0e6',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2b8cee'}
              onBlur={(e) => e.target.style.borderColor = '#dbe0e6'}
            />
          </div>

          {/* Content Type Selection */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>
              Type de contenu <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {[
                { key: 'text', icon: '📝', label: 'Texte enrichi' },
                { key: 'video', icon: '🎥', label: 'Vidéo' },
                { key: 'pdf', icon: '📄', label: 'PDF' },
                { key: 'slides', icon: '📊', label: 'Présentation' },
                { key: 'qcm', icon: '✅', label: 'QCM' },
                { key: 'fill_in_blanks', icon: '📋', label: 'Texte à trou' },
              ].map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => handleContentTypeChange(type.key as ContentType)}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: contentType === type.key ? '2px solid #2b8cee' : '2px solid #dbe0e6',
                    backgroundColor: contentType === type.key ? 'rgba(43, 140, 238, 0.05)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>{type.icon}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: contentType === type.key ? '#2b8cee' : '#617589'
                  }}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Editor based on type */}
          <div style={{
            padding: '24px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #dbe0e6',
            marginBottom: '32px'
          }}>
            {contentType === 'text' && (
              <RichTextEditor
                value={contentText}
                onChange={setContentText}
              />
            )}

            {contentType === 'video' && (
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>
                  Upload de vidéo
                </label>
                <VideoUpload
                  onUpload={(path, metadata) => {
                    setStoragePath(path)
                    setVideoDuration(metadata.duration)
                    setVideoSize(metadata.size)
                    setDurationMinutes(Math.ceil(metadata.duration / 60))
                  }}
                  maxSize={500}
                />
                <p style={{ marginTop: '12px', fontSize: '13px', color: '#617589' }}>
                  Formats supportés: MP4, MOV, AVI • Taille max: 500MB
                </p>
              </div>
            )}

            {contentType === 'pdf' && (
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#111418' }}>
                  Document PDF
                </label>

                {!pdfFile ? (
                  <div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      style={{ display: 'none' }}
                      id="pdf-upload"
                      disabled={pdfUploading}
                    />
                    <label
                      htmlFor="pdf-upload"
                      style={{
                        display: 'block',
                        width: '100%',
                        border: '2px dashed #dbe0e6',
                        borderRadius: '12px',
                        padding: '48px 32px',
                        textAlign: 'center',
                        backgroundColor: 'white',
                        cursor: pdfUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                      <p style={{ color: '#2b8cee', fontWeight: '600', marginBottom: '4px' }}>
                        {pdfUploading ? 'Upload en cours...' : 'Cliquez pour uploader un PDF'}
                      </p>
                      <p style={{ fontSize: '13px', color: '#617589' }}>
                        Taille maximum: 50MB
                      </p>
                    </label>
                  </div>
                ) : (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #16a34a',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#16a34a',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                        PDF uploadé avec succès
                      </p>
                      <p style={{ fontSize: '13px', color: '#15803d', marginTop: '4px' }}>
                        Fichier prêt à être utilisé
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfFile(null)
                        const input = document.getElementById('pdf-upload') as HTMLInputElement
                        if (input) input.value = ''
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'white',
                        border: '1px solid #16a34a',
                        borderRadius: '8px',
                        color: '#16a34a',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Changer
                    </button>
                  </div>
                )}
              </div>
            )}

            {contentType === 'slides' && (
              <SlideBuilder
                slides={slidesData}
                onChange={setSlidesData}
              />
            )}

            {(contentType === 'qcm' || contentType === 'fill_in_blanks') && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>
                  Configuration du {contentType === 'qcm' ? 'QCM' : 'texte à trou'}
                </h3>
                <QuizEditor
                  lessonId={lesson?.id || ''}
                  initialData={quizData}
                  quizType={contentType as 'qcm' | 'fill_in_blanks'}
                  onSave={async (data) => {
                    setQuizData(data)
                    setQuizSaved(true)
                  }}
                />
                {quizSaved && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '8px',
                    border: '2px solid #16a34a'
                  }}>
                    <p style={{ fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                      ✓ Quiz configuré - Cliquez sur "Enregistrer la leçon" en bas pour finaliser
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#111418' }}>
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 10)}
                  disabled={contentType === 'slides' || contentType === 'video'}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid #dbe0e6',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                {(contentType === 'slides' || contentType === 'video') && (
                  <p style={{ marginTop: '4px', fontSize: '12px', color: '#617589' }}>
                    Auto-calculé
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px 0' }}>
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#111418' }}>
                    Aperçu gratuit (accessible sans inscription)
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px 0' }}>
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#111418' }}>
                    Obligatoire pour la progression
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '24px', borderTop: '1px solid #dbe0e6' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: isSaving ? '#93c5fd' : '#2b8cee',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {isSaving ? '💾 Enregistrement...' : '💾 Enregistrer la leçon'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              style={{
                padding: '16px 24px',
                backgroundColor: '#f3f4f6',
                color: '#617589',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
