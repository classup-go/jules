'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Users,
  Edit,
  Settings,
  BarChart3,
  FileText,
  Video,
  Presentation,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react'
import { Programme } from '@/types/programme'

export default function ProgrammeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProgramme()
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

  const togglePublish = async () => {
    if (!programme) return

    try {
      const response = await fetch(`/api/programmes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_published: !programme.is_published
        })
      })

      if (!response.ok) throw new Error('Erreur de mise à jour')

      await loadProgramme()
    } catch (error) {
      console.error('Error toggling publish:', error)
      alert('Erreur lors de la mise à jour')
    }
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
              onClick={() => router.push('/teacher/programmes')}
              className="mt-4"
            >
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate total lessons
  const totalLessons = programme.chapters?.reduce(
    (sum, chapter) => sum + (chapter.lessons?.length || 0),
    0
  ) || 0

  // Calculate total duration
  const totalDuration = programme.chapters?.reduce(
    (sum, chapter) =>
      sum +
      (chapter.lessons?.reduce((lessonSum, lesson) => lessonSum + (lesson.duration_minutes || 0), 0) ||
        0),
    0
  ) || 0

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{programme.title}</h1>
            <Badge variant={programme.is_published ? 'default' : 'secondary'}>
              {programme.is_published ? 'Publié' : 'Brouillon'}
            </Badge>
          </div>
          {programme.description && (
            <p className="text-muted-foreground max-w-2xl">{programme.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={togglePublish}>
            {programme.is_published ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Dépublier
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Publier
              </>
            )}
          </Button>
          <Button onClick={() => router.push(`/teacher/programmes/${params.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chapitres</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programme.chapters?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leçons</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durée totale</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalDuration / 60)}h {totalDuration % 60}min</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Étudiants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programme.enrolled_count || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Contenu</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
          <TabsTrigger value="students">Étudiants</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          {programme.chapters && programme.chapters.length > 0 ? (
            programme.chapters.map((chapter, chapterIndex) => (
              <Card key={chapter.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>
                        Chapitre {chapterIndex + 1}: {chapter.title}
                      </CardTitle>
                      {chapter.description && (
                        <CardDescription>{chapter.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={chapter.is_published ? 'default' : 'secondary'}>
                      {chapter.is_published ? 'Publié' : 'Brouillon'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {chapter.lessons && chapter.lessons.length > 0 ? (
                    <div className="space-y-2">
                      {chapter.lessons.map((lesson, lessonIndex) => {
                        // Determine lesson type icon
                        let contentIcon = <FileText className="h-4 w-4" />
                        if (lesson.presentation_id) contentIcon = <Presentation className="h-4 w-4" />
                        else if (lesson.video_url) contentIcon = <Video className="h-4 w-4" />

                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {contentIcon}
                              <div className="flex-1">
                                <p className="font-medium">
                                  {lessonIndex + 1}. {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  {lesson.duration_minutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {lesson.duration_minutes} min
                                    </span>
                                  )}
                                  {lesson.is_free_preview && (
                                    <Badge variant="outline" className="text-xs">
                                      Aperçu gratuit
                                    </Badge>
                                  )}
                                  <Badge
                                    variant={lesson.is_published ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {lesson.is_published ? 'Publié' : 'Brouillon'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/teacher/programmes/${params.id}/chapters/${chapter.id}/lessons/${lesson.id}/edit`
                                )
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune leçon</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Aucun contenu</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du programme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Type de durée</p>
                  <p className="text-sm text-muted-foreground">
                    {programme.settings?.duration_type === 'court' && 'Formation courte'}
                    {programme.settings?.duration_type === 'moyen' && 'Formation moyenne'}
                    {programme.settings?.duration_type === 'long' && 'Parcours complet'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Rythme</p>
                  <p className="text-sm text-muted-foreground">
                    {programme.settings?.pacing_type === 'libre' && 'Rythme libre'}
                    {programme.settings?.pacing_type === 'guide' && 'Rythme guidé'}
                    {programme.settings?.pacing_type === 'live' && 'Sessions live'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Mode d'accès</p>
                  <p className="text-sm text-muted-foreground">
                    {programme.settings?.access_mode === 'classe_privee' && 'Classe privée'}
                    {programme.settings?.access_mode === 'acces_individuel' && 'Accès individuel'}
                    {programme.settings?.access_mode === 'mixte' && 'Mixte'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Prix</p>
                  <p className="text-sm text-muted-foreground">
                    {programme.price && programme.price > 0
                      ? `${programme.price.toFixed(2)} ${programme.currency}`
                      : 'Gratuit'}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Fonctionnalités activées</p>
                <div className="flex flex-wrap gap-2">
                  {programme.settings?.features?.devoirs && (
                    <Badge variant="outline">Devoirs</Badge>
                  )}
                  {programme.settings?.features?.quizzes && (
                    <Badge variant="outline">Quizzes</Badge>
                  )}
                  {programme.settings?.features?.certificat && (
                    <Badge variant="outline">Certificat</Badge>
                  )}
                  {programme.settings?.features?.forum && (
                    <Badge variant="outline">Forum</Badge>
                  )}
                  {programme.settings?.features?.mentorat && (
                    <Badge variant="outline">Mentorat</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Étudiants inscrits</CardTitle>
              <CardDescription>
                {programme.enrolled_count || 0} étudiant(s) inscrit(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fonctionnalité à venir
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fonctionnalité à venir
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
