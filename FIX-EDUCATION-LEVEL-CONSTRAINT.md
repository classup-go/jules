# 🔧 FIX: Contrainte education_level

**Date**: 28 janvier 2026
**Erreur**: `new row for relation "users" violates check constraint "check_education_level_valid"`
**Priorité**: HAUTE - Bloque la complétion de profil

---

## 🔍 PROBLÈME

### Erreur rencontrée:
```
code: "23514"
message: "new row for relation \"users\" violates check constraint \"check_education_level_valid\""
```

### Cause:

**Base de données** accepte seulement:
```sql
CHECK (education_level IN ('college', 'lycee', 'terminal', 'bac', 'university', 'other'))
```

**Code** envoie des valeurs détaillées:
```
'sixieme', 'cinquieme', 'quatrieme', 'troisieme',
'seconde', 'premiere', 'terminale',
'bac_obtenu', 'bac_plus_1', 'bac_plus_2', 'bac_plus_3', etc.
```

**Décalage**: Migration 007 définit des catégories générales, mais le code utilise des niveaux détaillés.

---

## ✅ SOLUTION RAPIDE (5 minutes)

### Étape 1: Ouvrir Supabase SQL Editor

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Aller dans **SQL Editor** (menu gauche)
4. Cliquer **"+ New query"**

### Étape 2: Exécuter la migration

Copier-coller ce SQL:

```sql
-- Supprimer l'ancien constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_education_level_valid;

-- Créer le nouveau constraint avec valeurs détaillées
ALTER TABLE users
  ADD CONSTRAINT check_education_level_valid
  CHECK (
    education_level IS NULL OR education_level IN (
      -- Collège
      'sixieme', 'cinquieme', 'quatrieme', 'troisieme',

      -- Lycée
      'seconde', 'premiere', 'terminale',

      -- Post-bac
      'bac_obtenu', 'bac_plus_1', 'bac_plus_2', 'bac_plus_3',
      'bac_plus_4', 'bac_plus_5', 'superieur',

      -- Anciennes valeurs (rétro-compatibilité)
      'college', 'lycee', 'terminal', 'bac', 'university', 'other'
    )
  );
```

### Étape 3: Vérifier

Exécuter pour confirmer:

```sql
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'check_education_level_valid'
  AND conrelid = 'users'::regclass;
```

**Résultat attendu**: Doit afficher le constraint avec toutes les valeurs détaillées.

### Étape 4: Tester

1. Aller sur `/complete-profile`
2. Choisir un niveau détaillé (ex: "Terminale")
3. Compléter le formulaire
4. **Résultat attendu**: Pas d'erreur 23514, profil sauvegardé avec succès

---

## 📋 MIGRATION COMPLÈTE

Si vous préférez utiliser le fichier de migration:

### Fichier créé: [migrations/008-fix-education-level-constraint.sql](migrations/008-fix-education-level-constraint.sql)

**Exécution**:
1. Ouvrir le fichier `migrations/008-fix-education-level-constraint.sql`
2. Copier tout le contenu
3. Coller dans Supabase SQL Editor
4. Exécuter

---

## 🧪 TESTS APRÈS FIX

### Test 1: Niveau Collège
1. S'inscrire comme student
2. Sur `/complete-profile`, choisir **"6ème"**
3. Soumettre
4. **Résultat attendu**: ✅ Sauvegardé avec `education_level = 'sixieme'`

### Test 2: Niveau Lycée avec Spécialité
1. S'inscrire comme student
2. Choisir **"Terminale"**
3. Choisir spécialité **"STMG"**
4. Soumettre
5. **Résultat attendu**:
   - ✅ `education_level = 'terminale'`
   - ✅ `bac_type = 'stmg'`

### Test 3: Niveau Post-Bac
1. S'inscrire comme student
2. Choisir **"Bac +3 (Licence)"**
3. Soumettre
4. **Résultat attendu**: ✅ `education_level = 'bac_plus_3'`

### Test 4: Teacher (pas d'éducation)
1. S'inscrire comme teacher
2. Compléter profil (juste pays/téléphone)
3. Soumettre
4. **Résultat attendu**: ✅ `education_level = NULL` (normal pour teachers)

---

## 📊 VALEURS ACCEPTÉES

### Après le fix, le constraint accepte:

#### Collège:
- `sixieme` (6ème)
- `cinquieme` (5ème)
- `quatrieme` (4ème)
- `troisieme` (3ème)

#### Lycée:
- `seconde` (Seconde)
- `premiere` (Première)
- `terminale` (Terminale)

#### Post-Bac:
- `bac_obtenu` (Bac obtenu)
- `bac_plus_1` (Bac +1)
- `bac_plus_2` (Bac +2)
- `bac_plus_3` (Bac +3)
- `bac_plus_4` (Bac +4)
- `bac_plus_5` (Bac +5)
- `superieur` (Bac +5 et plus)

#### Anciennes valeurs (rétro-compatibilité):
- `college`
- `lycee`
- `terminal`
- `bac`
- `university`
- `other`

---

## 🔍 VÉRIFICATION DANS LA BASE DE DONNÉES

Pour voir les valeurs actuellement dans la DB:

```sql
SELECT
  id,
  email,
  role,
  education_level,
  bac_type,
  profile_completed
FROM users
WHERE education_level IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## ❌ SI L'ERREUR PERSISTE

### Vérifier que le constraint a bien été mis à jour:

```sql
-- Voir le constraint actuel
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'check_education_level_valid';
```

**Résultat attendu**: Doit contenir `'sixieme'`, `'terminale'`, `'bac_plus_3'`, etc.

### Vérifier les données existantes:

```sql
-- Voir si des valeurs invalides existent
SELECT DISTINCT education_level
FROM users
WHERE education_level IS NOT NULL;
```

Si des valeurs ne sont pas dans la liste, les mettre à jour:

```sql
-- Exemple: Mettre à jour les anciennes valeurs
UPDATE users SET education_level = 'terminale' WHERE education_level = 'terminal';
UPDATE users SET education_level = 'superieur' WHERE education_level = 'university';
```

---

## 🔗 FICHIERS LIÉS

- [migrations/008-fix-education-level-constraint.sql](migrations/008-fix-education-level-constraint.sql) - Migration de correction
- [src/lib/education-levels.ts](src/lib/education-levels.ts) - Définition des niveaux dans le code
- [src/app/(auth)/complete-profile/page.tsx](src/app/(auth)/complete-profile/page.tsx) - Formulaire complétion profil
- [migrations/007-complete-profile-FINAL.sql](migrations/007-complete-profile-FINAL.sql) - Migration originale

---

## 💡 POURQUOI CE PROBLÈME?

La migration 007 a été créée avec des **catégories générales** (`college`, `lycee`, `bac`) avant que le système éducatif détaillé soit implémenté.

Ensuite, le code a été amélioré avec des **niveaux détaillés** (`sixieme`, `terminale`, `bac_plus_3`) pour offrir une meilleure expérience utilisateur et des recommandations de cours plus précises.

Cette migration 008 aligne la base de données avec le code.

---

**Créé**: 28 janvier 2026
**Status**: 🔴 À APPLIQUER EN URGENCE
**Impact**: CRITIQUE - Bloque complétion de profil
**Durée**: 5 minutes
**Difficulté**: Facile (copier-coller SQL)
