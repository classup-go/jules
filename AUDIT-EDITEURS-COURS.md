# 🔍 AUDIT - Éditeurs de Cours Jules Class Go

**Date**: 2026-01-20
**Objectif**: Identifier et comparer les deux systèmes d'édition de cours

---

## 📊 Résumé Exécutif

**Problème identifié**: Il existe **2 systèmes parallèles** pour créer/éditer des cours, ce qui crée de la confusion et de la duplication.

| Critère | Ancien Builder | Nouveau Wizard |
|---------|---------------|----------------|
| **Fichier** | `/courses/[id]/builder/page.tsx` | `/courses/new/page.tsx` |
| **Fonctionnalité** | Réorganisation Drag & Drop | Création guidée en 8 étapes |
| **Table DB** | `classrooms` + `chapters` + `lessons` | `courses` (nouvelle) + chapitres |
| **Pédagogie** | ❌ Aucune | ✅ Objectifs, prérequis, compétences |
| **UX** | Interface technique | Wizard progressif |
| **État** | ✅ Fonctionnel | ⚠️ Partiellement implémenté |

---

## 1️⃣ ANCIEN SYSTÈME - Course Builder

### 📁 Localisation
```
src/app/(dashboard)/teacher/courses/[id]/builder/page.tsx
src/components/course-builder/ChapterItem.tsx
src/components/course-builder/LessonItem.tsx
```

### 🎯 Fonctionnalités

#### ✅ Ce qu'il fait bien
1. **Drag & Drop avancé** avec `@dnd-kit`
   - Réorganiser les chapitres
   - Réorganiser les leçons
   - Déplacer des leçons entre chapitres
   - Preview en temps réel

2. **Gestion de l'état**
   - Détection des changements non sauvegardés
   - Bouton "Sauvegarder" désactivé si aucun changement
   - Indicateur visuel "Non sauvegardé"

3. **Interface intuitive**
   - Visual feedback pendant le drag
   - Boutons d'action clairs (Éditer, Supprimer)
   - État vide bien géré

#### ❌ Limitations

1. **Pas de création guidée**
   - Utilisateur doit connaître la structure
   - Pas de validation des données
   - Pas d'aide contextuelle

2. **Aucune dimension pédagogique**
   - Pas d'objectifs d'apprentissage
   - Pas de prérequis
   - Pas de compétences acquises
   - Pas de durée estimée

3. **Architecture technique**
   ```typescript
   // Utilise directement classrooms (confusion)
   .from('classrooms')
   .eq('id', id)

   // Chapters liés à classroom_id (devrait être course_id)
   .from('chapters')
   .eq('classroom_id', id)
   ```

4. **Pas de workflow**
   - Aucun ordre logique de création
   - Tout est accessible en même temps
   - Pas de progression étape par étape

### 📸 Interface

```
┌─────────────────────────────────────────────┐
│ ← Retour    [Non sauvegardé] [💾 Sauvegarder] │
├─────────────────────────────────────────────┤
│ Organiser le cours: Bac S 2024              │
│ Glissez-déposez pour réorganiser            │
├─────────────────────────────────────────────┤
│                                             │
│ [➕ Ajouter un chapitre]                    │
│                                             │
│ ┌─ Chapitre 1: Introduction                │
│ │  ├─ Leçon 1: Présentation                │
│ │  ├─ Leçon 2: Historique                  │
│ │  └─ [➕ Ajouter une leçon]               │
│ │                                           │
│ └─ Chapitre 2: Fondamentaux                │
│    ├─ Leçon 1: Concepts de base            │
│    └─ [➕ Ajouter une leçon]               │
│                                             │
└─────────────────────────────────────────────┘
```

### 🔗 Routes utilisées
```
/teacher/courses/[id]/builder          → Interface drag & drop
/teacher/classrooms/[id]?action=...    → Ajouter/Éditer chapitre
/teacher/lessons/new?chapter=...       → Ajouter leçon
/teacher/lessons/[id]                  → Éditer leçon
```

---

## 2️⃣ NOUVEAU SYSTÈME - Course Wizard

### 📁 Localisation
```
src/app/(dashboard)/teacher/courses/new/page.tsx
src/components/course-wizard/CourseWizard.tsx
src/components/course-wizard/steps/
  ├─ Step1GeneralInfo.tsx          ✅ Modifié (sélection classe)
  ├─ Step2Objectives.tsx           ⭐ Objectifs pédagogiques
  ├─ Step3LessonBuilder.tsx        📚 Structure
  ├─ Step4ContentEditor.tsx        ✍️ Contenu
  ├─ Step5Evaluation.tsx           📝 Évaluation
  ├─ Step6AccessMonetization.tsx   💰 Prix
  ├─ Step7StudentPreview.tsx       👁️ Aperçu
  └─ Step8Publication.tsx          🚀 Publication
```

### 🎯 Fonctionnalités

#### ✅ Ce qu'il fait bien

1. **Wizard en 8 étapes**
   ```
   Étape 1: Sélection classe + Infos générales
   Étape 2: Objectifs d'apprentissage + Prérequis ⭐
   Étape 3: Structure (chapitres)
   Étape 4: Contenu des leçons
   Étape 5: Évaluation (quiz, devoirs)
   Étape 6: Accès et tarification
   Étape 7: Aperçu côté étudiant
   Étape 8: Publication
   ```

2. **Approche pédagogique moderne**
   ```typescript
   learning_objectives: string[]   // "Maîtriser...", "Comprendre..."
   prerequisites: string[]         // "Avoir étudié..."
   competences: string[]          // "Être capable de..."
   duration_weeks: number         // Durée estimée
   duration_hours: number         // Temps total
   ```

3. **Validation avec Zod**
   - Schéma strict avec messages d'erreur
   - Validation par étape
   - Impossible de passer à l'étape suivante sans valider

4. **Autosave**
   ```typescript
   useAutosave(form.watch, onSave, { delay: 2000 })
   ```
   - Sauvegarde automatique toutes les 2 secondes
   - Indicateur visuel du statut

5. **Sélection de classe** (✅ Ajouté aujourd'hui)
   - Liste déroulante des classes existantes
   - Option "Créer nouvelle classe" inline
   - Validation du classroom_id

#### ❌ Limitations actuelles

1. **Pas encore complètement intégré**
   - L'API `/api/courses` a été modifiée pour utiliser la table `courses`
   - Mais les étapes 3-8 utilisent peut-être encore l'ancien système

2. **Architecture mixte**
   ```typescript
   // La page crée dans courses ✅
   POST /api/courses → table courses

   // Mais les composants Step3-8 référencent peut-être encore:
   // - chapters.classroom_id au lieu de chapters.course_id
   // - lessons liées à classroom_id
   ```

3. **Pas de drag & drop**
   - Contrairement au builder, pas de réorganisation visuelle
   - Structure plus rigide

### 📸 Interface

```
┌─────────────────────────────────────────────────────────┐
│        [1]───[2]───[3]───[4]───[5]───[6]───[7]───[8]   │
│        Info  Obj  Struct Cont  Eval  Accès Aper  Pub   │
│                     ✓                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Étape 3: Structure du cours                           │
│  ─────────────────────────────                         │
│                                                         │
│  Combien de chapitres ?  [5]                           │
│                                                         │
│  Chapitre 1                                            │
│  ├─ Titre: [_____________________]                     │
│  ├─ Leçons:                                            │
│  │  └─ [+ Ajouter une leçon]                          │
│  │                                                     │
│  Chapitre 2                                            │
│  ├─ Titre: [_____________________]                     │
│  ...                                                   │
│                                                         │
│         [← Retour]              [Continuer →]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 🔗 Routes utilisées
```
/teacher/courses/new                → Wizard complet
/api/courses                        → POST: Créer cours
/api/courses/[id]                   → PATCH: Mettre à jour
/api/courses/[id]/publish           → POST: Publier
```

---

## 📊 Comparaison Détaillée

### Architecture de données

| Aspect | Ancien Builder | Nouveau Wizard |
|--------|---------------|----------------|
| **Table principale** | `classrooms` | `courses` |
| **Relation** | chapters → `classroom_id` | chapters → `course_id` |
| **Séparation classe/cours** | ❌ Mélangé | ✅ Séparé |
| **Champs pédagogiques** | ❌ Aucun | ✅ Objectifs, prérequis, compétences |

### Expérience utilisateur

| Critère | Ancien Builder | Nouveau Wizard |
|---------|---------------|----------------|
| **Courbe d'apprentissage** | Moyenne | Faible (guidé) |
| **Création initiale** | ❌ Pas guidée | ✅ Wizard 8 étapes |
| **Réorganisation** | ✅ Drag & drop fluide | ❌ Pas de drag & drop |
| **Validation** | ❌ Aucune | ✅ Zod + validation par étape |
| **Feedback** | ✅ "Non sauvegardé" | ✅ Autosave + indicateur |
| **Mobile** | ⚠️ Difficile (drag & drop) | ✅ Adaptatif |

### Fonctionnalités

| Fonctionnalité | Ancien Builder | Nouveau Wizard |
|----------------|---------------|----------------|
| Drag & Drop | ✅ | ❌ |
| Objectifs d'apprentissage | ❌ | ✅ |
| Prérequis | ❌ | ✅ |
| Compétences | ❌ | ✅ |
| Durée estimée | ❌ | ✅ |
| Sélection de classe | ❌ | ✅ (ajouté) |
| Quiz intégrés | ⚠️ | ✅ |
| Aperçu étudiant | ❌ | ✅ |
| Publication guidée | ❌ | ✅ |

### Performance

| Critère | Ancien Builder | Nouveau Wizard |
|---------|---------------|----------------|
| **Librairies** | `@dnd-kit` (lourde) | `react-hook-form` + `zod` |
| **Requêtes DB** | 3 (classroom, chapters, lessons) | 1 puis autosave |
| **Rechargement** | À chaque drag | Optimiste (local first) |
| **Complexité** | ~545 lignes | ~8 composants modulaires |

---

## 🎯 RECOMMANDATION FINALE

### ⭐ Solution Hybride Recommandée

**Garder les DEUX systèmes mais les spécialiser:**

#### 1. **Nouveau Wizard** = Création de cours
```
Route: /teacher/courses/new
Rôle: Créer un nouveau cours de A à Z
- Sélection de classe
- Informations pédagogiques (objectifs, prérequis)
- Structure initiale
- Configuration complète
- Publication
```

#### 2. **Ancien Builder** = Réorganisation
```
Route: /teacher/courses/[id]/builder
Rôle: Réorganiser un cours existant
- Drag & drop chapitres/leçons
- Modification de l'ordre
- Ajout/suppression rapide
```

### 🔧 Modifications nécessaires

#### A. Mettre à jour le Builder pour utiliser `courses`

```typescript
// ❌ AVANT
.from('classrooms')
.eq('id', id)

// ✅ APRÈS
.from('courses')
.eq('id', id)
.select('*, classroom:classrooms(*)')
```

```typescript
// ❌ AVANT
.from('chapters')
.eq('classroom_id', id)

// ✅ APRÈS
.from('chapters')
.eq('course_id', id)
```

#### B. Ajouter un lien vers le Builder depuis le Wizard

```typescript
// Dans Step8Publication.tsx
<button onClick={() => router.push(`/teacher/courses/${courseId}/builder`)}>
  🎨 Organiser visuellement
</button>
```

#### C. Migration des données

```sql
-- Créer des cours à partir des classrooms existantes
INSERT INTO courses (classroom_id, title, description)
SELECT id, title, description FROM classrooms;

-- Mettre à jour les chapters pour pointer vers courses
UPDATE chapters
SET course_id = classroom_id
WHERE course_id IS NULL;
```

---

## 🚀 Plan d'implémentation

### Phase 1: Priorisation immédiate (1-2h)
1. ✅ **Exécuter la migration SQL** (`supabase-courses-system-setup-fixed.sql`)
2. ✅ **Modifier l'API `/api/courses`** pour utiliser la table `courses` (déjà fait)
3. ✅ **Ajouter sélection de classe dans Step1** (déjà fait)
4. ⏳ **Mettre à jour le Builder** pour utiliser `courses` au lieu de `classrooms`

### Phase 2: Consolidation (2-3h)
5. ⏳ Vérifier que les étapes 3-8 du Wizard utilisent `course_id`
6. ⏳ Ajouter un lien "Réorganiser" dans le Wizard vers le Builder
7. ⏳ Migrer les données existantes (script SQL)
8. ⏳ Tester le flow complet: Wizard → Builder → Aperçu

### Phase 3: Amélioration (optionnel)
9. ⏳ Ajouter drag & drop dans le Wizard Step3
10. ⏳ Permettre édition des objectifs/prérequis depuis le Builder
11. ⏳ Unifier les boutons d'action (même style partout)

---

## 🎓 Cas d'usage

### Scénario 1: Nouveau cours
```
Professeur → /teacher/courses/new
├─ Wizard: Création guidée complète
├─ Définit objectifs, prérequis, structure
├─ Publie le cours
└─ Optionnel: Va dans Builder pour réorganiser visuellement
```

### Scénario 2: Réorganiser cours existant
```
Professeur → /teacher/courses → Cours XYZ → "Réorganiser"
├─ Builder: Drag & drop chapitres/leçons
├─ Ajuste l'ordre
└─ Sauvegarde
```

### Scénario 3: Modifier objectifs pédagogiques
```
Professeur → /teacher/courses → Cours XYZ → "Éditer"
├─ Wizard: Reprend là où il était
├─ Modifie Step2 (objectifs)
└─ Sauvegarde
```

---

## ✅ Checklist Migration

- [x] Créer table `courses`
- [x] Modifier API `/api/courses`
- [x] Ajouter sélection classe dans Step1
- [ ] Modifier Builder pour utiliser `courses`
- [ ] Vérifier Steps 3-8 du Wizard
- [ ] Migrer données existantes
- [ ] Tester flow complet
- [ ] Mettre à jour documentation utilisateur
- [ ] Former les enseignants

---

## 📝 Notes

### Points d'attention

1. **Ne pas supprimer l'ancien Builder**
   - Il a une valeur unique (drag & drop)
   - Les enseignants y sont habitués
   - Complément parfait au Wizard

2. **Garder la séparation classe/cours**
   - Nouveau système: 1 classe = N cours ✅
   - Ancien système: 1 classroom = 1 cours ❌

3. **Migration progressive**
   - Pas de "big bang"
   - Les deux systèmes coexistent
   - Migration des données à la demande

---

**Conclusion**: Les deux systèmes sont complémentaires. Le Wizard guide la création pédagogique, le Builder optimise l'organisation visuelle. L'essentiel est de les faire fonctionner avec la nouvelle architecture `courses`.
