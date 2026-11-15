'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  FileText,
  Settings,
  BookOpen,
  DollarSign,
  Clock,
  Target,
  Users,
  Globe,
  Lock,
} from 'lucide-react'
import {
  type ProgrammeSettings,
  DURATION_TYPE_LABELS,
  PACING_TYPE_LABELS,
  ACCESS_MODE_LABELS,
} from '@/types/programme'

interface Chapter {
  id: string
  title: string
  description: string
  lessons: Array<{
    id: string
    title: string
    content: string
    duration_minutes: number
    is_free_preview: boolean
  }>
}

interface Step5PublicationProps {
  // Données du programme
  title: string
  description: string
  targetAudience: string
  thumbnail: string | null
  settings: ProgrammeSettings
  chapters: Chapter[]
  price: number
  currency: string

  // Publication
  isPublished: boolean
  onPublishChange: (published: boolean) => void

  // Actions
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

/**
 * Step 5: Revue et Publication
 * Résumé complet et bouton de publication
 */
export default function Step5Publication({
  title,
  description,
  targetAudience,
  thumbnail,
  settings,
  chapters,
  price,
  currency,
  isPublished,
  onPublishChange,
  onBack,
  onSubmit,
  isSubmitting,
}: Step5PublicationProps) {
  const totalLessons = chapters.reduce((sum, c) => sum + c.lessons.length, 0)
  const totalDuration = chapters.reduce(
    (sum, c) => sum + c.lessons.reduce((s, l) => s + l.duration_minutes, 0),
    0
  )
  const freePreviews = chapters.reduce(
    (sum, c) => sum + c.lessons.filter((l) => l.is_free_preview).length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Revue et publication</h2>
        <p className="text-muted-foreground mt-2">
          Vérifiez les informations avant de publier votre programme
        </p>
      </div>

      {/* Statut de publication */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPublished ? (
              <>
                <Globe className="w-5 h-5 text-green-600" />
                Publication
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-orange-600" />
                Brouillon
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isPublished
              ? 'Votre programme sera visible et accessible aux étudiants'
              : 'Votre programme restera privé et accessible uniquement par vous'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="publish-toggle" className="font-medium">
                Publier maintenant
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Vous pourrez toujours modifier ou dépublier plus tard
              </p>
            </div>
            <Switch
              id="publish-toggle"
              checked={isPublished}
              onCheckedChange={onPublishChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Résumé Section 1: Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informations de base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Titre</Label>
            <p className="font-medium">{title}</p>
          </div>

          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="text-sm">{description}</p>
          </div>

          {targetAudience && (
            <div>
              <Label className="text-muted-foreground">Public cible</Label>
              <p className="text-sm">{targetAudience}</p>
            </div>
          )}

          {thumbnail && (
            <div>
              <Label className="text-muted-foreground">Image de couverture</Label>
              <div className="mt-2 rounded-lg overflow-hidden border w-48">
                <img src={thumbnail} alt="Couverture" className="w-full h-auto" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé Section 2: Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label className="text-muted-foreground">Durée</Label>
              </div>
              <p className="font-medium">
                {DURATION_TYPE_LABELS[settings.duration_type].label}
              </p>
              <p className="text-sm text-muted-foreground">
                {DURATION_TYPE_LABELS[settings.duration_type].duration}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <Label className="text-muted-foreground">Rythme</Label>
              </div>
              <p className="font-medium">
                {PACING_TYPE_LABELS[settings.pacing_type].icon}{' '}
                {PACING_TYPE_LABELS[settings.pacing_type].label}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-muted-foreground">Accès</Label>
              </div>
              <p className="font-medium">
                {ACCESS_MODE_LABELS[settings.access_mode].icon}{' '}
                {ACCESS_MODE_LABELS[settings.access_mode].label}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <Label className="text-muted-foreground mb-2 block">Fonctionnalités activées</Label>
            <div className="flex flex-wrap gap-2">
              {settings.features.allow_previews && (
                <Badge variant="secondary">Aperçu gratuit</Badge>
              )}
              {settings.features.certificate_enabled && (
                <Badge variant="secondary">Certificat</Badge>
              )}
              {settings.features.community_enabled && (
                <Badge variant="secondary">Communauté</Badge>
              )}
              {settings.features.assignments_enabled && (
                <Badge variant="secondary">Devoirs</Badge>
              )}
              {settings.features.live_sessions_enabled && (
                <Badge variant="secondary">Sessions live</Badge>
              )}
            </div>
          </div>

          {settings.restrictions.requires_sequential && (
            <>
              <Separator className="my-4" />
              <div>
                <Label className="text-muted-foreground mb-2 block">Restrictions</Label>
                <div className="space-y-1 text-sm">
                  <p>✓ Progression séquentielle activée</p>
                  {settings.restrictions.time_limit_days && (
                    <p>✓ Limite: {settings.restrictions.time_limit_days} jours</p>
                  )}
                  {settings.restrictions.max_attempts && (
                    <p>✓ Maximum {settings.restrictions.max_attempts} tentatives</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Résumé Section 3: Contenu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Structure du contenu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{chapters.length}</div>
              <p className="text-sm text-muted-foreground">Chapitres</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{totalLessons}</div>
              <p className="text-sm text-muted-foreground">Leçons</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {Math.floor(totalDuration / 60)}h{totalDuration % 60}m
              </div>
              <p className="text-sm text-muted-foreground">Durée totale</p>
            </div>
          </div>

          {freePreviews > 0 && (
            <p className="text-sm text-muted-foreground">
              {freePreviews} leçon{freePreviews > 1 ? 's' : ''} en aperçu gratuit
            </p>
          )}

          <Separator />

          <div className="space-y-2">
            {chapters.map((chapter, i) => (
              <div key={chapter.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    Chapitre {i + 1}
                  </Badge>
                  <span className="font-medium">{chapter.title}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {chapter.lessons.length} leçons
                  </Badge>
                </div>
                {chapter.description && (
                  <p className="text-sm text-muted-foreground ml-2">{chapter.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Résumé Section 4: Tarification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tarification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {price === 0 ? (
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                GRATUIT
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Ce programme sera accessible gratuitement
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground">Prix du programme</Label>
                  <p className="text-3xl font-bold mt-1">
                    {price}{' '}
                    {
                      [
                        { code: 'EUR', symbol: '€' },
                        { code: 'TND', symbol: 'DT' },
                        { code: 'XOF', symbol: 'CFA' },
                        { code: 'USD', symbol: '$' },
                        { code: 'CAD', symbol: 'CAD$' },
                      ].find((c) => c.code === currency)?.symbol
                    }
                  </p>
                </div>
                <div className="text-right">
                  <Label className="text-muted-foreground">Vous recevez</Label>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {(price * 0.8).toFixed(2)}{' '}
                    {
                      [
                        { code: 'EUR', symbol: '€' },
                        { code: 'TND', symbol: 'DT' },
                        { code: 'XOF', symbol: 'CFA' },
                        { code: 'USD', symbol: '$' },
                        { code: 'CAD', symbol: 'CAD$' },
                      ].find((c) => c.code === currency)?.symbol
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">(après commission 20%)</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist finale */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Checklist avant publication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Titre et description définis</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Configuration complète</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Au moins 1 chapitre avec des leçons</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Prix défini</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Retour
        </Button>
        <div className="flex gap-2">
          {!isPublished && (
            <Button
              variant="outline"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              Sauvegarder en brouillon
            </Button>
          )}
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting
              ? 'Publication...'
              : isPublished
              ? 'Publier le programme'
              : 'Créer le programme'}
          </Button>
        </div>
      </div>
    </div>
  )
}
