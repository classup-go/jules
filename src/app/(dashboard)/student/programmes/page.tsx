'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  BookOpen,
  Users,
  Clock,
  Star,
  Play,
  BookMarked
} from 'lucide-react'
import { Programme, DurationType, PacingType, AccessMode } from '@/types/programme'

export default function StudentProgrammesPage() {
  const router = useRouter()
  const [allProgrammes, setAllProgrammes] = useState<Programme[]>([])
  const [enrolledProgrammes, setEnrolledProgrammes] = useState<Programme[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [filterDuration, setFilterDuration] = useState<DurationType | 'all'>('all')
  const [filterPacing, setFilterPacing] = useState<PacingType | 'all'>('all')
  const [filterAccess, setFilterAccess] = useState<AccessMode | 'all'>('all')

  // Load programmes
  useEffect(() => {
    loadProgrammes()
    loadEnrolledProgrammes()
  }, [filterDuration, filterPacing, filterAccess])

  const loadProgrammes = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()

      // Only show published programmes
      params.append('is_published', 'true')

      if (filterDuration !== 'all') params.append('duration_type', filterDuration)
      if (filterPacing !== 'all') params.append('pacing_type', filterPacing)
      if (filterAccess !== 'all') params.append('access_mode', filterAccess)
      if (searchText) params.append('search', searchText)

      const response = await fetch(`/api/programmes?${params}`)
      if (!response.ok) throw new Error('Erreur de chargement')

      const data = await response.json()
      setAllProgrammes(data.programmes || [])
    } catch (error) {
      console.error('Error loading programmes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadEnrolledProgrammes = async () => {
    try {
      // TODO: Load user's enrolled programmes
      // This would call an endpoint like /api/student/enrollments
      setEnrolledProgrammes([])
    } catch (error) {
      console.error('Error loading enrolled programmes:', error)
    }
  }

  const handleSearch = () => {
    loadProgrammes()
  }

  const handleEnroll = async (programmeId: string) => {
    try {
      // TODO: Implement enrollment
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programme_id: programmeId })
      })

      if (!response.ok) throw new Error('Erreur d\'inscription')

      router.push(`/student/programmes/${programmeId}`)
    } catch (error) {
      console.error('Error enrolling:', error)
      alert('Erreur lors de l\'inscription')
    }
  }

  // Programme Card Component
  const ProgrammeCard = ({ programme, isEnrolled = false }: { programme: Programme; isEnrolled?: boolean }) => {
    const totalLessons = programme.chapters?.reduce(
      (sum, chapter) => sum + (chapter.lessons?.length || 0),
      0
    ) || 0

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Thumbnail */}
        {programme.thumbnail && (
          <div className="relative h-48 bg-muted">
            <img
              src={programme.thumbnail}
              alt={programme.title}
              className="w-full h-full object-cover"
            />
            {isEnrolled && (
              <Badge className="absolute top-2 right-2 bg-green-500">
                Inscrit
              </Badge>
            )}
          </div>
        )}

        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2">{programme.title}</CardTitle>
            {programme.avg_rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{programme.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          {programme.description && (
            <CardDescription className="line-clamp-2">
              {programme.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Teacher */}
          {programme.teacher && (
            <div className="flex items-center gap-2">
              {programme.teacher.avatar_url && (
                <img
                  src={programme.teacher.avatar_url}
                  alt={programme.teacher.full_name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <p className="text-sm text-muted-foreground">
                Par {programme.teacher.full_name}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{totalLessons} leçons</span>
            </div>
            {programme.enrolled_count && programme.enrolled_count > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{programme.enrolled_count} étudiants</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {programme.settings?.duration_type === 'court' && 'Formation courte'}
              {programme.settings?.duration_type === 'moyen' && 'Formation moyenne'}
              {programme.settings?.duration_type === 'long' && 'Parcours complet'}
            </Badge>
            <Badge variant="outline">
              {programme.settings?.pacing_type === 'libre' && 'Rythme libre'}
              {programme.settings?.pacing_type === 'guide' && 'Rythme guidé'}
              {programme.settings?.pacing_type === 'live' && 'Sessions live'}
            </Badge>
          </div>

          {/* Price */}
          {programme.price && programme.price > 0 ? (
            <div className="text-lg font-bold">
              {programme.price.toFixed(2)} {programme.currency}
            </div>
          ) : (
            <Badge variant="secondary">Gratuit</Badge>
          )}
        </CardContent>

        <CardFooter>
          {isEnrolled ? (
            <Button
              className="w-full"
              onClick={() => router.push(`/student/programmes/${programme.id}`)}
            >
              <Play className="h-4 w-4 mr-2" />
              Continuer
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => handleEnroll(programme.id)}
            >
              <BookMarked className="h-4 w-4 mr-2" />
              S'inscrire
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Programmes de formation</h1>
        <p className="text-muted-foreground">
          Découvrez et inscrivez-vous aux formations
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog">Catalogue</TabsTrigger>
          <TabsTrigger value="enrolled">
            Mes inscriptions
            {enrolledProgrammes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enrolledProgrammes.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Duration Filter */}
                <Select
                  value={filterDuration}
                  onValueChange={(value) => setFilterDuration(value as DurationType | 'all')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes durées</SelectItem>
                    <SelectItem value="court">Formation courte</SelectItem>
                    <SelectItem value="moyen">Formation moyenne</SelectItem>
                    <SelectItem value="long">Parcours complet</SelectItem>
                  </SelectContent>
                </Select>

                {/* Pacing Filter */}
                <Select
                  value={filterPacing}
                  onValueChange={(value) => setFilterPacing(value as PacingType | 'all')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rythme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous rythmes</SelectItem>
                    <SelectItem value="libre">Rythme libre</SelectItem>
                    <SelectItem value="guide">Rythme guidé</SelectItem>
                    <SelectItem value="live">Sessions live</SelectItem>
                  </SelectContent>
                </Select>

                {/* Access Filter */}
                <Select
                  value={filterAccess}
                  onValueChange={(value) => setFilterAccess(value as AccessMode | 'all')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Accès" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    <SelectItem value="classe_privee">Classe privée</SelectItem>
                    <SelectItem value="acces_individuel">Accès individuel</SelectItem>
                    <SelectItem value="mixte">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Programmes Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : allProgrammes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun programme trouvé</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Essayez de modifier vos filtres de recherche
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProgrammes.map((programme) => (
                <ProgrammeCard key={programme.id} programme={programme} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Enrolled Tab */}
        <TabsContent value="enrolled" className="space-y-6">
          {enrolledProgrammes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune inscription</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Vous n'êtes inscrit à aucun programme pour le moment
                </p>
                <Button onClick={() => router.push('/student/programmes')}>
                  Découvrir les programmes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledProgrammes.map((programme) => (
                <ProgrammeCard key={programme.id} programme={programme} isEnrolled />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
