# 🔧 FIX: Courses Manquants pour les Classrooms

**Date**: 28 janvier 2026
**Problème**: Migration enrollments réussie MAIS `accessible_chapters = 0`
**Cause Racine**: Les classrooms n'ont **aucun course** en base de données

---

## 🔍 DIAGNOSTIC

### Résultat de la migration

Après avoir exécuté `migrate-enrollments-to-courses.sql`, vous avez obtenu:

```json
{
  "enrolled_courses": 1,
  "accessible_chapters": 0,    // ❌ Problème!
  "accessible_lessons": 0      // ❌ Problème!
}
```

ET:

```json
{
  "classroom_id": "9f68dcb8-bbe1-4bea-b6ff-0cedc0b15aba",
  "title": "histo",
  "courses_count": 0           // ❌ ROOT CAUSE!
}
```

### Analyse

La migration a essayé de faire:
```sql
UPDATE enrollments e
SET course_id = (
  SELECT id FROM courses
  WHERE classroom_id = e.classroom_id  -- ← Cette query retourne NULL!
  LIMIT 1
)
```

**Mais**: Si aucun course n'existe pour `classroom_id`, alors `course_id` reste NULL ou pointe vers un UUID invalide.

**Conséquence**: Même avec `course_id` rempli, les students ne voient rien car:
- Le `course_id` pointe vers un course qui n'existe pas
- OU il n'y a pas de chapters/lessons dans ce course

---

## ✅ SOLUTION EN 3 ÉTAPES

### ÉTAPE 1: Diagnostiquer le problème exact

Exécutez le diagnostic complet:

```bash
# Dans Supabase SQL Editor:
scripts/diagnose-missing-courses.sql
```

Ce script va:
1. ✅ Compter les courses en base
2. ✅ Vérifier les course_ids dans enrollments
3. ✅ Valider si ces course_ids existent
4. ✅ Voir le contenu (chapters/lessons) par classroom
5. ✅ Donner un diagnostic précis du problème

**Questions à répondre**:
- Est-ce que des courses existent en base? (`total_courses = ?`)
- Est-ce que les enrollments pointent vers des courses valides?
- Est-ce que les courses ont du contenu (chapters/lessons)?

---

### ÉTAPE 2: Créer les courses manquants

Si le diagnostic montre `total_courses = 0` ou `courses_count = 0`, exécutez:

```bash
# Dans Supabase SQL Editor:
scripts/create-default-courses.sql
```

Ce script va:
1. ✅ Créer un course par défaut pour chaque classroom qui a des enrollments
2. ✅ Re-mapper tous les enrollments vers ces nouveaux courses
3. ✅ Vérifier que tous les enrollments ont un `course_id` valide
4. ✅ Tester l'accès student

**Résultat attendu**:
```
✅ Courses créés: 3
✅ Enrollments avec course_id: 19
✅ Enrollments sans course_id: 0
```

**IMPORTANT**: Les courses créés seront **vides** (0 chapters, 0 leçons). Les teachers devront ajouter le contenu.

---

### ÉTAPE 3: Ajouter du contenu aux courses

Après la création des courses, les teachers doivent ajouter du contenu.

#### Pour chaque teacher:

1. **Se connecter** sur la plateforme

2. **Aller sur** `/teacher/dashboard`
   - Voir la liste de ses courses

3. **Cliquer sur un course** → `/teacher/courses/[courseId]`

4. **Ajouter des chapitres** (Chapters):
   ```
   Chapitre 1: Introduction
   Chapitre 2: Concepts de base
   Chapitre 3: Exercices pratiques
   ```

5. **Pour chaque chapitre, ajouter des leçons** (Lessons):
   ```
   Leçon 1.1: Présentation
   Leçon 1.2: Objectifs du cours
   Leçon 2.1: Théorie
   Leçon 2.2: Exemples
   ```

6. **Ajouter un QCM** (optionnel):
   - Créer un quiz à la fin d'un chapitre
   - Définir le `required_score` pour débloquer le chapitre suivant

7. **Publier le course**:
   - S'assurer que `is_published = true`
   - Les students pourront maintenant voir le contenu

---

## 🧪 VÉRIFICATION COMPLÈTE

### 1. Vérifier que les courses existent

```sql
SELECT
  cl.id as classroom_id,
  cl.title as classroom_title,
  COUNT(c.id) as courses_count,
  ARRAY_AGG(c.title) as course_titles
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
WHERE cl.id IN (
  SELECT DISTINCT classroom_id FROM enrollments
)
GROUP BY cl.id, cl.title;
```

**Résultat attendu**: `courses_count >= 1` pour chaque classroom

### 2. Vérifier les enrollments

```sql
SELECT
  COUNT(*) FILTER (WHERE course_id IS NOT NULL) as with_valid_course,
  COUNT(*) FILTER (WHERE course_id IS NULL) as without_course
FROM enrollments;
```

**Résultat attendu**:
- `with_valid_course = 19`
- `without_course = 0`

### 3. Vérifier le contenu disponible

```sql
SELECT
  c.id as course_id,
  c.title as course_title,
  COUNT(DISTINCT ch.id) as chapters_count,
  COUNT(DISTINCT l.id) as lessons_count,
  COUNT(DISTINCT e.id) as enrolled_students
FROM courses c
LEFT JOIN chapters ch ON ch.course_id = c.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
LEFT JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title;
```

**Résultat attendu**:
- Si courses viennent d'être créés: `chapters_count = 0`, `lessons_count = 0`
- Après que teachers ajoutent contenu: `chapters_count > 0`, `lessons_count > 0`

### 4. Tester l'accès student

**A. Avec courses vides (juste après création)**:
```bash
npm run dev
# Se connecter comme student
# Aller sur /student/my-courses
```
**Résultat attendu**:
- ✅ Cours visibles
- ❌ Mais "0 leçons" (normal, contenu pas encore ajouté)

**B. Avec contenu ajouté (après travail des teachers)**:
```bash
# Se connecter comme student
# Aller sur /student/my-courses
```
**Résultat attendu**:
- ✅ Cours visibles avec "X leçons"
- ✅ Cliquer sur un cours → voir les chapitres
- ✅ Cliquer sur une leçon → ouvrir le contenu

---

## ❌ TROUBLESHOOTING

### Problème: "total_courses = 0" après exécution du script

**Cause**: Le script `create-default-courses.sql` a échoué

**Diagnostics**:
```sql
-- Voir les erreurs potentielles
SELECT * FROM classrooms WHERE id IN (
  SELECT DISTINCT classroom_id FROM enrollments
);

-- Vérifier que les classrooms existent
SELECT COUNT(*) FROM classrooms;
```

**Solution**: Vérifier les logs d'erreur SQL et corriger les contraintes manquantes

---

### Problème: "enrollments_still_null > 0"

**Cause**: Certains enrollments n'ont pas pu être mappés à un course

**Diagnostics**:
```sql
-- Voir les enrollments orphelins
SELECT
  e.*,
  cl.title as classroom_title
FROM enrollments e
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.course_id IS NULL OR c.id IS NULL;
```

**Solutions**:

**Option A: Classroom n'existe plus**
```sql
-- Supprimer les enrollments orphelins
DELETE FROM enrollments
WHERE classroom_id NOT IN (SELECT id FROM classrooms);
```

**Option B: Classroom existe mais pas de course**
```sql
-- Créer un course manuellement
INSERT INTO courses (classroom_id, title, is_published)
VALUES ('CLASSROOM_UUID', 'Titre du cours', true)
RETURNING id;

-- Mapper l'enrollment
UPDATE enrollments
SET course_id = 'COURSE_UUID'
WHERE classroom_id = 'CLASSROOM_UUID';
```

---

### Problème: "accessible_chapters = 0" après ajout de contenu

**Cause**: Les chapters ne sont pas liés au bon `course_id`

**Diagnostics**:
```sql
-- Vérifier les chapters
SELECT
  ch.*,
  c.title as course_title
FROM chapters ch
LEFT JOIN courses c ON c.id = ch.course_id;

-- Vérifier si les chapters pointent vers les bons courses
SELECT
  e.course_id as enrollment_course,
  COUNT(DISTINCT ch.id) as chapters_found
FROM enrollments e
LEFT JOIN chapters ch ON ch.course_id = e.course_id
GROUP BY e.course_id;
```

**Solution**: Re-lier les chapters au bon course
```sql
-- Si les chapters existent mais sont liés à un ancien course
UPDATE chapters
SET course_id = 'NEW_COURSE_UUID'
WHERE course_id = 'OLD_COURSE_UUID';
```

---

### Problème: Students voient les cours mais "0 leçons"

**Cause**: Les chapters existent mais n'ont pas de lessons

**Diagnostics**:
```sql
SELECT
  ch.id as chapter_id,
  ch.title as chapter_title,
  COUNT(l.id) as lessons_count
FROM chapters ch
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE ch.course_id IN (
  SELECT DISTINCT course_id FROM enrollments
)
GROUP BY ch.id, ch.title;
```

**Solution**: Le teacher doit ajouter des leçons via `/teacher/courses/[courseId]`

---

## 📊 COMPRENDRE LE PROBLÈME

### AVANT (État actuel)

```
classrooms table:
- id: afe76a2e-...
- title: "Math 2025"
- teacher_id: xyz...

courses table:
→ VIDE! (0 rows)   ← ROOT CAUSE

enrollments table:
- classroom_id: afe76a2e-...
- course_id: ??? (NULL ou invalide)
- student_id: 35bcd818-...

chapters table:
- course_id: ??? (pas de match)

Result: accessible_chapters = 0
```

### APRÈS (Avec fix appliqué)

```
classrooms table:
- id: afe76a2e-...
- title: "Math 2025"
- teacher_id: xyz...

courses table:
- id: abc123-...
- classroom_id: afe76a2e-...   ← Nouveau!
- title: "Math 2025"
- is_published: true

enrollments table:
- classroom_id: afe76a2e-...
- course_id: abc123-...         ← Mappé!
- student_id: 35bcd818-...

chapters table:
→ VIDE pour l'instant (teachers doivent ajouter)

Result: Course visible mais 0 leçons (normal)
```

### ÉTAT FINAL (Après travail teachers)

```
courses table:
- id: abc123-...
- title: "Math 2025"

chapters table:
- id: ch1-...
- course_id: abc123-...         ← Lié!
- title: "Chapitre 1"

lessons table:
- id: lesson1-...
- chapter_id: ch1-...           ← Lié!
- title: "Introduction"

Result: Students voient chapitres et leçons! ✅
```

---

## ✅ CHECKLIST POST-FIX

Après avoir appliqué le fix complet:

### Immédiatement après `create-default-courses.sql`:
- [ ] Courses créés: `SELECT COUNT(*) FROM courses` > 0
- [ ] Tous enrollments ont course_id: `SELECT COUNT(*) FROM enrollments WHERE course_id IS NULL` = 0
- [ ] course_ids sont valides: Aucune erreur dans le test student access
- [ ] Application démarre: `npm run dev` sans erreur
- [ ] Students voient leurs cours: Aller sur `/student/my-courses`

### Après que les teachers ajoutent du contenu:
- [ ] Chapters créés: `SELECT COUNT(*) FROM chapters` > 0
- [ ] Lessons créées: `SELECT COUNT(*) FROM lessons` > 0
- [ ] Students voient "X leçons" (pas "0 leçons")
- [ ] Students peuvent ouvrir les leçons
- [ ] QCM fonctionnels (si créés)

---

## 🎯 WORKFLOW COMPLET

### Phase 1: Fix base de données (Vous / Dev)

1. ✅ Exécuter `scripts/diagnose-missing-courses.sql`
2. ✅ Confirmer que `courses_count = 0`
3. ✅ Exécuter `scripts/create-default-courses.sql`
4. ✅ Vérifier que tous enrollments ont `course_id` valide
5. ✅ Commiter les changements

### Phase 2: Ajout contenu (Teachers)

1. ⏳ Teachers se connectent sur `/teacher/dashboard`
2. ⏳ Pour chaque course:
   - Ajouter 3-5 chapitres
   - Ajouter 2-5 leçons par chapitre
   - (Optionnel) Ajouter un QCM
3. ⏳ Publier le course
4. ⏳ Notifier les students que le contenu est disponible

### Phase 3: Test utilisateur (Students)

1. ⏳ Students se connectent
2. ⏳ Vont sur `/student/my-courses`
3. ⏳ Voient leurs cours avec leçons
4. ⏳ Peuvent suivre le cours

---

## 📚 RESSOURCES

- [scripts/diagnose-missing-courses.sql](scripts/diagnose-missing-courses.sql) - Diagnostic complet
- [scripts/create-default-courses.sql](scripts/create-default-courses.sql) - Création courses
- [FIX-COURSE-ID-NULL.md](FIX-COURSE-ID-NULL.md) - Fix précédent (migration enrollments)
- [AUDIT-COMPLET-2026-01-28.md](AUDIT-COMPLET-2026-01-28.md) - Audit général
- [ACTION-PLAN-IMMEDIATE.md](ACTION-PLAN-IMMEDIATE.md) - Plan d'action complet

---

## 💡 POINTS IMPORTANTS

### Pourquoi ce problème est arrivé?

1. **Ancien système**: Enrollments étaient créés directement avec `classroom_id`
2. **Nouveau système**: Introduit `courses` comme niveau intermédiaire
3. **Migration oubliée**: Les classrooms existants n'ont jamais eu de courses créés
4. **Résultat**: Enrollments pointent vers classroom mais pas de course = pas de contenu

### Comment éviter ce problème à l'avenir?

1. **Lors de création classroom**: Créer automatiquement un course par défaut
2. **Validation côté code**: Vérifier qu'un course existe avant d'enrollment
3. **Migration automatique**: Trigger qui crée course si enrollment créé sans course
4. **Tests**: Ajouter tests E2E pour le flow complet teacher → student

### Code à ajouter (Recommandé)

```typescript
// Dans src/app/api/classrooms/create/route.ts
export async function POST(request: Request) {
  // ... création classroom ...

  // ✅ AJOUTER: Créer course par défaut
  const { data: course } = await supabase
    .from('courses')
    .insert({
      classroom_id: classroom.id,
      title: classroom.title,
      is_published: true,
    })
    .select()
    .single();

  return NextResponse.json({ classroom, course });
}
```

---

**Créé**: 28 janvier 2026
**Status**: 🔴 CRITIQUE - Courses manquants bloquent l'accès
**Actions**:
1. Exécuter `scripts/diagnose-missing-courses.sql`
2. Exécuter `scripts/create-default-courses.sql`
3. Teachers ajoutent contenu
4. Tester avec students

**Temps estimé**:
- Fix DB: ~5 minutes
- Ajout contenu par teacher: ~1-2 heures par course
