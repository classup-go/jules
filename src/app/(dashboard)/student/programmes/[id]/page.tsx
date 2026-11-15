'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  Play,
  FileText,
  Video,
  Presentation,
  Award
} from 'lucide-react'
import { Programme } from '@/types/programme'

export default function StudentProgrammeViewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    loadProgramme()
    loadProgress()
  }, [params.id])

  const loadProgramme = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/programmes/${params.id}`)
      if (!response.ok) throw new Error('Erreur de chargement')

      const data = await response.json()
      setProgramme(data.programme)
    } catch (error) {
      console.error('Error loading programme:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProgress = async () => {
    try {
      // TODO: Load user's progress for this programme
      // This would call /api/student/progress/${programmeId}
      setCompletedLessons(new Set())
      setProgress(0)
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const handleStartLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId)
    router.push(`/student/programmes/${params.id}/lessons/${lessonId}`)
  }

  const isLessonCompleted = (lessonId: string) => {
    return completedLessons.has(lessonId)
  }

  const isLessonAccessible = (lesson: any) => {
    // Free preview lessons are always accessible
    if (lesson.is_free_preview) return true

    // Check if previous lessons are completed (for guided pacing)
    if (programme?.settings?.pacing_type === 'guide') {
      // TODO: Implement sequential access logic
      return true
    }

    // Default: all lessons accessible
    return true
  }

  const getLessonIcon = (lesson: any) => {
    if (lesson.presentation_id) return <Presentation className="h-4 w-4" />
    if (lesson.video_url) return <Video className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const getStatusIcon = (lesson: any) => {
    if (!isLessonAccessible(lesson)) {
      return <Lock className="h-4 w-4 text-muted-foreground" />
    }
    if (isLessonCompleted(lesson.id)) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!programme) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">Programme non trouvé</p>
            <Button
              variant="outline"
              onClick={() => router.push('/student/programmes')}
              className="mt-4"
            >
              Retour au catalogue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalLessons = programme.chapters?.reduce(
    (sum, chapter) => sum + (chapter.lessons?.length || 0),
    0
  ) || 0

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Programme Header */}
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div>
                  <CardTitle className="text-2xl mb-2">{programme.title}</CardTitle>
                  {programme.description && (
                    <CardDescription>{programme.description}</CardDescription>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progression</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {completedLessons.size} sur {totalLessons} leçons complétées
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Chapters & Lessons */}
          <Card>
            <CardHeader>
              <CardTitle>Contenu du programme</CardTitle>
            </CardHeader>
            <CardContent>
              {programme.chapters && programme.chapters.length > 0 ? (
                <Accordion type="multiple" className="w-full">
                  {programme.chapters.map((chapter, chapterIndex) => {
                    const chapterLessons = chapter.lessons || []
                    const completedCount = chapterLessons.filter((l) =>
                      isLessonCompleted(l.id)
                    ).length

                    return (
                      <AccordionItem key={chapter.id} value={`chapter-${chapter.id}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                {chapterIndex + 1}
                              </div>
                              <div className="text-left">
                                <p className="font-medium">{chapter.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {completedCount}/{chapterLessons.length} leçons
                                </p>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-11 space-y-2">
                            {chapterLessons.map((lesson, lessonIndex) => {
                              const isAccessible = isLessonAccessible(lesson)
                              const isCompleted = isLessonCompleted(lesson.id)

                              return (
                                <div
                                  key={lesson.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    isAccessible
                                      ? 'hover:bg-accent cursor-pointer transition-colors'
                                      : 'opacity-50'
                                  }`}
                                  onClick={() =>
                                    isAccessible && handleStartLesson(lesson.id)
                                  }
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    {getStatusIcon(lesson)}
                                    {getLessonIcon(lesson)}
                                    <div className="flex-1">
                                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                        {lessonIndex + 1}. {lesson.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {lesson.duration_minutes && (
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {lesson.duration_minutes} min
                                          </span>
                                        )}
                                        {lesson.is_free_preview && (
                                          <Badge variant="outline" className="text-xs">
                                            Aperçu gratuit
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {isAccessible && !isCompleted && (
                                    <Button size="sm" variant="ghost">
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun contenu disponible
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Teacher Info */}
          {programme.teacher && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Votre instructeur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {programme.teacher.avatar_url && (
                    <img
                      src={programme.teacher.avatar_url}
                      alt={programme.teacher.full_name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{programme.teacher.full_name}</p>
                    {programme.teacher.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {programme.teacher.bio}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Programme Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Durée</span>
                <span className="font-medium">
                  {programme.settings?.duration_type === 'court' && 'Formation courte'}
                  {programme.settings?.duration_type === 'moyen' && 'Formation moyenne'}
                  {programme.settings?.duration_type === 'long' && 'Parcours complet'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rythme</span>
                <span className="font-medium">
                  {programme.settings?.pacing_type === 'libre' && 'Rythme libre'}
                  {programme.settings?.pacing_type === 'guide' && 'Rythme guidé'}
                  {programme.settings?.pacing_type === 'live' && 'Sessions live'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chapitres</span>
                <span className="font-medium">{programme.chapters?.length || 0}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Leçons</span>
                <span className="font-medium">{totalLessons}</span>
              </div>
            </CardContent>
          </Card>

          {/* Certificate */}
          {programme.settings?.features?.certificat && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certificat
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progress === 100 ? (
                  <Button className="w-full">
                    Télécharger le certificat
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complétez toutes les leçons pour obtenir votre certificat
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
