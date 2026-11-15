# 🔧 FIX: Schema Enrollments Manquant

**Date**: 28 janvier 2026
**Erreur**: `column "classroom_id" does not exist`
**Cause**: Table `enrollments` existe mais avec un schéma incomplet

---

## 🔍 DIAGNOSTIC

Votre table `enrollments` existe mais **n'a pas toutes les colonnes nécessaires** (notamment `classroom_id` et `course_id`).

### Étape 1: Vérifier la structure actuelle

**Exécutez dans Supabase SQL Editor**:
```sql
-- Voir les colonnes actuelles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;
```

**Résultat attendu**: Liste des colonnes actuelles (probablement incomplète)

---

## ✅ SOLUTION RAPIDE

### Option A: Ajouter les colonnes manquantes (Recommandé)

**Avantage**: Garde les données existantes
**Temps**: ~1 minute

**Exécuter**:
```bash
# Dans Supabase SQL Editor:
scripts/fix-enrollments-add-missing-columns.sql
```

Ce script:
1. ✅ Vérifie quelles colonnes existent déjà
2. ✅ Ajoute SEULEMENT les colonnes manquantes
3. ✅ Crée les indexes nécessaires
4. ✅ Ajoute les contraintes
5. ✅ Garde toutes vos données existantes

---

### Option B: Recréer la table (Dangereux!)

**⚠️ ATTENTION**: Perte de toutes les données existantes!

Seulement si vous êtes sûr de ne PAS avoir de données importantes.

```sql
-- 1. Backup (juste au cas où)
CREATE TABLE enrollments_backup AS SELECT * FROM enrollments;

-- 2. Supprimer l'ancienne table
DROP TABLE enrollments CASCADE;

-- 3. Re-exécuter le setup complet
-- supabase-complete-setup.sql
```

---

## 📋 COLONNES NÉCESSAIRES

La table `enrollments` doit avoir:

```sql
enrollments (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,           ← Lien vers users
  classroom_id UUID NOT NULL,         ← Lien vers classrooms
  course_id UUID,                     ← Lien vers courses (peut être NULL)
  payment_id UUID,
  payment_required BOOLEAN,
  payment_completed_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ,
  status TEXT,
  progress INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Colonnes critiques manquantes

Si votre table n'a PAS ces colonnes, le fix est nécessaire:

- ❌ `classroom_id` → Erreur actuelle
- ❌ `course_id` → Requis pour le nouveau système
- ❌ `payment_id` → Lien vers transactions
- ❌ `status` → État de l'enrollment

---

## 🧪 VÉRIFICATION POST-FIX

### 1. Vérifier que les colonnes existent

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;
```

**Résultat attendu**: Toutes les colonnes listées ci-dessus

### 2. Vérifier les contraintes

```sql
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'enrollments';
```

**Résultat attendu**: Foreign keys vers `users`, `classrooms`, `courses`

### 3. Test d'insertion

```sql
-- Test (remplacer par de vrais IDs)
INSERT INTO enrollments (
  student_id,
  classroom_id,
  course_id,
  status
) VALUES (
  'STUDENT_UUID',
  'CLASSROOM_UUID',
  'COURSE_UUID',
  'active'
);

-- Si ça marche: ✅ Fix réussi
-- Si erreur: Voir troubleshooting ci-dessous
```

---

## ❌ TROUBLESHOOTING

### Erreur: "relation classrooms does not exist"

**Cause**: Table `classrooms` n'existe pas non plus

**Solution**: Exécuter le setup complet
```bash
supabase-complete-setup.sql
```

### Erreur: "violates foreign key constraint"

**Cause**: Vous essayez d'insérer un `classroom_id` qui n'existe pas

**Solution**: Créer d'abord un classroom
```sql
-- Créer un classroom de test
INSERT INTO classrooms (teacher_id, title, is_free, is_public)
VALUES ('TEACHER_UUID', 'Test Classroom', true, true)
RETURNING id;
```

### Erreur: "duplicate key value violates unique constraint"

**Cause**: Un enrollment existe déjà pour ce student + course

**Solution**: Mettre à jour au lieu d'insérer
```sql
-- Voir les enrollments existants
SELECT * FROM enrollments WHERE student_id = 'STUDENT_UUID';

-- Mettre à jour
UPDATE enrollments
SET course_id = 'COURSE_UUID'
WHERE student_id = 'STUDENT_UUID'
AND classroom_id = 'CLASSROOM_UUID';
```

---

## 🎯 APRÈS LE FIX

### 1. Relancer health check

```bash
# Dans Supabase SQL Editor:
scripts/quick-health-check.sql
```

**Résultat attendu**:
```
✅ OK: Tous les enrollments ont course_id
```

### 2. Tester l'application

```bash
npm run dev
```

Vérifier:
- [ ] Pas d'erreur "classroom_id does not exist"
- [ ] Students peuvent voir leurs cours
- [ ] Teacher peut voir ses students

### 3. Migrer les données si nécessaire

Si vous avez des enrollments existants sans `course_id`:

```sql
-- Mapper chaque enrollment à son course
UPDATE enrollments e
SET course_id = (
  SELECT id
  FROM courses
  WHERE classroom_id = e.classroom_id
  ORDER BY created_at
  LIMIT 1
)
WHERE course_id IS NULL
AND classroom_id IS NOT NULL;

-- Vérifier
SELECT COUNT(*) FROM enrollments WHERE course_id IS NULL;
-- Résultat attendu: 0
```

---

## 📚 RESSOURCES

- [scripts/check-enrollments-structure.sql](scripts/check-enrollments-structure.sql) - Diagnostic détaillé
- [scripts/fix-enrollments-add-missing-columns.sql](scripts/fix-enrollments-add-missing-columns.sql) - Fix automatique
- [DATABASE-SETUP-GUIDE.md](DATABASE-SETUP-GUIDE.md) - Setup complet
- [AUDIT-COMPLET-2026-01-28.md](AUDIT-COMPLET-2026-01-28.md) - Audit détaillé

---

## ✅ CHECKLIST COMPLÈTE

Après avoir appliqué le fix:

- [ ] Colonnes ajoutées: `classroom_id`, `course_id`, `payment_id`, etc.
- [ ] Indexes créés sur `classroom_id` et `course_id`
- [ ] Contrainte unique `student_id + course_id` ajoutée
- [ ] Test d'insertion réussi
- [ ] Health check retourne "OK"
- [ ] Application démarre sans erreur
- [ ] Students voient leurs cours
- [ ] Aucun enrollment avec `course_id` NULL

**Si toutes les cases sont cochées**: 🎉 Fix réussi!

---

**Créé**: 28 janvier 2026
**Status**: 🔴 CRITIQUE - Schema incomplet
**Action**: Exécuter `scripts/fix-enrollments-add-missing-columns.sql`
