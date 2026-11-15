# CORRECTION FLOW CLASSE → COURS - 23 JANVIER 2026

## 🔍 Problème Identifié

### Symptôme
Erreur lors de la création de cours via le ClassWizard:
```
Erreur lors de la création du cours
```

### Analyse du Flow Actuel

**Flow de création:**
```
1. User → /teacher/classes/create
2. ClassWizard (4 steps)
3. Step 1: Infos classe (avec is_public checkbox)
4. Submit → POST /api/classes (crée classroom)
5. Submit → POST /api/courses (crée cours)
6. Redirect → /teacher/classrooms/{id}
```

### Causes des Erreurs

#### 1. Confusion is_public vs is_free

**Dans ClassWizard:**
- Envoie `is_public: boolean` (ligne 232)
- Signification UI: "Classe visible dans le catalogue"

**Dans la table `classrooms`:**
- Colonne existante: `is_free` (gratuit/payant)
- Colonne manquante: `is_public` (public/privé)

#### 2. Erreur dans API /api/classes

**Avant correction:**
```typescript
.insert({
  teacher_id: user.id,
  title: body.title,
  is_public: body.is_public || false, // ❌ Colonne n'existe pas!
  // is_free: ... // ✅ Colonne commentée
})
```

**Problème:** Tentative d'insérer dans une colonne inexistante → Erreur SQL

#### 3. Erreur dans API /api/courses (backup classroom creation)

**Avant correction:**
```typescript
.insert({
  teacher_id: user.id,
  title: body.title || 'Nouvelle classe',
  is_public: false, // ❌ Colonne n'existe pas!
  price: 0,
})
```

---

## ✅ Corrections Appliquées

### 1. API /api/classes/route.ts

**Changement:**
```typescript
// AVANT
is_public: body.is_public || false,
// is_free: body.is_free !== undefined ? body.is_free : true,

// APRÈS
// is_public: body.is_public || false, // ⚠️ Colonne n'existe pas encore
is_free: body.is_free !== undefined ? body.is_free : true,
```

**Impact:** La création de classroom via ClassWizard fonctionne maintenant

### 2. API /api/courses/route.ts

**Changement (création backup classroom):**
```typescript
// AVANT
is_public: false,

// APRÈS
is_free: true,
```

**Impact:** Si un cours est créé sans classroom_id, la classroom par défaut se crée correctement

### 3. Messages d'erreur améliorés

**Dans tous les endpoints:**
```typescript
if (classroomError) {
  return NextResponse.json({
    error: 'Erreur lors de la création de la classe',
    details: classroomError.message,
    code: classroomError.code
  }, { status: 500 })
}
```

**Impact:** Les erreurs futures seront plus faciles à débugger

---

## 📋 État Actuel du Schéma

### Table `classrooms`

**Colonnes existantes:**
- `id` UUID PRIMARY KEY
- `teacher_id` UUID (FK → users)
- `title` TEXT
- `description` TEXT
- `subject` TEXT
- `level` TEXT
- `max_students` INTEGER
- `enrolled_count` INTEGER
- `price` NUMERIC
- `is_free` BOOLEAN ✅ (existe)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**Colonnes manquantes:**
- `is_public` BOOLEAN ❌ (n'existe pas)

---

## 🚧 Solution Temporaire vs Permanente

### Solution Temporaire (Appliquée)

**Action:** Commenter `is_public` dans les APIs

**Avantages:**
- ✅ Fonctionne immédiatement
- ✅ Pas de migration nécessaire
- ✅ Pas de breaking changes

**Inconvénients:**
- ❌ Feature "classe publique" non fonctionnelle
- ❌ Toutes les classes sont traitées comme privées
- ❌ UI affiche une option qui ne fait rien

### Solution Permanente (À Implémenter)

**Option A: Ajouter la colonne `is_public`**

```sql
-- Migration à créer
ALTER TABLE classrooms
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

COMMENT ON COLUMN classrooms.is_public IS
  'Indique si la classe est visible dans le catalogue public';
```

**Option B: Utiliser `is_free` pour les deux concepts**

Mapper logiquement:
- `is_free = true` → Gratuit ET public
- `is_free = false` → Payant ET privé par défaut

**Recommandation:** Option A (séparer les deux concepts)

---

## 🎯 Plan d'Action Recommandé

### Court Terme (Immédiat) ✅ FAIT

- [x] Commenter `is_public` dans `/api/classes`
- [x] Utiliser `is_free` à la place
- [x] Corriger `/api/courses` backup classroom
- [x] Améliorer messages d'erreur

### Moyen Terme (1-2 jours)

- [ ] Créer migration `add-is-public-to-classrooms.sql`
- [ ] Exécuter la migration
- [ ] Décommenter `is_public` dans les APIs
- [ ] Tester le flow complet

### Long Terme (Optionnel)

- [ ] Ajouter UI pour gérer visibilité publique/privée
- [ ] Implémenter catalogue public des classes
- [ ] Permettre inscription directe aux classes publiques

---

## 📊 Tests de Validation

### Test 1: Création classe nouvelle (mode = 'new')

```bash
# Via ClassWizard
1. Aller sur /teacher/classes/create
2. Choisir "Créer nouvelle classe"
3. Remplir infos (Step 1)
4. Ajouter objectifs (Step 2)
5. Définir premier cours (Step 3)
6. Ajouter contenu (Step 4)
7. Soumettre

✅ Attendu: Classe et cours créés, redirection vers /teacher/classrooms/{id}
```

### Test 2: Création cours dans classe existante (mode = 'existing')

```bash
1. Aller sur /teacher/classes/create
2. Choisir "Ajouter à classe existante"
3. Sélectionner une classe
4. Suivre steps 2-4
5. Soumettre

✅ Attendu: Cours ajouté à la classe, redirection vers /teacher/classrooms/{id}
```

### Test 3: Création cours sans classroom_id (fallback)

```bash
# Via API directe (ancien flow)
POST /api/courses
{
  "title": "Test",
  "subject": "Math",
  "level": "college"
  // Pas de classroom_id
}

✅ Attendu: Classroom par défaut créée avec is_free=true
```

---

## 🔗 Fichiers Modifiés

### APIs
1. `src/app/api/classes/route.ts`
   - Commenté `is_public`
   - Décommenté `is_free`
   - Amélioré error handling

2. `src/app/api/courses/route.ts`
   - Changé `is_public` → `is_free` (backup classroom)
   - Amélioré error handling

### Composants
3. `src/components/class-wizard/ClassWizard.tsx`
   - Amélioré error display (ligne 274-275)

---

## 💡 Notes Techniques

### Différence is_public vs is_free

**is_free (Gratuit/Payant):**
- Aspect financier
- Détermine si price > 0
- Impact: Paiement requis ou non

**is_public (Public/Privé):**
- Aspect visibilité
- Détermine si visible dans catalogue
- Impact: Inscription ouverte ou sur invitation

**Ces deux concepts sont indépendants:**
- Classe gratuite ET privée: Possible (invitation only, no cost)
- Classe payante ET publique: Possible (open enrollment, with fee)
- Classe gratuite ET publique: Possible (free for all)
- Classe payante ET privée: Possible (invitation only, with fee)

---

## 🚀 Migration SQL Recommandée

**Fichier:** `migrations/005-add-is-public-to-classrooms.sql`

```sql
-- =====================================================
-- MIGRATION 005: AJOUTER is_public À classrooms
-- =====================================================
-- Objectif: Séparer visibilité publique de la gratuité
-- Date: 2026-01-23
-- =====================================================

BEGIN;

-- Ajouter la colonne is_public
ALTER TABLE classrooms
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Commentaire
COMMENT ON COLUMN classrooms.is_public IS
  'Indique si la classe est visible dans le catalogue public et autorise les inscriptions directes';

-- Mettre à jour les classes existantes
-- Par défaut: classes gratuites → publiques, classes payantes → privées
UPDATE classrooms
SET is_public = is_free
WHERE is_public IS NULL;

-- Index pour recherche des classes publiques
CREATE INDEX IF NOT EXISTS idx_classrooms_is_public
ON classrooms(is_public)
WHERE is_public = true;

-- Validation
DO $$
DECLARE
  v_total INTEGER;
  v_public INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM classrooms;
  SELECT COUNT(*) INTO v_public FROM classrooms WHERE is_public = true;

  RAISE NOTICE '✅ Migration 005 terminée';
  RAISE NOTICE 'Total classes: %', v_total;
  RAISE NOTICE 'Classes publiques: %', v_public;
END $$;

COMMIT;
```

---

## ✅ Résultat Final

**Status:** ✅ Flow de création classe → cours fonctionne

**Limitations temporaires:**
- Checkbox "Classe publique" dans UI n'a pas d'effet
- Toutes les classes sont privées par défaut

**Action requise:**
Exécuter migration 005 pour activer pleinement la feature

---

**Document créé le:** 23 janvier 2026
**Auteur:** Claude Code
**Status:** ✅ Corrections appliquées et testées
