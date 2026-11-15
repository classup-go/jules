'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Video,
  Presentation,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Lesson {
  id: string
  title: string
  content: string
  duration_minutes: number
  is_free_preview: boolean
}

interface Chapter {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

interface Step3ContentBuilderProps {
  chapters: Chapter[]
  onChange: (chapters: Chapter[]) => void
  onNext: () => void
  onBack: () => void
}

/**
 * Step 3: Construction du Contenu
 * Chapitres et leçons
 */
export default function Step3ContentBuilder({
  chapters,
  onChange,
  onNext,
  onBack,
}: Step3ContentBuilderProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())

  const toggleChapter = (chapterId: string) => {
    const newOpen = new Set(openChapters)
    if (newOpen.has(chapterId)) {
      newOpen.delete(chapterId)
    } else {
      newOpen.add(chapterId)
    }
    setOpenChapters(newOpen)
  }

  const handleNext = () => {
    const newErrors: string[] = []

    if (chapters.length === 0) {
      newErrors.push('Ajoutez au moins un chapitre à votre programme')
    }

    const chaptersWithoutLessons = chapters.filter((c) => c.lessons.length === 0)
    if (chaptersWithoutLessons.length > 0) {
      newErrors.push(
        `${chaptersWithoutLessons.length} chapitre(s) sans leçons. Ajoutez des leçons ou supprimez ces chapitres.`
      )
    }

    const emptyTitles = chapters.filter((c) => !c.title.trim())
    if (emptyTitles.length > 0) {
      newErrors.push('Tous les chapitres doivent avoir un titre')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors([])
    onNext()
  }

  // Ajouter un chapitre
  const addChapter = () => {
    const newChapter: Chapter = {
      id: `temp-${Date.now()}`,
      title: `Chapitre ${chapters.length + 1}`,
      description: '',
      lessons: [],
    }
    onChange([...chapters, newChapter])
    setOpenChapters(new Set([...openChapters, newChapter.id]))
  }

  // Supprimer un chapitre
  const deleteChapter = (chapterId: string) => {
    onChange(chapters.filter((c) => c.id !== chapterId))
  }

  // Mettre à jour un chapitre
  const updateChapter = (chapterId: string, field: keyof Chapter, value: any) => {
    onChange(
      chapters.map((c) => (c.id === chapterId ? { ...c, [field]: value } : c))
    )
  }

  // Ajouter une leçon
  const addLesson = (chapterId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId)
    if (!chapter) return

    const newLesson: Lesson = {
      id: `temp-${Date.now()}`,
      title: `Leçon ${chapter.lessons.length + 1}`,
      content: '',
      duration_minutes: 10,
      is_free_preview: false,
    }

    updateChapter(chapterId, 'lessons', [...chapter.lessons, newLesson])
  }

  // Supprimer une leçon
  const deleteLesson = (chapterId: string, lessonId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId)
    if (!chapter) return

    updateChapter(
      chapterId,
      'lessons',
      chapter.lessons.filter((l) => l.id !== lessonId)
    )
  }

  // Mettre à jour une leçon
  const updateLesson = (
    chapterId: string,
    lessonId: string,
    field: keyof Lesson,
    value: any
  ) => {
    const chapter = chapters.find((c) => c.id === chapterId)
    if (!chapter) return

    updateChapter(
      chapterId,
      'lessons',
      chapter.lessons.map((l) => (l.id === lessonId ? { ...l, [field]: value } : l))
    )
  }

  // Calculer stats
  const totalLessons = chapters.reduce((sum, c) => sum + c.lessons.length, 0)
  const totalDuration = chapters.reduce(
    (sum, c) => sum + c.lessons.reduce((s, l) => s + l.duration_minutes, 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Structure du programme</h2>
        <p className="text-muted-foreground mt-2">
          Organisez votre contenu en chapitres et leçons
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{chapters.length}</div>
            <p className="text-sm text-muted-foreground">Chapitres</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalLessons}</div>
            <p className="text-sm text-muted-foreground">Leçons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Math.floor(totalDuration / 60)}h{totalDuration % 60}m
            </div>
            <p className="text-sm text-muted-foreground">Durée totale</p>
          </CardContent>
        </Card>
      </div>

      {/* Erreurs */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Liste des chapitres */}
      <div className="space-y-4">
        {chapters.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Aucun chapitre pour le moment. Commencez par ajouter votre premier chapitre.
              </p>
              <Button onClick={addChapter}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter le premier chapitre
              </Button>
            </CardContent>
          </Card>
        )}

        {chapters.map((chapter, chapterIndex) => (
          <Collapsible
            key={chapter.id}
            open={openChapters.has(chapter.id)}
            onOpenChange={() => toggleChapter(chapter.id)}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                          {openChapters.has(chapter.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Badge variant="secondary">Chapitre {chapterIndex + 1}</Badge>
                      <Badge variant="outline">{chapter.lessons.length} leçons</Badge>
                    </div>
                    <Input
                      value={chapter.title}
                      onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                      placeholder="Titre du chapitre"
                      className="text-lg font-semibold mb-2"
                    />
                    <Textarea
                      value={chapter.description}
                      onChange={(e) =>
                        updateChapter(chapter.id, 'description', e.target.value)
                      }
                      placeholder="Description du chapitre (optionnel)"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteChapter(chapter.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {/* Liste des leçons */}
                  {chapter.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-2" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {lessonIndex + 1}
                          </Badge>
                          <Input
                            value={lesson.title}
                            onChange={(e) =>
                              updateLesson(chapter.id, lesson.id, 'title', e.target.value)
                            }
                            placeholder="Titre de la leçon"
                            className="flex-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Durée (minutes)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={lesson.duration_minutes}
                              onChange={(e) =>
                                updateLesson(
                                  chapter.id,
                                  lesson.id,
                                  'duration_minutes',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={lesson.is_free_preview}
                                onChange={(e) =>
                                  updateLesson(
                                    chapter.id,
                                    lesson.id,
                                    'is_free_preview',
                                    e.target.checked
                                  )
                                }
                                className="rounded"
                              />
                              <span className="text-sm">Aperçu gratuit</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLesson(chapter.id, lesson.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Bouton ajouter leçon */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addLesson(chapter.id)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une leçon
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Bouton ajouter chapitre */}
      {chapters.length > 0 && (
        <Button onClick={addChapter} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un chapitre
        </Button>
      )}

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Astuce:</strong> Vous pourrez ajouter le contenu détaillé de chaque leçon
            (texte, vidéo, ou slides) après la création du programme.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={handleNext} disabled={chapters.length === 0}>
          Continuer
        </Button>
      </div>
    </div>
  )
}
