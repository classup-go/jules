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
import {
  Plus,
  Search,
  BookOpen,
  Users,
  Clock,
  Eye,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Programme, DurationType, PacingType, AccessMode } from '@/types/programme'

export default function ProgrammesPage() {
  const router = useRouter()
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [filterDuration, setFilterDuration] = useState<DurationType | 'all'>('all')
  const [filterPacing, setFilterPacing] = useState<PacingType | 'all'>('all')
  const [filterAccess, setFilterAccess] = useState<AccessMode | 'all'>('all')

  // Load programmes
  useEffect(() => {
    loadProgrammes()
  }, [filterDuration, filterPacing, filterAccess])

  const loadProgrammes = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()

      if (filterDuration !== 'all') params.append('duration_type', filterDuration)
      if (filterPacing !== 'all') params.append('pacing_type', filterPacing)
      if (filterAccess !== 'all') params.append('access_mode', filterAccess)
      if (searchText) params.append('search', searchText)

      const response = await fetch(`/api/programmes?${params}`)
      if (!response.ok) throw new Error('Erreur de chargement')

      const data = await response.json()
      setProgrammes(data.programmes || [])
    } catch (error) {
      console.error('Error loading programmes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    loadProgrammes()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) return

    try {
      const response = await fetch(`/api/programmes/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Erreur de suppression')

      setProgrammes(programmes.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting programme:', error)
      alert('Erreur lors de la suppression')
    }
  }

  // Get badge color
  const getBadgeVariant = (isPublished: boolean) => {
    return isPublished ? 'default' : 'secondary'
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes Programmes</h1>
          <p className="text-muted-foreground">
            Gérez vos formations, cours et parcours
          </p>
        </div>
        <Button onClick={() => router.push('/teacher/programmes/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Programme
        </Button>
      </div>

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
      ) : programmes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun programme</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Créez votre premier programme pour commencer à enseigner
            </p>
            <Button onClick={() => router.push('/teacher/programmes/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un programme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programmes.map((programme) => (
            <Card key={programme.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Thumbnail */}
              {programme.thumbnail && (
                <div className="relative h-48 bg-muted">
                  <img
                    src={programme.thumbnail}
                    alt={programme.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge
                    variant={getBadgeVariant(programme.is_published)}
                    className="absolute top-2 right-2"
                  >
                    {programme.is_published ? 'Publié' : 'Brouillon'}
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-2">{programme.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/teacher/programmes/${programme.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/teacher/programmes/${programme.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(programme.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {programme.description && (
                  <CardDescription className="line-clamp-2">
                    {programme.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{programme.chapters?.length || 0} chapitres</span>
                  </div>
                  {programme.settings?.restrictions?.max_students && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{programme.enrolled_count || 0}/{programme.settings.restrictions.max_students}</span>
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

              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/teacher/programmes/${programme.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => router.push(`/teacher/programmes/${programme.id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
