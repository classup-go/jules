'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Presentation, FileSlides, Clock } from 'lucide-react'

interface PresentationItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  total_slides: number
  is_public: boolean
  created_at: string
  used_in_lessons_count: number
}

interface PresentationPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (presentationId: string) => void
  teacherId: string
}

export default function PresentationPicker({
  open,
  onClose,
  onSelect,
  teacherId
}: PresentationPickerProps) {
  const [presentations, setPresentations] = useState<PresentationItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Fetch presentations
  useEffect(() => {
    if (open) {
      fetchPresentations()
    }
  }, [open, teacherId])

  const fetchPresentations = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        teacher_id: teacherId,
        limit: '50'
      })

      if (searchText) {
        params.append('search', searchText)
      }

      const response = await fetch(`/api/presentations?${params}`)
      if (!response.ok) throw new Error('Erreur lors du chargement')

      const data = await response.json()
      setPresentations(data.presentations || [])
    } catch (error) {
      console.error('Error fetching presentations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = () => {
    fetchPresentations()
  }

  // Handle select
  const handleSelect = () => {
    if (selectedId) {
      onSelect(selectedId)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Sélectionner une présentation</DialogTitle>
          <DialogDescription>
            Choisissez une présentation existante pour cette leçon
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher une présentation..."
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} variant="secondary">
            Rechercher
          </Button>
        </div>

        {/* Presentations List */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : presentations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Presentation className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Aucune présentation trouvée</p>
              <p className="text-xs text-muted-foreground mt-1">
                Créez votre première présentation pour commencer
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {presentations.map((presentation) => (
                <Card
                  key={presentation.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedId === presentation.id ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => setSelectedId(presentation.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-32 h-20 bg-muted rounded-md overflow-hidden">
                        {presentation.thumbnail ? (
                          <img
                            src={presentation.thumbnail}
                            alt={presentation.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileSlides className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {presentation.title}
                            </h4>
                            {presentation.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {presentation.description}
                              </p>
                            )}
                          </div>
                          {presentation.is_public && (
                            <Badge variant="secondary" className="flex-shrink-0">
                              Public
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileSlides className="h-3 w-3" />
                            <span>{presentation.total_slides} slides</span>
                          </div>
                          {presentation.used_in_lessons_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Utilisé dans {presentation.used_in_lessons_count} leçon
                                {presentation.used_in_lessons_count > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          <span>
                            {new Date(presentation.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSelect} disabled={!selectedId}>
            Sélectionner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
