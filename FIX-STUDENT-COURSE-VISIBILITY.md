# FIX: Student Course Visibility (0 chapitres, 0 leçons)

**Date**: 2026-01-24
**Problème**: Après le paiement, l'étudiant voit "0 chapitres, 0 leçons, 0 élèves" au lieu du contenu du cours.

## 🔍 Cause du problème

Le système a migré vers une architecture **course-level enrollment** où:
- `enrollments` contient `course_id` ET `classroom_id`
- `chapters` sont liés aux `courses` via `course_id` (pas directement aux `classrooms`)
- `lessons` sont liés aux `chapters` via `chapter_id`

**Architecture correcte**:
```
enrollments → course_id
courses → classroom_id
chapters → course_id
lessons → chapter_id
```

Mais les pages étudiantes interrogeaient encore les **chapters** par `classroom_id`, qui n'existe plus dans la table `chapters`.

---

## ✅ Fichiers corrigés

### 1. [src/app/(dashboard)/student/my-courses/page.tsx](src/app/(dashboard)/student/my-courses/page.tsx)
**Page**: Liste des cours de l'étudiant

**Problème** (lignes 79-92):
```typescript
// ❌ Ancien code - INCORRECT
const { data: chaptersData } = await supabase
  .from('chapters')
  .select('id, classroom_id')  // chapters n'a pas classroom_id
  .in('classroom_id', classroomIds)
```

**Solution**:
```typescript
// ✅ Nouveau code - CORRECT
// Get unique course_ids from enrollments
const courseIds = [...new Set(enrollmentsData.map(e => e.course_id).filter(Boolean))]

// Get chapters using course_id
const { data: chaptersData } = await supabase
  .from('chapters')
  .select('id, course_id')  // chapters a course_id
  .in('course_id', courseIds)  // Query par course_id
```

### 2. [src/app/(dashboard)/learn/[classroomId]/page.tsx](src/app/(dashboard)/learn/[classroomId]/page.tsx)
**Page**: Contenu détaillé d'un cours (chapitres et leçons)

**Problème** (lignes 61-65):
```typescript
// ❌ Ancien code - INCORRECT
const { data: chaptersData } = await supabase
  .from('chapters')
  .select('id, title, order_index, required_score')
  .eq('classroom_id', classroomId)
```

**Solution**:
```typescript
// ✅ Nouveau code - CORRECT
// 1. Get the student's enrollment to find course_id
const { data: enrollment } = await supabase
  .from('enrollments')
  .select('course_id')
  .eq('student_id', user.id)
  .eq('classroom_id', classroomId)
  .single()

// 2. Get chapters using course_id from enrollment
const { data: chaptersData } = await supabase
  .from('chapters')
  .select('id, title, order_index, required_score')
  .eq('course_id', enrollment.course_id)
```

### 3. [src/app/(dashboard)/student/dashboard/page.tsx](src/app/(dashboard)/student/dashboard/page.tsx)
**Page**: Tableau de bord étudiant avec statistiques

**Problème** (lignes 138-145):
```typescript
// ❌ Ancien code - INCORRECT
const { data: chaptersData } = await supabase
  .from('chapters')
  .select('id, classroom_id')
  .in('classroom_id', classroomIds)

const chapterToClassroom = new Map(chaptersData?.map(c => [c.id, c.classroom_id]) || [])
```

**Solution**:
```typescript
// ✅ Nouveau code - CORRECT
// 1. Get course_ids from enrollments
const courseIds = [...new Set(enrollmentsData.map(e => e.course_id).filter(Boolean))]

// 2. Get courses to map course_id → classroom_id
const { data: coursesData } = await supabase
  .from('courses')
  .select('id, classroom_id')
  .in('id', courseIds)

const courseToClassroom = new Map(coursesData?.map(c => [c.id, c.classroom_id]) || [])

// 3. Get chapters using course_id
const { data: chaptersData } = await supabase
  .from('chapters')
  .select('id, course_id')
  .in('course_id', courseIds)

// 4. Map chapters to classrooms via courses
const chapterToClassroom = new Map(
  chaptersData?.map(c => {
    const classroomId = courseToClassroom.get(c.course_id)
    return [c.id, classroomId]
  }).filter(([_, classroomId]) => classroomId !== undefined) || []
)
```

---

## 🧪 Vérification

### Étape 1: Vérifier l'enrollment
Exécutez dans Supabase SQL Editor:
```sql
SELECT
  e.id,
  e.course_id,  -- Doit être non-null
  e.classroom_id,
  c.title as course_title
FROM enrollments e
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.student_id = 'VOTRE_STUDENT_ID'
ORDER BY e.enrolled_at DESC;
```

**Résultat attendu**: `course_id` doit être présent (pas NULL).

### Étape 2: Vérifier la structure du cours
```sql
SELECT
  c.id as course_id,
  c.title as course_title,
  COUNT(DISTINCT ch.id) as total_chapters,
  COUNT(DISTINCT l.id) as total_lessons
FROM courses c
LEFT JOIN chapters ch ON ch.course_id = c.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE c.id = 'VOTRE_COURSE_ID'
GROUP BY c.id, c.title;
```

**Résultat attendu**:
- `total_chapters` > 0
- `total_lessons` > 0 (incluant le QCM créé)

### Étape 3: Tester côté étudiant
1. Connectez-vous en tant qu'étudiant
2. Allez sur **Mes Cours** (`/student/my-courses`)
3. Vous devriez voir:
   - Le cours acheté
   - `X/X leçons` (pas "0/0")
   - Barre de progression

4. Cliquez sur le cours pour accéder au contenu (`/learn/[classroomId]`)
5. Vous devriez voir:
   - Les chapitres créés
   - Les leçons (dont le QCM)

---

## 📋 Script de diagnostic complet

Utilisez [verify-student-enrollment.sql](verify-student-enrollment.sql) pour un diagnostic complet:
1. Remplacez `STUDENT_USER_ID` par l'ID de l'étudiant
2. Remplacez `COURSE_ID` par le course_id trouvé dans l'enrollment
3. Exécutez toutes les requêtes pour voir la structure complète

---

## ⚠️ Si le problème persiste

### Cas 1: `course_id` est NULL dans l'enrollment
**Cause**: L'enrollment a été créé avant la migration course-level.
**Solution**: Exécutez la migration `006-course-level-enrollment.sql` qui migrate automatiquement les anciens enrollments.

### Cas 2: `total_chapters = 0` ou `total_lessons = 0`
**Cause**: Le cours n'a pas de contenu.
**Solution**: Le professeur doit créer des chapitres et leçons pour ce cours. Vérifiez que:
- Le professeur a créé le cours dans `/teacher/courses`
- Des chapitres ont été ajoutés au cours
- Des leçons (dont le QCM) ont été créées dans les chapitres

### Cas 3: Erreur RLS "permission denied"
**Cause**: Les RLS policies ne permettent pas aux étudiants de lire les lessons.
**Solution**: Vérifiez les policies avec:
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('lessons', 'chapters', 'courses')
  AND cmd = 'SELECT';
```

Assurez-vous qu'il existe des policies permettant aux étudiants enrolled de lire les lessons.

---

## 📊 Architecture finale

```
┌─────────────┐
│ enrollments │  student_id, course_id, classroom_id
└──────┬──────┘
       │
       ↓ course_id
┌─────────────┐
│   courses   │  classroom_id, title, price
└──────┬──────┘
       │
       ↓ course_id
┌─────────────┐
│  chapters   │  course_id, title, order_index
└──────┬──────┘
       │
       ↓ chapter_id
┌─────────────┐
│   lessons   │  chapter_id, title, type (qcm, video, etc.)
└─────────────┘
```

---

## ✨ Résumé

**Avant**: Requêtes par `classroom_id` → Échec car `chapters` n'a plus `classroom_id`
**Après**: Requêtes par `course_id` depuis l'enrollment → Succès ✅

Les étudiants peuvent maintenant voir et accéder au contenu des cours achetés, y compris les QCM créés par les professeurs.
