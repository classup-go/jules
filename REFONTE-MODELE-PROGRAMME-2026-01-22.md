# REFONTE: MODÈLE UNIFIÉ "PROGRAMME"
**Date:** 22 janvier 2026
**Objectif:** Remplacer les 3 types de cours par un modèle unique et flexible

---

## 🎯 VISION

### Avant (Complexe)
```
❌ 3 types de cours différents:
   - Cours structuré (avec classe)
   - Cursus long (progressif)
   - Intensif (court, ciblé)

❌ 3 parcours de création différents
❌ 3 logiques métier différentes
❌ Confusion pour les utilisateurs
```

### Après (Simple et Pro)
```
✅ 1 seul objet: Programme
✅ 1 seul parcours de création
✅ Paramètres flexibles (durée, rythme, usage)
✅ UX claire et unifiée
```

---

## 📊 NOUVEAU MODÈLE DE DONNÉES

### Structure du Programme

```typescript
interface Programme {
  id: string
  teacher_id: string

  // Informations de base
  title: string
  description: string
  level: 'primaire' | 'college' | 'lycee' | 'superieur'
  subject: string
  language: 'fr' | 'ar' | 'en'

  // Objectifs pédagogiques
  learning_objectives: string[]
  prerequisites: string[]
  target_audience: string

  // Structure modulaire
  modules: Module[]

  // Paramètres configurables (LA MAGIE)
  settings: ProgrammeSettings

  // Métadonnées
  total_duration_hours: number
  difficulty: 'debutant' | 'intermediaire' | 'avance'
  is_published: boolean

  // Stats
  enrolled_count: number
  completion_rate: number
  avg_rating: number

  created_at: string
  updated_at: string
}

interface ProgrammeSettings {
  // A. Durée
  duration_type: 'court' | 'moyen' | 'long'
  duration_value: number  // Nombre de semaines/mois

  // B. Rythme
  pacing_type: 'libre' | 'guide' | 'live'
  suggested_hours_per_week?: number  // Pour rythme guidé

  // C. Usage
  access_mode: 'classe_privee' | 'acces_individuel' | 'mixte'

  // Options avancées
  allow_self_paced: boolean
  require_sequential_completion: boolean
  enable_certificates: boolean
  enable_community: boolean
}

interface Module {
  id: string
  title: string
  description: string
  order_index: number
  duration_hours: number

  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  order_index: number
  duration_minutes: number

  // Type de contenu
  content_type: 'text' | 'video' | 'pdf' | 'slides' | 'quiz' | 'exercise' | 'live'

  // Contenu selon le type
  content: LessonContent

  // Métadonnées
  is_free: boolean  // Preview gratuit
  requires_completion: boolean
}

type LessonContent =
  | { type: 'text'; markdown: string }
  | { type: 'video'; video_url: string; transcript?: string }
  | { type: 'pdf'; pdf_url: string }
  | { type: 'slides'; presentation_id: string }
  | { type: 'quiz'; questions: QuizQuestion[] }
  | { type: 'exercise'; instructions: string; solution?: string }
  | { type: 'live'; session_id: string; scheduled_at: string }
```

### Mapping avec Ancien Système

```typescript
// 🔁 Comment les anciens types se mappent au nouveau modèle

// AVANT: "Cours structuré"
// APRÈS: Programme avec ces settings:
{
  duration_type: 'moyen',
  pacing_type: 'live',
  access_mode: 'classe_privee'
}

// AVANT: "Cursus long"
// APRÈS: Programme avec ces settings:
{
  duration_type: 'long',
  pacing_type: 'guide',
  access_mode: 'acces_individuel'
}

// AVANT: "Intensif"
// APRÈS: Programme avec ces settings:
{
  duration_type: 'court',
  pacing_type: 'guide',
  access_mode: 'acces_individuel'
}
```

---

## 🗄️ SCHÉMA BASE DE DONNÉES

### Migration SQL

**Fichier:** `migrations/003-unified-programme-model.sql`

```sql
-- ============================================
-- MIGRATION: Modèle Unifié "Programme"
-- ============================================

-- 1. Renommer table courses → programmes
ALTER TABLE IF EXISTS courses RENAME TO programmes;

-- 2. Ajouter nouvelles colonnes settings
ALTER TABLE programmes
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "duration_type": "moyen",
  "pacing_type": "libre",
  "access_mode": "acces_individuel",
  "allow_self_paced": true,
  "require_sequential_completion": false,
  "enable_certificates": true,
  "enable_community": false
}'::jsonb;

-- 3. Ajouter colonnes métadonnées
ALTER TABLE programmes
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0;

-- 4. Supprimer colonnes obsolètes (si besoin)
-- ALTER TABLE programmes DROP COLUMN IF EXISTS course_type;

-- 5. Renommer foreign keys
ALTER TABLE chapters RENAME COLUMN course_id TO programme_id;

-- 6. Mettre à jour contraintes
ALTER TABLE chapters
DROP CONSTRAINT IF EXISTS chapters_course_id_fkey;

ALTER TABLE chapters
ADD CONSTRAINT chapters_programme_id_fkey
FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE;

-- 7. Créer indexes
CREATE INDEX IF NOT EXISTS idx_programmes_settings
  ON programmes USING gin(settings);

CREATE INDEX IF NOT EXISTS idx_programmes_teacher_published
  ON programmes(teacher_id, is_published);

-- 8. Migrer données existantes selon leur type
UPDATE programmes
SET settings = CASE
  -- Si c'était un "cours structuré" (détection heuristique)
  WHEN duration_weeks <= 8 AND classroom_id IS NOT NULL THEN
    '{"duration_type": "moyen", "pacing_type": "live", "access_mode": "classe_privee"}'::jsonb

  -- Si c'était un "cursus long"
  WHEN duration_weeks > 16 THEN
    '{"duration_type": "long", "pacing_type": "guide", "access_mode": "acces_individuel"}'::jsonb

  -- Si c'était un "intensif"
  WHEN duration_weeks <= 4 THEN
    '{"duration_type": "court", "pacing_type": "guide", "access_mode": "acces_individuel"}'::jsonb

  -- Par défaut
  ELSE
    '{"duration_type": "moyen", "pacing_type": "libre", "access_mode": "acces_individuel"}'::jsonb
END
WHERE settings IS NULL OR settings = '{}'::jsonb;

-- 9. Fonction helper pour calculer enrolled_count
CREATE OR REPLACE FUNCTION update_programme_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE programmes
    SET enrolled_count = enrolled_count + 1
    WHERE id = (
      SELECT programme_id
      FROM chapters
      WHERE id IN (
        SELECT chapter_id FROM lessons WHERE id = NEW.lesson_id
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE programmes
    SET enrolled_count = GREATEST(0, enrolled_count - 1)
    WHERE id = (
      SELECT programme_id
      FROM chapters
      WHERE id IN (
        SELECT chapter_id FROM lessons WHERE id = OLD.lesson_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur enrollments (à adapter selon votre modèle)

-- 10. Commentaires
COMMENT ON TABLE programmes IS 'Modèle unifié remplaçant courses/cursus/intensifs';
COMMENT ON COLUMN programmes.settings IS 'Configuration flexible (durée, rythme, usage)';
COMMENT ON COLUMN programmes.target_audience IS 'Public cible du programme';

-- 11. RLS policies (ajuster selon besoins)
DROP POLICY IF EXISTS "Users can view published programmes" ON programmes;
CREATE POLICY "Users can view published programmes"
  ON programmes FOR SELECT
  USING (is_published = true OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can manage own programmes" ON programmes;
CREATE POLICY "Teachers can manage own programmes"
  ON programmes FOR ALL
  USING (teacher_id = auth.uid());
```

---

## 🔧 TYPES TYPESCRIPT

**Fichier:** `src/types/programme.ts`

```typescript
// ============================================
// Types pour le nouveau modèle Programme
// ============================================

export type DurationType = 'court' | 'moyen' | 'long'
export type PacingType = 'libre' | 'guide' | 'live'
export type AccessMode = 'classe_privee' | 'acces_individuel' | 'mixte'

export interface ProgrammeSettings {
  // Durée
  duration_type: DurationType
  duration_value: number  // En semaines

  // Rythme
  pacing_type: PacingType
  suggested_hours_per_week?: number

  // Usage
  access_mode: AccessMode

  // Options
  allow_self_paced: boolean
  require_sequential_completion: boolean
  enable_certificates: boolean
  enable_community: boolean
}

export interface Programme {
  id: string
  teacher_id: string
  classroom_id?: string  // Optionnel, pour classe_privee

  // Base
  title: string
  description: string
  level: 'primaire' | 'college' | 'lycee' | 'superieur'
  subject: string
  language: 'fr' | 'ar' | 'en'

  // Pédagogie
  learning_objectives: string[]
  prerequisites: string[]
  target_audience: string

  // Settings (LA CLÉ)
  settings: ProgrammeSettings

  // Métadonnées
  total_duration_hours: number
  difficulty: 'debutant' | 'intermediaire' | 'avance'
  is_published: boolean

  // Stats
  enrolled_count: number
  completion_rate: number
  avg_rating: number

  // Dates
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  programme_id: string
  title: string
  description: string
  order_index: number
  duration_hours: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  order_index: number
  duration_minutes: number

  content_type: 'text' | 'video' | 'pdf' | 'slides' | 'quiz' | 'exercise' | 'live'
  content: Record<string, any>  // Flexible content storage

  is_free: boolean
  requires_completion: boolean

  created_at: string
  updated_at: string
}

// Helpers pour déduire le type "ancien" depuis les settings
export function getProgrammeTypeLabel(settings: ProgrammeSettings): string {
  const { duration_type, pacing_type, access_mode } = settings

  if (duration_type === 'court' && pacing_type === 'guide') {
    return 'Programme intensif'
  }

  if (duration_type === 'long' && pacing_type === 'guide') {
    return 'Cursus long terme'
  }

  if (pacing_type === 'live' && access_mode === 'classe_privee') {
    return 'Cours avec classe'
  }

  return 'Programme personnalisé'
}

export function getDurationLabel(settings: ProgrammeSettings): string {
  const { duration_type, duration_value } = settings

  switch (duration_type) {
    case 'court':
      return `${duration_value} semaine${duration_value > 1 ? 's' : ''}`
    case 'moyen':
      return `${duration_value} semaine${duration_value > 1 ? 's' : ''}`
    case 'long':
      const months = Math.ceil(duration_value / 4)
      return `${months} mois`
    default:
      return `${duration_value} semaines`
  }
}

export function getPacingLabel(pacing_type: PacingType): string {
  switch (pacing_type) {
    case 'libre':
      return 'À votre rythme'
    case 'guide':
      return 'Rythme guidé'
    case 'live':
      return 'Sessions en direct'
    default:
      return pacing_type
  }
}
```

---

## 🎨 NOUVEAU WIZARD DE CRÉATION

**Fichier:** `src/components/programme-wizard/ProgrammeWizard.tsx`

```typescript
'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

// Schéma de validation
const programmeSchema = z.object({
  // Étape 1: Informations de base
  title: z.string().min(5, 'Minimum 5 caractères'),
  description: z.string().min(20, 'Minimum 20 caractères'),
  level: z.enum(['primaire', 'college', 'lycee', 'superieur']),
  subject: z.string(),
  language: z.enum(['fr', 'ar', 'en']),

  // Étape 2: Configuration (LA MAGIE)
  duration_type: z.enum(['court', 'moyen', 'long']),
  duration_value: z.number().min(1).max(52),
  pacing_type: z.enum(['libre', 'guide', 'live']),
  access_mode: z.enum(['classe_privee', 'acces_individuel', 'mixte']),

  // Étape 3: Objectifs
  learning_objectives: z.array(z.string()).min(2),
  prerequisites: z.array(z.string()).optional(),
  target_audience: z.string(),

  // Étape 4: Structure (modules)
  modules: z.array(z.object({
    title: z.string(),
    lessons: z.array(z.object({
      title: z.string(),
      content_type: z.enum(['text', 'video', 'pdf', 'slides', 'quiz', 'exercise', 'live'])
    }))
  })).min(1)
})

export function ProgrammeWizard() {
  const [step, setStep] = useState(1)

  const form = useForm({
    resolver: zodResolver(programmeSchema),
    defaultValues: {
      duration_type: 'moyen',
      pacing_type: 'libre',
      access_mode: 'acces_individuel',
      language: 'fr',
      modules: []
    }
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <WizardProgress currentStep={step} totalSteps={5} />

      {step === 1 && <Step1BaseInfo form={form} onNext={() => setStep(2)} />}
      {step === 2 && <Step2Configuration form={form} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <Step3Objectives form={form} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <Step4Structure form={form} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
      {step === 5 && <Step5Review form={form} onBack={() => setStep(4)} />}
    </div>
  )
}

// ============================================
// ÉTAPE 2: Configuration (La plus importante)
// ============================================

function Step2Configuration({ form, onNext, onBack }: StepProps) {
  const durationType = form.watch('duration_type')
  const pacingType = form.watch('pacing_type')
  const accessMode = form.watch('access_mode')

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configuration du programme</h2>
        <p className="text-muted-foreground">
          Ces paramètres définissent comment votre programme sera organisé et accessible.
        </p>
      </div>

      {/* A. Durée */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">⏱️ Durée du programme</Label>

        <RadioGroup
          value={durationType}
          onValueChange={(value) => form.setValue('duration_type', value as DurationType)}
        >
          <div className="grid grid-cols-3 gap-4">
            <RadioCard value="court">
              <Zap className="h-8 w-8 mb-2 text-yellow-500" />
              <h3 className="font-semibold">Court</h3>
              <p className="text-sm text-muted-foreground">1-2 semaines</p>
              <p className="text-xs mt-2">Idéal pour: Formations express, bootcamps</p>
            </RadioCard>

            <RadioCard value="moyen">
              <Calendar className="h-8 w-8 mb-2 text-blue-500" />
              <h3 className="font-semibold">Moyen</h3>
              <p className="text-sm text-muted-foreground">1-3 mois</p>
              <p className="text-xs mt-2">Idéal pour: Cours standards, certifications</p>
            </RadioCard>

            <RadioCard value="long">
              <Target className="h-8 w-8 mb-2 text-green-500" />
              <h3 className="font-semibold">Long</h3>
              <p className="text-sm text-muted-foreground">Trimestre/Année</p>
              <p className="text-xs mt-2">Idéal pour: Cursus complets, diplômes</p>
            </RadioCard>
          </div>
        </RadioGroup>

        {/* Durée précise */}
        <div className="flex items-center gap-4">
          <Input
            type="number"
            min={1}
            max={52}
            value={form.watch('duration_value')}
            onChange={(e) => form.setValue('duration_value', parseInt(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">
            {durationType === 'long' ? 'semaines' : 'semaines'}
          </span>
        </div>
      </div>

      {/* B. Rythme */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">🎯 Rythme d'apprentissage</Label>

        <RadioGroup
          value={pacingType}
          onValueChange={(value) => form.setValue('pacing_type', value as PacingType)}
        >
          <div className="grid grid-cols-3 gap-4">
            <RadioCard value="libre">
              <User className="h-8 w-8 mb-2 text-purple-500" />
              <h3 className="font-semibold">Libre</h3>
              <p className="text-sm text-muted-foreground">Autonomie complète</p>
              <Badge variant="outline" className="mt-2">Asynchrone</Badge>
            </RadioCard>

            <RadioCard value="guide">
              <Route className="h-8 w-8 mb-2 text-orange-500" />
              <h3 className="font-semibold">Guidé</h3>
              <p className="text-sm text-muted-foreground">Planning suggéré</p>
              <Badge variant="outline" className="mt-2">Semi-structuré</Badge>
            </RadioCard>

            <RadioCard value="live">
              <Video className="h-8 w-8 mb-2 text-red-500" />
              <h3 className="font-semibold">Live</h3>
              <p className="text-sm text-muted-foreground">Sessions synchrones</p>
              <Badge variant="outline" className="mt-2">Temps réel</Badge>
            </RadioCard>
          </div>
        </RadioGroup>

        {pacingType === 'guide' && (
          <div className="p-4 bg-muted rounded-lg">
            <Label>Charge de travail suggérée</Label>
            <div className="flex items-center gap-4 mt-2">
              <Input
                type="number"
                min={1}
                max={40}
                placeholder="5"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">heures / semaine</span>
            </div>
          </div>
        )}
      </div>

      {/* C. Usage */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">👥 Mode d'accès</Label>

        <RadioGroup
          value={accessMode}
          onValueChange={(value) => form.setValue('access_mode', value as AccessMode)}
        >
          <div className="grid grid-cols-3 gap-4">
            <RadioCard value="classe_privee">
              <Users className="h-8 w-8 mb-2 text-indigo-500" />
              <h3 className="font-semibold">Classe privée</h3>
              <p className="text-sm text-muted-foreground">Groupe fermé</p>
              <ul className="text-xs mt-2 space-y-1">
                <li>✓ Suivi personnalisé</li>
                <li>✓ Interactions groupe</li>
              </ul>
            </RadioCard>

            <RadioCard value="acces_individuel">
              <UserCheck className="h-8 w-8 mb-2 text-teal-500" />
              <h3 className="font-semibold">Accès individuel</h3>
              <p className="text-sm text-muted-foreground">Inscription libre</p>
              <ul className="text-xs mt-2 space-y-1">
                <li>✓ Ouvert à tous</li>
                <li>✓ Progression autonome</li>
              </ul>
            </RadioCard>

            <RadioCard value="mixte">
              <Layers className="h-8 w-8 mb-2 text-pink-500" />
              <h3 className="font-semibold">Mixte</h3>
              <p className="text-sm text-muted-foreground">Hybride</p>
              <ul className="text-xs mt-2 space-y-1">
                <li>✓ Classes + individuel</li>
                <li>✓ Flexibilité maximale</li>
              </ul>
            </RadioCard>
          </div>
        </RadioGroup>
      </div>

      {/* Aperçu du type déduit */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Votre programme sera classé comme:</AlertTitle>
        <AlertDescription className="font-semibold text-lg mt-2">
          {getProgrammeTypeLabel({ duration_type: durationType, pacing_type: pacingType, access_mode: accessMode })}
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={onNext}>
          Suivant
        </Button>
      </div>
    </div>
  )
}
```

---

## 📱 UX CÔTÉ ÉTUDIANT

### Vue Liste des Programmes

```typescript
// src/components/programme/ProgrammeCard.tsx

export function ProgrammeCard({ programme }: { programme: Programme }) {
  const { settings } = programme

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{programme.title}</CardTitle>
            <CardDescription>{programme.teacher.display_name}</CardDescription>
          </div>

          {/* Badge selon settings */}
          <Badge variant={
            settings.duration_type === 'court' ? 'destructive' :
            settings.pacing_type === 'live' ? 'default' :
            'secondary'
          }>
            {getProgrammeTypeLabel(settings)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {programme.description}
        </p>

        <div className="flex items-center gap-4 mt-4 text-sm">
          {/* Durée */}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{getDurationLabel(settings)}</span>
          </div>

          {/* Rythme */}
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span>{getPacingLabel(settings.pacing_type)}</span>
          </div>

          {/* Niveau */}
          <Badge variant="outline">{programme.level}</Badge>
        </div>

        {/* Progression si inscrit */}
        {programme.user_progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progression</span>
              <span className="font-semibold">{programme.user_progress}%</span>
            </div>
            <Progress value={programme.user_progress} />
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full">
          {programme.user_progress ? 'Continuer' : 'Commencer'}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### Page de Détails Programme

```typescript
// L'étudiant ne voit JAMAIS:
// ❌ "Type: Cursus long"
// ❌ "Catégorie: Intensif"
// ❌ Détails techniques

// Il voit SEULEMENT:
// ✅ Titre, description, objectifs
// ✅ Durée en semaines/mois
// ✅ Rythme (libre/guidé/live)
// ✅ Modules et leçons
// ✅ Sa progression
```

---

## 🔄 MIGRATION DES DONNÉES EXISTANTES

### Script de Migration

```sql
-- Backup
CREATE TABLE courses_backup AS SELECT * FROM courses;

-- Migrer vers programmes
UPDATE programmes p
SET settings = CASE
  -- Détecter type selon heuristiques
  WHEN EXISTS(
    SELECT 1 FROM classrooms c WHERE c.id = p.classroom_id
  ) THEN
    jsonb_build_object(
      'duration_type', 'moyen',
      'pacing_type', 'live',
      'access_mode', 'classe_privee'
    )

  WHEN p.duration_weeks > 16 THEN
    jsonb_build_object(
      'duration_type', 'long',
      'pacing_type', 'guide',
      'access_mode', 'acces_individuel',
      'duration_value', p.duration_weeks
    )

  WHEN p.duration_weeks <= 4 THEN
    jsonb_build_object(
      'duration_type', 'court',
      'pacing_type', 'guide',
      'access_mode', 'acces_individuel',
      'duration_value', p.duration_weeks
    )

  ELSE
    jsonb_build_object(
      'duration_type', 'moyen',
      'pacing_type', 'libre',
      'access_mode', 'acces_individuel',
      'duration_value', COALESCE(p.duration_weeks, 8)
    )
END
WHERE settings IS NULL OR settings = '{}'::jsonb;

-- Vérifier migration
SELECT
  settings->>'duration_type' as type,
  settings->>'pacing_type' as rythme,
  settings->>'access_mode' as acces,
  COUNT(*) as count
FROM programmes
GROUP BY 1, 2, 3
ORDER BY count DESC;
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Phase 1: Base de données
- [ ] Créer migration `003-unified-programme-model.sql`
- [ ] Tester migration sur copie locale
- [ ] Renommer `courses` → `programmes`
- [ ] Ajouter colonne `settings` JSONB
- [ ] Migrer données existantes
- [ ] Vérifier intégrité

### Phase 2: Types & API
- [ ] Créer `src/types/programme.ts`
- [ ] Mettre à jour toutes les routes API
- [ ] Remplacer `course` par `programme` partout
- [ ] Adapter validations Zod
- [ ] Tests API

### Phase 3: UI
- [ ] Créer `ProgrammeWizard` (remplace CourseWizard)
- [ ] Étape 2 Configuration (LA CLÉ)
- [ ] Composant `ProgrammeCard`
- [ ] Page détails programme
- [ ] Supprime anciens wizards

### Phase 4: Documentation
- [ ] Guide création programme
- [ ] Documentation technique
- [ ] Vidéo tutorielle

### Phase 5: Déploiement
- [ ] Tests E2E
- [ ] Migration staging
- [ ] Migration production
- [ ] Monitoring

---

## 🎯 RÉSULTAT FINAL

### Pour les Professeurs
- ✅ **1 seul bouton**: "Créer un programme"
- ✅ **Configuration simple**: 3 paramètres (durée, rythme, usage)
- ✅ **Flexibilité maximale**: Même objet, résultats différents
- ✅ **Pas de choix complexe**: Plus de "Quel type de cours?"

### Pour les Étudiants
- ✅ **Interface unifiée**: Tous les programmes se ressemblent
- ✅ **Clarté**: Durée, rythme, objectifs visibles
- ✅ **Pas de jargon**: Jamais de "cursus", "intensif" technique
- ✅ **Progression claire**: % d'avancement, leçons suivantes

### Pour les Développeurs
- ✅ **1 seul modèle**: Plus de duplication
- ✅ **Settings flexibles**: Paramètres en JSONB
- ✅ **Maintenabilité**: Code plus simple
- ✅ **Évolutivité**: Facile d'ajouter nouveaux paramètres

---

**Status:** 📋 Prêt pour implémentation
**Priorité:** 🔴 Critique - Simplifie toute l'architecture
