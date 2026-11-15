# 🔧 FIX: course_id NULL dans enrollments

**Date**: 28 janvier 2026
**Problème détecté**: Tous les enrollments ont `course_id = NULL`
**Impact**: Students ne voient pas leurs cours (0 chapitres, 0 leçons)

---

## 🔍 PROBLÈME IDENTIFIÉ

D'après le diagnostic, vous avez **5 enrollments** avec:
- ✅ `classroom_id` rempli (ex: `afe76a2e-e9b3-4cd4-90dc-1446f66583a8`)
- ❌ `course_id` NULL
- ❌ Dates anciennes (déc 2025 - jan 2026)

**Cause**: Les enrollments ont été créés avec l'**ancien système** (classroom-only) et n'ont jamais été migrés vers le **nouveau système** (course-level).

**Conséquence**: Les pages students cherchent les chapters par `course_id`, mais comme course_id = NULL, elles ne trouvent rien → "0 chapitres, 0 leçons".

---

## ✅ SOLUTION EN 3 ÉTAPES

### ÉTAPE 1: Vérifier que les courses existent

Avant de migrer les enrollments, vérifions que chaque classroom a au moins un course:

```sql
-- Dans Supabase SQL Editor:
SELECT
  cl.id as classroom_id,
  cl.title as classroom_title,
  COUNT(c.id) as courses_count
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
WHERE cl.id IN (
  'afe76a2e-e9b3-4cd4-90dc-1446f66583a8',
  '6685ae7a-9db2-4b0e-8ca9-3d5c57e0cb13',
  '9f68dcb8-bbe1-4bea-b6ff-0cedc0b15aba'
)
GROUP BY cl.id, cl.title;
```

**Résultat attendu**: Chaque classroom doit avoir `courses_count >= 1`

**Si courses_count = 0 pour une classroom**:
→ Le teacher doit créer un course pour cette classroom
→ Ou supprimer les enrollments orphelins

---

### ÉTAPE 2: Migrer les enrollments

Une fois confirmé que les courses existent, exécutez:

```bash
# Dans Supabase SQL Editor:
scripts/migrate-enrollments-to-courses.sql
```

Ce script va:
1. ✅ Montrer l'état AVANT (combien de NULL)
2. ✅ Mapper chaque `classroom_id` → `course_id`
3. ✅ Mettre à jour tous les `course_id` NULL
4. ✅ Montrer l'état APRÈS (devrait être 0 NULL)
5. ✅ Afficher un résumé détaillé

**Temps**: ~30 secondes

---

### ÉTAPE 3: Vérifier que ça marche

Après la migration:

```sql
-- Vérifier qu'il n'y a plus de NULL
SELECT COUNT(*) FROM enrollments WHERE course_id IS NULL;
-- Résultat attendu: 0

-- Vérifier que les students peuvent accéder aux chapters
SELECT
  e.student_id,
  u.email,
  COUNT(DISTINCT ch.id) as chapters_count,
  COUNT(DISTINCT l.id) as lessons_count
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN courses co ON co.id = e.course_id
LEFT JOIN chapters ch ON ch.course_id = co.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
GROUP BY e.student_id, u.email;
```

**Résultat attendu**: `chapters_count > 0` et `lessons_count > 0`

---

## 🧪 TEST COMPLET

Après la migration, testez le flow étudiant:

### 1. Rafraîchir l'application
```bash
npm run dev
```

### 2. Se connecter comme student

Utiliser un des emails de vos enrollments:
- Student 1: `35bcd818-619f-4f63-87c9-f64f39741dc1`
- Student 2: `a879be39-77b8-44bb-834a-729f8337131c`
- Student 3: `c65136c0-bc25-4b7e-9696-acd89cc6ba55`

### 3. Aller sur /student/my-courses

**Résultat attendu**:
- ✅ Voir les cours avec "X leçons" (pas "0 leçons")
- ✅ Voir la barre de progression
- ✅ Cliquer sur un cours → voir les chapitres et leçons

### 4. Aller sur /learn/[classroomId]

**Résultat attendu**:
- ✅ Voir les chapitres
- ✅ Voir les leçons dans chaque chapitre
- ✅ Pouvoir cliquer sur une leçon

---

## ❌ TROUBLESHOOTING

### Problème: Migration dit "0 enrollments migrés"

**Cause**: Aucun course n'existe pour les classrooms

**Solution**:
```sql
-- Voir quels classrooms n'ont pas de course
SELECT
  cl.id,
  cl.title,
  cl.teacher_id
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
WHERE c.id IS NULL
AND cl.id IN (
  SELECT DISTINCT classroom_id FROM enrollments WHERE course_id IS NULL
);

-- Pour chaque classroom sans course, le teacher doit:
-- 1. Se connecter
-- 2. Aller sur /teacher/classes/create
-- 3. Créer un course pour cette classroom
```

### Problème: "chapters_count = 0" après migration

**Cause**: Le course existe mais n'a pas de chapters/leçons

**Solution**: Le teacher doit créer du contenu:
```sql
-- Voir quels courses n'ont pas de chapters
SELECT
  c.id,
  c.title,
  COUNT(ch.id) as chapters_count
FROM courses c
LEFT JOIN chapters ch ON ch.course_id = c.id
WHERE c.id IN (
  SELECT DISTINCT course_id FROM enrollments WHERE course_id IS NOT NULL
)
GROUP BY c.id, c.title
HAVING COUNT(ch.id) = 0;

-- Le teacher doit:
-- 1. Aller sur /teacher/courses/[id]
-- 2. Ajouter des chapitres
-- 3. Ajouter des leçons (dont le QCM si nécessaire)
```

### Problème: "course_id still NULL" après migration

**Cause**: La classroom référencée n'existe plus

**Solution**: Supprimer les enrollments orphelins
```sql
-- Voir les enrollments orphelins
SELECT
  e.*
FROM enrollments e
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
WHERE cl.id IS NULL;

-- Supprimer si confirmé
DELETE FROM enrollments
WHERE classroom_id NOT IN (SELECT id FROM classrooms);
```

---

## 📊 RÉSUMÉ DES CHANGEMENTS

### AVANT
```json
{
  "classroom_id": "afe76a2e-...",
  "course_id": null,           ← Problème!
  "student_id": "35bcd818-...",
  "status": "active"
}
```

### APRÈS
```json
{
  "classroom_id": "afe76a2e-...",
  "course_id": "xyz123...",    ← Rempli!
  "student_id": "35bcd818-...",
  "status": "active"
}
```

### Impact sur les queries

**AVANT** (échouait):
```typescript
// ❌ course_id = null → pas de chapters
const { data: chaptersData } = await supabase
  .from('chapters')
  .eq('course_id', enrollment.course_id)  // NULL!
```

**APRÈS** (fonctionne):
```typescript
// ✅ course_id rempli → chapters trouvés
const { data: chaptersData } = await supabase
  .from('chapters')
  .eq('course_id', enrollment.course_id)  // UUID valide!
```

---

## ✅ CHECKLIST POST-MIGRATION

Après avoir exécuté le script de migration:

- [ ] Migration SQL exécutée sans erreur
- [ ] `SELECT COUNT(*) FROM enrollments WHERE course_id IS NULL` = 0
- [ ] Health check retourne "✅ OK"
- [ ] Student peut voir ses cours dans /student/my-courses
- [ ] Student voit "X leçons" (pas "0 leçons")
- [ ] Student peut accéder à /learn/[classroomId]
- [ ] Student voit les chapitres et leçons
- [ ] Student peut ouvrir une leçon
- [ ] Si QCM créé: Student peut le passer

**Si toutes les cases sont cochées**: 🎉 Migration réussie!

---

## 📚 RESSOURCES

- [scripts/migrate-enrollments-to-courses.sql](scripts/migrate-enrollments-to-courses.sql) - Script de migration
- [FIX-STUDENT-COURSE-VISIBILITY.md](FIX-STUDENT-COURSE-VISIBILITY.md) - Fix des pages UI
- [AUDIT-COMPLET-2026-01-28.md](AUDIT-COMPLET-2026-01-28.md) - Audit complet
- [ACTION-PLAN-IMMEDIATE.md](ACTION-PLAN-IMMEDIATE.md) - Plan d'action

---

**Créé**: 28 janvier 2026
**Status**: 🔴 CRITIQUE - course_id NULL bloque l'accès student
**Action**: Exécuter `scripts/migrate-enrollments-to-courses.sql`
**Temps**: ~2 minutes (vérification + migration + test)
