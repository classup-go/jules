'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  FileText,
  Video,
  Presentation,
  Save,
  Eye,
  AlertCircle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Types
type ContentType = 'text' | 'video' | 'slides'

interface LessonData {
  id?: string
  title: string
  content?: string
  video_url?: string
  presentation_id?: string
  duration_minutes?: number
  is_free_preview: boolean
  is_published: boolean
  order_index: number
}

interface LessonEditorProps {
  lesson?: LessonData
  chapterId: string
  onSave: (lessonData: LessonData) => Promise<void>
  onCancel: () => void
}

export default function LessonEditor({
  lesson,
  chapterId,
  onSave,
  onCancel
}: LessonEditorProps) {
  // State
  const [contentType, setContentType] = useState<ContentType>('text')
  const [title, setTitle] = useState(lesson?.title || '')
  const [content, setContent] = useState(lesson?.content || '')
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url || '')
  const [presentationId, setPresentationId] = useState(lesson?.presentation_id || '')
  const [durationMinutes, setDurationMinutes] = useState(lesson?.duration_minutes || 10)
  const [isFreePreview, setIsFreePreview] = useState(lesson?.is_free_preview || false)
  const [isPublished, setIsPublished] = useState(lesson?.is_published || false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)

  // Detect content type on load
  useEffect(() => {
    if (lesson) {
      if (lesson.presentation_id) {
        setContentType('slides')
      } else if (lesson.video_url) {
        setContentType('video')
      } else {
        setContentType('text')
      }
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

      // Build lesson data based on content type
      const lessonData: LessonData = {
        id: lesson?.id,
        title: title.trim(),
        is_free_preview: isFreePreview,
        is_published: isPublished,
        order_index: lesson?.order_index || 0,
        duration_minutes: durationMinutes
      }

      // Set content based on type
      switch (contentType) {
        case 'text':
          if (!content.trim()) {
            setError('Le contenu texte est obligatoire')
            return
          }
          lessonData.content = content.trim()
          lessonData.video_url = undefined
          lessonData.presentation_id = undefined
          break

        case 'video':
          if (!videoUrl.trim()) {
            setError('L\'URL de la vidéo est obligatoire')
            return
          }
          lessonData.video_url = videoUrl.trim()
          lessonData.content = undefined
          lessonData.presentation_id = undefined
          break

        case 'slides':
          if (!presentationId.trim()) {
            setError('Veuillez sélectionner une présentation')
            return
          }
          lessonData.presentation_id = presentationId.trim()
          lessonData.content = undefined
          lessonData.video_url = undefined
          // Duration will be auto-calculated by trigger
          lessonData.duration_minutes = undefined
          break
      }

      await onSave(lessonData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  // Tab icons
  const getTabIcon = (type: ContentType) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'slides':
        return <Presentation className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {lesson ? 'Modifier la leçon' : 'Nouvelle leçon'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Créez du contenu riche: texte, vidéo ou présentation interactive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreview(!isPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreview ? 'Édition' : 'Aperçu'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la leçon *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introduction aux variables JavaScript"
              disabled={isPreview}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Durée estimée (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 10)}
                disabled={isPreview || contentType === 'slides'}
              />
              {contentType === 'slides' && (
                <p className="text-xs text-muted-foreground">
                  Auto-calculé depuis les slides
                </p>
              )}
            </div>

            <div className="space-y-4 pt-8">
              <div className="flex items-center justify-between">
                <Label htmlFor="free-preview">Aperçu gratuit</Label>
                <Switch
                  id="free-preview"
                  checked={isFreePreview}
                  onCheckedChange={setIsFreePreview}
                  disabled={isPreview}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="published">Publié</Label>
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                  disabled={isPreview}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Type Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Contenu de la leçon</CardTitle>
          <CardDescription>
            Choisissez le type de contenu pour cette leçon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={contentType}
            onValueChange={(v) => setContentType(v as ContentType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text" disabled={isPreview}>
                <div className="flex items-center gap-2">
                  {getTabIcon('text')}
                  <span>Texte</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="video" disabled={isPreview}>
                <div className="flex items-center gap-2">
                  {getTabIcon('video')}
                  <span>Vidéo</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="slides" disabled={isPreview}>
                <div className="flex items-center gap-2">
                  {getTabIcon('slides')}
                  <span>Slides</span>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Text Content */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Contenu Markdown</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Écrivez votre leçon en Markdown...&#10;&#10;## Titre de section&#10;&#10;Votre contenu ici..."
                  rows={15}
                  className="font-mono"
                  disabled={isPreview}
                />
                <p className="text-xs text-muted-foreground">
                  Markdown supporté: titres, listes, code, liens, images, etc.
                </p>
              </div>

              {isPreview && content && (
                <div className="border rounded-lg p-4 prose prose-sm max-w-none">
                  {/* Preview would use a markdown renderer here */}
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>
              )}
            </TabsContent>

            {/* Video Content */}
            <TabsContent value="video" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-url">URL de la vidéo</Label>
                <Input
                  id="video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                  disabled={isPreview}
                />
                <p className="text-xs text-muted-foreground">
                  YouTube, Vimeo, ou lien direct vers MP4
                </p>
              </div>

              {videoUrl && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm font-medium mb-2">Aperçu vidéo:</p>
                  <div className="aspect-video bg-black rounded-md flex items-center justify-center">
                    {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={videoUrl.replace('watch?v=', 'embed/')}
                        className="w-full h-full rounded-md"
                        allowFullScreen
                      />
                    ) : videoUrl.includes('vimeo.com') ? (
                      <iframe
                        src={videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                        className="w-full h-full rounded-md"
                        allowFullScreen
                      />
                    ) : (
                      <video src={videoUrl} controls className="w-full h-full rounded-md" />
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Slides Content */}
            <TabsContent value="slides" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="presentation">Présentation</Label>
                <div className="flex gap-2">
                  <Input
                    id="presentation"
                    value={presentationId}
                    onChange={(e) => setPresentationId(e.target.value)}
                    placeholder="ID de la présentation"
                    disabled={isPreview}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {/* Open presentation picker */}}
                    disabled={isPreview}
                  >
                    Parcourir
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez une présentation existante ou créez-en une nouvelle
                </p>
              </div>

              {presentationId && (
                <Alert>
                  <Presentation className="h-4 w-4" />
                  <AlertDescription>
                    Présentation sélectionnée. La durée sera calculée automatiquement.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {/* Create new presentation */}}
                  disabled={isPreview}
                >
                  Créer nouvelle présentation
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {/* Open presentation editor */}}
                  disabled={!presentationId || isPreview}
                >
                  Modifier la présentation
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || isPreview}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}
