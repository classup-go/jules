'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  type ProgrammeSettings,
  type DurationType,
  type PacingType,
  type AccessMode,
  DURATION_TYPE_LABELS,
  PACING_TYPE_LABELS,
  ACCESS_MODE_LABELS,
  PRESET_COURS_COURT,
  PRESET_FORMATION_INTENSIVE,
  PRESET_CURSUS_LONG,
  PRESET_FORMATION_HYBRIDE,
  validateProgrammeSettings,
} from '@/types/programme'
import { CheckCircle2, AlertCircle, Clock, Target, Users, Sparkles } from 'lucide-react'

interface Step2ConfigurationProps {
  settings: ProgrammeSettings
  onChange: (settings: ProgrammeSettings) => void
  onNext: () => void
  onBack: () => void
}

/**
 * Step 2: Configuration du Programme
 *
 * C'est l'étape la plus importante du wizard.
 * Elle remplace les 3 anciens flux (cours structuré, cursus long, intensif)
 * par une configuration unifiée basée sur settings.
 */
export default function Step2Configuration({
  settings,
  onChange,
  onNext,
  onBack,
}: Step2ConfigurationProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')
  const [errors, setErrors] = useState<string[]>([])

  // Valider la configuration
  const handleValidateAndNext = () => {
    const validation = validateProgrammeSettings(settings)

    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    setErrors([])
    onNext()
  }

  // Appliquer un preset
  const applyPreset = (preset: ProgrammeSettings) => {
    onChange(preset)
    setActiveTab('custom')
    setErrors([])
  }

  // Mise à jour des settings
  const updateSettings = (updates: Partial<ProgrammeSettings>) => {
    onChange({ ...settings, ...updates })
  }

  const updateFeature = (feature: keyof ProgrammeSettings['features'], value: boolean) => {
    onChange({
      ...settings,
      features: {
        ...settings.features,
        [feature]: value,
      },
    })
  }

  const updateRestriction = (
    restriction: keyof ProgrammeSettings['restrictions'],
    value: boolean | number | null
  ) => {
    onChange({
      ...settings,
      restrictions: {
        ...settings.restrictions,
        [restriction]: value,
      },
    })
  }

  const updateSchedule = (key: string, value: number | boolean) => {
    onChange({
      ...settings,
      schedule: {
        ...settings.schedule,
        [key]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Configuration du programme</h2>
        <p className="text-muted-foreground mt-2">
          Définissez le format et les paramètres de votre programme de formation
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

      {/* Tabs: Presets ou Custom */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presets' | 'custom')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">
            <Sparkles className="w-4 h-4 mr-2" />
            Modèles rapides
          </TabsTrigger>
          <TabsTrigger value="custom">Configuration personnalisée</TabsTrigger>
        </TabsList>

        {/* TAB 1: PRESETS */}
        <TabsContent value="presets" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choisissez un modèle prédéfini pour démarrer rapidement. Vous pourrez le personnaliser
            ensuite.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preset 1: Masterclass */}
            <PresetCard
              title="Masterclass Express"
              description="Formation courte à suivre à son rythme"
              duration="1-3 heures"
              icon="🎯"
              features={[
                'Accès individuel',
                'Progression libre',
                'Aperçu gratuit possible',
              ]}
              onSelect={() => applyPreset(PRESET_COURS_COURT)}
            />

            {/* Preset 2: Bootcamp */}
            <PresetCard
              title="Bootcamp Intensif"
              description="Formation en direct avec groupe privé"
              duration="2-4 semaines"
              icon="🚀"
              features={[
                'Sessions en direct',
                'Classe privée',
                'Certificat inclus',
                'Devoirs et évaluations',
              ]}
              onSelect={() => applyPreset(PRESET_FORMATION_INTENSIVE)}
            />

            {/* Preset 3: Cursus Long */}
            <PresetCard
              title="Parcours Complet"
              description="Programme long avec progression guidée"
              duration="20+ heures"
              icon="📚"
              features={[
                'Progression guidée',
                'Certificat inclus',
                'Communauté active',
                'Devoirs et projets',
              ]}
              onSelect={() => applyPreset(PRESET_CURSUS_LONG)}
            />

            {/* Preset 4: Formation Hybride */}
            <PresetCard
              title="Formation Hybride"
              description="Combine autonomie et sessions collectives"
              duration="10-20 heures"
              icon="🔀"
              features={[
                'Accès mixte',
                'Sessions live mensuelles',
                'Progression guidée',
                'Certificat inclus',
              ]}
              onSelect={() => applyPreset(PRESET_FORMATION_HYBRIDE)}
            />
          </div>
        </TabsContent>

        {/* TAB 2: CONFIGURATION PERSONNALISÉE */}
        <TabsContent value="custom" className="space-y-6">
          {/* Section 1: Paramètres principaux */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Paramètres principaux
              </CardTitle>
              <CardDescription>
                Ces 3 paramètres définissent le format de votre programme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Duration Type */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Durée du programme
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(DURATION_TYPE_LABELS) as DurationType[]).map((type) => (
                    <SelectableCard
                      key={type}
                      selected={settings.duration_type === type}
                      onClick={() => updateSettings({ duration_type: type })}
                      title={DURATION_TYPE_LABELS[type].label}
                      description={DURATION_TYPE_LABELS[type].description}
                      badge={DURATION_TYPE_LABELS[type].duration}
                    />
                  ))}
                </div>
              </div>

              {/* Pacing Type */}
              <div className="space-y-3">
                <Label>Rythme de progression</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(PACING_TYPE_LABELS) as PacingType[]).map((type) => (
                    <SelectableCard
                      key={type}
                      selected={settings.pacing_type === type}
                      onClick={() => updateSettings({ pacing_type: type })}
                      title={PACING_TYPE_LABELS[type].label}
                      description={PACING_TYPE_LABELS[type].description}
                      icon={PACING_TYPE_LABELS[type].icon}
                    />
                  ))}
                </div>
              </div>

              {/* Access Mode */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Mode d'accès
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(ACCESS_MODE_LABELS) as AccessMode[]).map((mode) => (
                    <SelectableCard
                      key={mode}
                      selected={settings.access_mode === mode}
                      onClick={() => updateSettings({ access_mode: mode })}
                      title={ACCESS_MODE_LABELS[mode].label}
                      description={ACCESS_MODE_LABELS[mode].description}
                      icon={ACCESS_MODE_LABELS[mode].icon}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Features */}
          <Card>
            <CardHeader>
              <CardTitle>Fonctionnalités</CardTitle>
              <CardDescription>
                Activez les fonctionnalités que vous souhaitez proposer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FeatureToggle
                label="Aperçu gratuit"
                description="Permettre l'accès gratuit à certaines leçons"
                checked={settings.features.allow_previews}
                onCheckedChange={(checked) => updateFeature('allow_previews', checked)}
              />

              <FeatureToggle
                label="Certificat de complétion"
                description="Délivrer un certificat aux étudiants qui terminent"
                checked={settings.features.certificate_enabled}
                onCheckedChange={(checked) => updateFeature('certificate_enabled', checked)}
              />

              <FeatureToggle
                label="Communauté"
                description="Accès à un forum ou espace de discussion"
                checked={settings.features.community_enabled}
                onCheckedChange={(checked) => updateFeature('community_enabled', checked)}
              />

              <FeatureToggle
                label="Devoirs et évaluations"
                description="Inclure des exercices et évaluations notées"
                checked={settings.features.assignments_enabled}
                onCheckedChange={(checked) => updateFeature('assignments_enabled', checked)}
              />

              <FeatureToggle
                label="Sessions en direct"
                description="Inclure des sessions live avec vidéo"
                checked={settings.features.live_sessions_enabled}
                onCheckedChange={(checked) => updateFeature('live_sessions_enabled', checked)}
                disabled={settings.pacing_type === 'live'} // Auto-activé si pacing=live
              />
            </CardContent>
          </Card>

          {/* Section 3: Restrictions */}
          <Card>
            <CardHeader>
              <CardTitle>Restrictions d'accès</CardTitle>
              <CardDescription>Définir des contraintes de progression</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FeatureToggle
                label="Progression séquentielle"
                description="Les leçons doivent être complétées dans l'ordre"
                checked={settings.restrictions.requires_sequential}
                onCheckedChange={(checked) => updateRestriction('requires_sequential', checked)}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="time-limit">Limite de temps (en jours)</Label>
                  <Badge variant="outline">Optionnel</Badge>
                </div>
                <Input
                  id="time-limit"
                  type="number"
                  min="0"
                  placeholder="Ex: 365 jours"
                  value={settings.restrictions.time_limit_days || ''}
                  onChange={(e) =>
                    updateRestriction(
                      'time_limit_days',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Nombre de jours pour compléter le programme (0 = illimité)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-attempts">Tentatives maximum</Label>
                  <Badge variant="outline">Optionnel</Badge>
                </div>
                <Input
                  id="max-attempts"
                  type="number"
                  min="1"
                  placeholder="Ex: 3 tentatives"
                  value={settings.restrictions.max_attempts || ''}
                  onChange={(e) =>
                    updateRestriction(
                      'max_attempts',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Nombre de tentatives pour les évaluations (vide = illimité)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Planning (si live sessions) */}
          {settings.features.live_sessions_enabled && (
            <Card>
              <CardHeader>
                <CardTitle>Planning des sessions live</CardTitle>
                <CardDescription>Configurez la fréquence des sessions en direct</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessions-per-week">Sessions par semaine</Label>
                    <Input
                      id="sessions-per-week"
                      type="number"
                      min="1"
                      max="7"
                      value={settings.schedule?.live_sessions_per_week || ''}
                      onChange={(e) =>
                        updateSchedule('live_sessions_per_week', parseInt(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration-weeks">Durée (semaines)</Label>
                    <Input
                      id="duration-weeks"
                      type="number"
                      min="1"
                      value={settings.schedule?.duration_weeks || ''}
                      onChange={(e) => updateSchedule('duration_weeks', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <FeatureToggle
                  label="Sessions optionnelles"
                  description="Les sessions live sont recommandées mais pas obligatoires"
                  checked={settings.schedule?.live_sessions_optional || false}
                  onCheckedChange={(checked) => updateSchedule('live_sessions_optional', checked)}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Résumé de la configuration */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Résumé de votre configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Durée</p>
              <p className="text-muted-foreground">
                {DURATION_TYPE_LABELS[settings.duration_type].label}
              </p>
            </div>
            <div>
              <p className="font-medium">Rythme</p>
              <p className="text-muted-foreground">
                {PACING_TYPE_LABELS[settings.pacing_type].label}
              </p>
            </div>
            <div>
              <p className="font-medium">Mode d'accès</p>
              <p className="text-muted-foreground">
                {ACCESS_MODE_LABELS[settings.access_mode].label}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={handleValidateAndNext}>Continuer</Button>
      </div>
    </div>
  )
}

// =====================================================
// COMPOSANTS UTILITAIRES
// =====================================================

interface PresetCardProps {
  title: string
  description: string
  duration: string
  icon: string
  features: string[]
  onSelect: () => void
}

function PresetCard({ title, description, duration, icon, features, onSelect }: PresetCardProps) {
  return (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={onSelect}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="text-3xl mb-2">{icon}</div>
          <Badge variant="secondary">{duration}</Badge>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

interface SelectableCardProps {
  selected: boolean
  onClick: () => void
  title: string
  description: string
  badge?: string
  icon?: string
}

function SelectableCard({ selected, onClick, title, description, badge, icon }: SelectableCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all
        ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
      `}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className="space-y-2">
        {icon && <div className="text-2xl">{icon}</div>}
        <div>
          <p className="font-medium">{title}</p>
          {badge && (
            <Badge variant="secondary" className="text-xs mt-1">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

interface FeatureToggleProps {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

function FeatureToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: FeatureToggleProps) {
  return (
    <div className="flex items-start justify-between space-x-4">
      <div className="space-y-1 flex-1">
        <Label className={disabled ? 'text-muted-foreground' : ''}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
