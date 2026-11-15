# NETTOYAGE DOUBLONS - 22 JANVIER 2026

Suite à l'audit complet du système de cours et l'implémentation du modèle Programme unifié.

---

## 🎯 OBJECTIF

Supprimer les 3 systèmes parallèles et les remplacer par le modèle Programme unifié:
- ❌ Ancien Course Builder (src/app/.../builder/)
- ❌ Course Templates (src/app/.../course-templates/)
- ❌ Nouveau Course Wizard (partiellement - garder certains composants réutilisables)
- ✅ Nouveau: Programme Editor unifié avec système slides intégré

---

## 📋 FICHIERS À SUPPRIMER

### 1. Course Templates System (COMPLET)

**Pages:**
- `src/app/(dashboard)/teacher/course-templates/page.tsx` - Liste templates
- `src/app/(dashboard)/teacher/course-templates/[id]/edit/page.tsx` - Édition template
- `src/app/(dashboard)/teacher/course-templates/new/page.tsx` - Nouveau template

**Types:**
- `src/types/course-template.ts` - Types CourseTemplate

**Raison:** Système incompatible avec nouvelle architecture Programme. Les "templates" seront remplacés par des presets de settings.

---

### 2. Ancien Course Builder (PARTIEL)

**Pages à supprimer:**
- `src/app/(dashboard)/teacher/courses/[id]/builder/page.tsx` - Ancien builder

**Pages à garder (pour migration):**
- `src/app/(dashboard)/teacher/courses/[id]/chapters/[chapterId]/edit/page.tsx` - Édition chapitre
- `src/app/(dashboard)/teacher/courses/[id]/chapters/new/page.tsx` - Nouveau chapitre

**Raison:** L'ancien builder sera remplacé par ProgrammeEditor, mais les pages d'édition de chapitres restent utiles.

---

### 3. Course Wizard (COMPOSANTS RÉUTILISABLES)

**À évaluer et potentiellement réutiliser:**
- `src/components/course-wizard/steps/Step3LessonBuilder.tsx` - Builder de leçon
- `src/components/course-wizard/steps/Step8Publication.tsx` - Publication
- `src/lib/validations/course-wizard.ts` - Validations

**Raison:** Ces composants peuvent être réutilisés dans le nouveau ProgrammeWizard.

---

## 🗑️ ÉTAPE 1: SUPPRESSION COURSE TEMPLATES

Fichiers à supprimer:
```
src/app/(dashboard)/teacher/course-templates/
  ├── page.tsx
  ├── [id]/edit/page.tsx
  └── new/page.tsx

src/types/course-template.ts
```

### Migration des données (si nécessaire)

Si la table `course_templates` existe en BDD:
```sql
-- Backup
CREATE TABLE course_templates_backup AS SELECT * FROM course_templates;

-- La table sera supprimée car remplacée par presets de settings
DROP TABLE IF EXISTS course_templates CASCADE;
```

---

## 🗑️ ÉTAPE 2: SUPPRESSION ANCIEN BUILDER

Fichiers à supprimer:
```
src/app/(dashboard)/teacher/courses/[id]/builder/page.tsx
```

Fichiers à garder pour migration:
```
src/app/(dashboard)/teacher/courses/[id]/chapters/
  ├── [chapterId]/edit/page.tsx  (à adapter pour Programme)
  └── new/page.tsx               (à adapter pour Programme)
```

---

## 🔄 ÉTAPE 3: RÉORGANISATION COURSE WIZARD

### Composants à réutiliser:

**Step3LessonBuilder.tsx**
- Renommer en: `src/components/programme-wizard/steps/Step3ContentBuilder.tsx`
- Adapter pour supporter slides en plus de lessons

**Step8Publication.tsx**
- Renommer en: `src/components/programme-wizard/steps/Step5Publication.tsx`
- Adapter pour nouveaux champs Programme

**course-wizard.ts (validations)**
- Renommer en: `src/lib/validations/programme-wizard.ts`
- Adapter pour ProgrammeSettings

---

## ✅ ÉTAPE 4: CRÉATION NOUVEAUX COMPOSANTS

### 4.1 ProgrammeWizard (Remplace 3 wizards)

**Structure:**
```
src/components/programme-wizard/
  ├── ProgrammeWizard.tsx          (Container principal)
  ├── steps/
  │   ├── Step1Info.tsx            (Titre, description, audience)
  │   ├── Step2Configuration.tsx   (⭐ CRITIQUE - Settings JSONB)
  │   ├── Step3ContentBuilder.tsx  (Chapitres, leçons, slides)
  │   ├── Step4Pricing.tsx         (Prix, devise)
  │   └── Step5Publication.tsx     (Review + publish)
  └── components/
      ├── ConfigurationPresets.tsx (Presets rapides)
      ├── SettingsCustomizer.tsx   (Customisation features)
      └── ContentEditor.tsx        (Éditeur unifié)
```

### 4.2 ProgrammeEditor (Page d'édition unifiée)

```
src/app/(dashboard)/teacher/programmes/
  ├── page.tsx                     (Liste programmes)
  ├── new/page.tsx                 (Nouveau - lance wizard)
  └── [id]/
      ├── page.tsx                 (Dashboard programme)
      ├── edit/page.tsx            (Édition info/settings)
      ├── content/page.tsx         (Éditeur contenu)
      └── chapters/
          ├── [chapterId]/
          │   ├── edit/page.tsx    (Édition chapitre)
          │   └── lessons/
          │       └── [lessonId]/
          │           └── edit/page.tsx  (Éditeur leçon + slides)
          └── new/page.tsx
```

---

## 🔗 ÉTAPE 5: INTÉGRATION SYSTÈME SLIDES

### 5.1 Migration BDD: Lier lessons et presentations

```sql
-- Ajouter colonne presentation_id aux lessons
ALTER TABLE lessons
ADD COLUMN presentation_id UUID REFERENCES presentations(id) ON DELETE SET NULL;

-- Index
CREATE INDEX idx_lessons_presentation_id ON lessons(presentation_id);

-- Vue pour lessons avec slides
CREATE OR REPLACE VIEW lessons_with_content AS
SELECT
  l.id,
  l.chapter_id,
  l.title,
  l.content,
  l.video_url,
  l.duration_minutes,
  l.presentation_id,
  CASE
    WHEN l.presentation_id IS NOT NULL THEN 'slides'
    WHEN l.video_url IS NOT NULL THEN 'video'
    WHEN l.content IS NOT NULL THEN 'text'
    ELSE 'empty'
  END as content_type,
  p.total_slides,
  p.title as presentation_title
FROM lessons l
LEFT JOIN presentations p ON l.presentation_id = p.id;
```

### 5.2 Composant LessonEditor unifié

Le composant doit permettre:
- ✅ Texte markdown (existant)
- ✅ Vidéo (existant)
- ✅ **Slides (nouveau)** - Choix entre:
  - Créer nouvelle présentation
  - Lier présentation existante
  - Éditer présentation liée

**Composant:**
```tsx
// src/components/programme-wizard/LessonEditor.tsx
interface LessonEditorProps {
  lesson: Lesson
  onChange: (lesson: Lesson) => void
}

// Onglets: Texte | Vidéo | Slides | Blocs
```

---

## 📊 ÉTAPE 6: MIGRATION ROUTES API

### Renommer routes (garder compatibilité)

**Anciennes routes (à déprécier):**
```
/api/courses/*              → Garder pour rétrocompatibilité
/api/course-templates/*     → Supprimer
```

**Nouvelles routes:**
```
/api/programmes/*           → Nouvelle API principale
/api/programmes/[id]/chapters/*
/api/programmes/[id]/chapters/[chapterId]/lessons/*
/api/programmes/[id]/chapters/[chapterId]/lessons/[lessonId]/presentation
```

### Alias pour compatibilité

```typescript
// src/app/api/courses/[id]/route.ts
// Rediriger vers /api/programmes/[id]
export { GET, PUT, DELETE } from '@/app/api/programmes/[id]/route'
```

---

## 🎨 ÉTAPE 7: MISE À JOUR UI/UX

### Labels utilisateur (sans jargon technique)

**Terminologie:**
- ❌ "course" → ✅ "programme" ou "formation"
- ❌ "classroom" → ✅ "programme" (unifié)
- ❌ "cours structuré" → ✅ "Formation complète"
- ❌ "cursus long" → ✅ "Parcours de formation"
- ❌ "intensif" → ✅ "Bootcamp" ou "Formation en direct"

**Menus:**
```
Mes Programmes
  ├── Tous mes programmes
  ├── Créer un programme    (Lance ProgrammeWizard)
  ├── Brouillons
  └── Archives
```

---

## 🧪 ÉTAPE 8: TESTS DE MIGRATION

### Checklist de test:

**Créer un programme:**
- [ ] Wizard Step 1: Info de base
- [ ] Wizard Step 2: Configuration (presets + custom)
- [ ] Wizard Step 3: Ajouter chapitres/leçons
- [ ] Wizard Step 3: Ajouter slides à une leçon
- [ ] Wizard Step 4: Prix
- [ ] Wizard Step 5: Publication

**Éditer un programme existant:**
- [ ] Modifier settings (duration_type, pacing_type, etc.)
- [ ] Ajouter/modifier chapitres
- [ ] Ajouter/modifier leçons
- [ ] Lier une présentation à une leçon
- [ ] Éditer slides directement depuis leçon

**Étudiant:**
- [ ] Voir programme avec tous types de contenu
- [ ] Progresser dans leçons avec slides
- [ ] Compléter présentation interactive

---

## 📂 STRUCTURE FINALE

```
src/
  ├── app/
  │   ├── (dashboard)/
  │   │   ├── teacher/
  │   │   │   └── programmes/              ✅ NOUVEAU (remplace 3 dossiers)
  │   │   │       ├── page.tsx
  │   │   │       ├── new/page.tsx
  │   │   │       └── [id]/...
  │   │   └── student/
  │   │       └── programmes/              ✅ NOUVEAU
  │   │           └── [id]/view/page.tsx
  │   └── api/
  │       ├── programmes/                  ✅ NOUVEAU (API principale)
  │       └── courses/                     ⚠️ DÉPRÉCIÉ (redirection)
  │
  ├── components/
  │   ├── programme-wizard/                ✅ NOUVEAU
  │   │   ├── ProgrammeWizard.tsx
  │   │   └── steps/...
  │   ├── programme-editor/                ✅ NOUVEAU
  │   │   ├── ContentEditor.tsx
  │   │   ├── ChapterEditor.tsx
  │   │   └── LessonEditor.tsx            (Unifié: text/video/slides)
  │   └── slides/                          ✅ EXISTANT (garder)
  │       ├── PresentationEditor.tsx
  │       ├── SlideEditor.tsx
  │       └── PresentationViewer.tsx
  │
  ├── types/
  │   ├── programme.ts                     ✅ CRÉÉ
  │   └── course-template.ts               ❌ SUPPRIMER
  │
  └── lib/
      └── validations/
          ├── programme-wizard.ts          ✅ NOUVEAU
          └── course-wizard.ts             ❌ SUPPRIMER
```

---

## 🚀 ORDRE D'EXÉCUTION

### Phase 1: Préparation (FAIT ✅)
1. ✅ Créer migration 003-unified-programme-model.sql
2. ✅ Créer types/programme.ts

### Phase 2: Nettoyage (EN COURS)
3. ⏳ Supprimer course-templates system
4. ⏳ Supprimer ancien builder
5. ⏳ Archiver/adapter course-wizard

### Phase 3: Migration BDD (PROCHAIN)
6. ⏳ Exécuter migration 003
7. ⏳ Créer migration slides integration (presentation_id dans lessons)
8. ⏳ Migrer données existantes

### Phase 4: Nouveaux composants (APRÈS)
9. ⏳ Créer ProgrammeWizard avec Step2Configuration
10. ⏳ Créer LessonEditor unifié (text/video/slides)
11. ⏳ Créer ProgrammeEditor

### Phase 5: API (APRÈS)
12. ⏳ Créer routes /api/programmes/*
13. ⏳ Créer alias /api/courses/* → /api/programmes/*

### Phase 6: Tests (FINAL)
14. ⏳ Tests end-to-end
15. ⏳ Migration données production

---

## 📝 NOTES IMPORTANTES

### Rétrocompatibilité

**URLs étudiants:**
- Garder `/student/classrooms/[id]` actif
- Rediriger vers `/student/programmes/[id]`
- Pas de breaking changes

**Base de données:**
- Table `courses` garde son nom (alias `programmes`)
- Toutes les FKs restent valides
- Colonne `settings` JSONB = clé de la migration

### Données existantes

Les cours existants seront migrés automatiquement:
- `settings` rempli avec valeurs par défaut intelligentes
- Basé sur heuristiques (duration, nombre de leçons, etc.)
- Professeurs pourront ajuster après migration

---

## ✅ VALIDATION

Après nettoyage, vérifier:
- [ ] Pas de références à `course-templates`
- [ ] Pas de références à ancien `CourseBuilder`
- [ ] Pas d'imports cassés
- [ ] Tous les types utilisent `Programme`
- [ ] API unifiée sous `/api/programmes`
- [ ] UI utilise vocabulaire unifié

---

**Document créé le:** 22 janvier 2026
**Status:** 📋 Plan de nettoyage prêt
**Prochaine étape:** Exécuter Phase 2 - Suppression fichiers obsolètes
