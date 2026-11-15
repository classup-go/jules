'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, FileText, Image as ImageIcon, Target } from 'lucide-react'

interface Step1InfoProps {
  title: string
  description: string
  targetAudience: string
  thumbnail: string | null
  onChange: (field: string, value: string) => void
  onNext: () => void
}

/**
 * Step 1: Informations de Base
 * Titre, description, public cible, image
 */
export default function Step1Info({
  title,
  description,
  targetAudience,
  thumbnail,
  onChange,
  onNext,
}: Step1InfoProps) {
  const [errors, setErrors] = useState<string[]>([])

  const handleNext = () => {
    const newErrors: string[] = []

    if (!title.trim()) {
      newErrors.push('Le titre est obligatoire')
    }

    if (title.trim().length < 5) {
      newErrors.push('Le titre doit faire au moins 5 caractères')
    }

    if (!description.trim()) {
      newErrors.push('La description est obligatoire')
    }

    if (description.trim().length < 20) {
      newErrors.push('La description doit faire au moins 20 caractères')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors([])
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Informations de base</h2>
        <p className="text-muted-foreground mt-2">
          Commençons par les informations essentielles de votre programme
        </p>
      </div>

      {/* Erreurs de validation */}
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

      {/* Formulaire */}
      <div className="space-y-6">
        {/* Titre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Titre du programme
            </CardTitle>
            <CardDescription>
              Choisissez un titre clair et accrocheur qui résume votre formation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Ex: Maîtriser React en 30 jours"
              value={title}
              onChange={(e) => onChange('title', e.target.value)}
              className="text-lg"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {title.length}/100 caractères
            </p>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>
              Décrivez le contenu et les objectifs de votre programme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Décrivez ce que les étudiants vont apprendre, les compétences qu'ils vont acquérir, et ce qui rend ce programme unique..."
              value={description}
              onChange={(e) => onChange('description', e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {description.length} caractères - Recommandé: 100-500 caractères
            </p>

            {/* Guide d'aide */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">💡 Conseils pour une bonne description</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Expliquez clairement ce que les étudiants vont apprendre</li>
                <li>Mentionnez les prérequis si nécessaire</li>
                <li>Indiquez le niveau (débutant, intermédiaire, avancé)</li>
                <li>Ajoutez ce qui rend votre programme unique</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Public cible */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Public cible
            </CardTitle>
            <CardDescription>À qui s'adresse principalement ce programme ?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Ex: Développeurs débutants, Professionnels en reconversion, Étudiants..."
              value={targetAudience}
              onChange={(e) => onChange('targetAudience', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Cette information aide les étudiants à savoir si le programme est fait pour eux
            </p>
          </CardContent>
        </Card>

        {/* Image de couverture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Image de couverture
            </CardTitle>
            <CardDescription>
              Ajoutez une image attractive pour votre programme (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="URL de l'image (https://...)"
              value={thumbnail || ''}
              onChange={(e) => onChange('thumbnail', e.target.value)}
            />

            {thumbnail && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={thumbnail}
                  alt="Aperçu"
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Dimensions recommandées: 1280x720 pixels (16:9)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg">
          Continuer
        </Button>
      </div>
    </div>
  )
}
