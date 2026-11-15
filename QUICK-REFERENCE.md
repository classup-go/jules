# ⚡ QUICK REFERENCE - Jules Platform

**Mise à jour**: 28 janvier 2026

---

## 🏃 COMMANDES RAPIDES

### Health Check Système
```bash
# Dans Supabase SQL Editor:
# Exécuter: scripts/quick-health-check.sql
```

### Vérifier Enrollment Étudiant
```sql
-- Remplacer STUDENT_USER_ID par le vrai ID
SELECT
  e.id,
  e.course_id,
  e.classroom_id,
  c.title as course_title,
  cl.title as classroom_title
FROM enrollments e
LEFT JOIN courses c ON c.id = e.course_id
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
WHERE e.student_id = 'STUDENT_USER_ID';
```

### Voir Contenu d'un Cours
```sql
-- Remplacer COURSE_ID par le vrai ID
SELECT
  'Course' as type,
  c.title as name,
  NULL::integer as order_index
FROM courses c
WHERE c.id = 'COURSE_ID'

UNION ALL

SELECT
  'Chapter' as type,
  ch.title,
  ch.order_index
FROM chapters ch
WHERE ch.course_id = 'COURSE_ID'

UNION ALL

SELECT
  'Lesson' as type,
  '  └─ ' || l.title,
  l.order_index
FROM lessons l
JOIN chapters ch ON ch.id = l.chapter_id
WHERE ch.course_id = 'COURSE_ID'
ORDER BY order_index;
```

### Tester RLS en tant que Student
```sql
-- Se mettre dans le rôle student
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'STUDENT_USER_ID';

-- Tester accès courses
SELECT id, title, price FROM courses LIMIT 5;

-- Retour rôle admin
RESET ROLE;
```

---

## 📁 FICHIERS IMPORTANTS

```
📋 Documentation:
├─ AUDIT-COMPLET-2026-01-28.md        → Audit détaillé
├─ ACTION-PLAN-IMMEDIATE.md           → Plan d'action 2 jours
├─ FIX-STUDENT-COURSE-VISIBILITY.md   → Fix visibility bug
└─ QUICK-REFERENCE.md                 → Ce fichier

🔧 Scripts Utiles:
├─ scripts/quick-health-check.sql     → Health check complet
├─ verify-student-enrollment.sql      → Diagnostic enrollment
└─ fix-quiz-rls-simple.sql            → Fix RLS pour quiz

⚙️ Migrations:
└─ migrations/
   ├─ 000-verify-schema.sql
   ├─ 001-multi-currency.sql
   ├─ 002-add-missing-columns.sql
   ├─ 003-unified-programme-model.sql
   ├─ 004-integrate-slides.sql
   ├─ 005-add-is-public.sql
   ├─ 006-course-level-enrollment.sql
   ├─ 007-complete-profile*.sql (x3!) ⚠️
   └─ 008-teacher-subscriptions.sql

🚨 Fixes RLS:
└─ FIX-RLS-POLICIES-FINAL.sql
```

---

## 🗂️ ARCHITECTURE DONNÉES

### Relations Clés
```
users (Auth)
  ↓ teacher_id
classrooms
  ↓ classroom_id
courses (programmes)
  ↓ course_id
chapters
  ↓ chapter_id
lessons
  ↓ lesson_id
qcm_questions

enrollments:
├─ student_id → users
├─ course_id → courses      ← IMPORTANT!
└─ classroom_id → classrooms (legacy)
```

### ⚠️ ATTENTION

**Enrollments utilisent `course_id`, PAS `classroom_id`!**

```typescript
// ❌ INCORRECT
.eq('classroom_id', classroomId)

// ✅ CORRECT
.eq('course_id', courseId)
```

**Chapters utilisent `course_id`, PAS `classroom_id`!**

```typescript
// ❌ INCORRECT
.from('chapters')
.eq('classroom_id', classroomId)

// ✅ CORRECT
.from('chapters')
.eq('course_id', courseId)
```

---

## 🔐 RLS POLICIES CRITIQUES

### Courses: Public + Enrolled
```sql
-- Students peuvent voir:
-- 1. Courses publics (classroom.is_public = true)
-- 2. OU courses auxquels ils sont inscrits
CREATE POLICY "Anyone can view public classroom courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classrooms c
    WHERE c.id = courses.classroom_id
    AND (c.is_public = true OR c.teacher_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.course_id = courses.id
    AND e.student_id = auth.uid()
  )
);
```

### Lessons: Free Preview + Enrolled
```sql
-- Students peuvent voir:
-- 1. Lessons avec is_free_preview = true
-- 2. OU lessons des courses auxquels ils sont inscrits
CREATE POLICY "Students can view accessible lessons"
ON lessons FOR SELECT
USING (
  lessons.is_free_preview = true
  OR EXISTS (
    SELECT 1
    FROM chapters ch
    JOIN courses co ON co.id = ch.course_id
    JOIN enrollments e ON e.course_id = co.id
    WHERE ch.id = lessons.chapter_id
    AND e.student_id = auth.uid()
  )
);
```

---

## 🎯 FLOWS PRINCIPAUX

### Flow Teacher: Créer Cours

```
1. /teacher/classes/create
2. POST /api/classes → Classroom
3. POST /api/courses → Course + settings
4. POST /api/chapters → Chapitres
5. POST /api/lessons → Leçons
6. POST /api/courses/[id]/publish
```

### Flow Student: Acheter & Apprendre

```
1. /search ou /classroom/[id]
2. /checkout?course=[id]
3. POST /api/payments/[provider]/init
4. Provider payment page
5. Webhook → /api/webhook/[provider]
   ├─ Create Transaction
   ├─ Create Enrollment (course_id!)
   └─ Notify
6. /learn/[classroomId]
7. /lesson/[id] ou /quiz/[id]
```

### Flow Payment: Multi-Provider

```
PROVIDER      RÉGION              CALLBACK
───────────────────────────────────────────
Stripe        Europe              /api/webhook/stripe
Konnect       Tunisia             /api/webhook/konnect
Flouci        Tunisia             /api/webhook/flouci
CinetPay      West Africa         /api/webhook/cinetpay
```

---

## 🐛 DEBUGGING COMMUN

### "Student ne voit pas ses cours"

**Cause**: Enrollment sans `course_id` ou queries par `classroom_id`

**Fix**:
```sql
-- 1. Vérifier enrollment
SELECT * FROM enrollments WHERE student_id = '...' AND course_id IS NULL;

-- 2. Si NULL, migrer:
UPDATE enrollments
SET course_id = (SELECT id FROM courses WHERE classroom_id = enrollments.classroom_id LIMIT 1)
WHERE course_id IS NULL;

-- 3. Vérifier pages utilisent course_id, pas classroom_id
```

### "Student ne voit pas les prix"

**Cause**: RLS policy trop restrictive

**Fix**: Exécuter `FIX-RLS-POLICIES-FINAL.sql`

**Vérifier**:
```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'courses'
AND policyname LIKE '%public%';
-- Doit retourner 1 ligne
```

### "0 chapitres, 0 leçons"

**Cause**: Queries cherchent par `classroom_id` au lieu de `course_id`

**Fix**: Voir [FIX-STUDENT-COURSE-VISIBILITY.md](FIX-STUDENT-COURSE-VISIBILITY.md)

**Pages déjà corrigées**:
- ✅ `/student/my-courses`
- ✅ `/learn/[classroomId]`
- ✅ `/student/dashboard`

### "Quiz ne se sauvegarde pas"

**Cause**: RLS policy sur `lesson_quizzes` incorrecte

**Fix**: Exécuter `fix-quiz-rls-simple.sql`

**Vérifier join path**:
```
lessons → chapters → courses → classrooms → teacher_id
```

---

## 🚀 COMMANDES DEV

### Démarrer Dev Server
```bash
npm run dev
# ou
pnpm dev
```

### Build Production
```bash
npm run build
npm run start
```

### Linter
```bash
npm run lint
```

### Check Types
```bash
npx tsc --noEmit
```

---

## 📊 STATS SYSTÈME

### Compter Entités
```sql
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM classrooms) as classrooms,
  (SELECT COUNT(*) FROM courses) as courses,
  (SELECT COUNT(*) FROM chapters) as chapters,
  (SELECT COUNT(*) FROM lessons) as lessons,
  (SELECT COUNT(*) FROM enrollments) as enrollments,
  (SELECT COUNT(*) FROM transactions) as transactions;
```

### Activité Récente
```sql
-- Enrollments derniers 7 jours
SELECT DATE(enrolled_at) as date, COUNT(*) as enrollments
FROM enrollments
WHERE enrolled_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(enrolled_at)
ORDER BY date DESC;

-- Transactions derniers 7 jours
SELECT DATE(created_at) as date, COUNT(*) as transactions, SUM(amount_eur) as revenue_eur
FROM transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Top Teachers
```sql
SELECT
  u.display_name,
  COUNT(DISTINCT c.id) as classrooms,
  COUNT(DISTINCT co.id) as courses,
  COUNT(DISTINCT e.id) as students,
  COALESCE(SUM(t.amount_eur), 0) as revenue_eur
FROM users u
LEFT JOIN classrooms c ON c.teacher_id = u.id
LEFT JOIN courses co ON co.classroom_id = c.id
LEFT JOIN enrollments e ON e.course_id = co.id
LEFT JOIN transactions t ON t.teacher_id = u.id
WHERE u.role = 'teacher'
GROUP BY u.id, u.display_name
ORDER BY students DESC
LIMIT 10;
```

---

## 🔗 LIENS UTILES

### Documentation
- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)

### Dashboards
- **Supabase**: [app.supabase.com](https://app.supabase.com)
- **Stripe**: [dashboard.stripe.com](https://dashboard.stripe.com)
- **Vercel**: [vercel.com/dashboard](https://vercel.com/dashboard)

### Support
- GitHub Issues: [github.com/votre-repo/issues](https://github.com)
- Discord: [discord.gg/votre-serveur](https://discord.com)

---

## ✅ CHECKLIST POST-FIX

Après corrections critiques, vérifier:

- [ ] `/teacher/classrooms/new` redirige vers `/teacher/classes/create`
- [ ] Tous enrollments ont `course_id`
- [ ] RLS policies appliquées (test: student voit prix)
- [ ] Students voient leurs cours achetés
- [ ] Migrations 007 mergées en une seule
- [ ] Aucune query utilise `chapters.classroom_id`
- [ ] Health check retourne 0 problèmes critiques

**Commande de validation**:
```bash
# Dans Supabase SQL Editor
# Exécuter: scripts/quick-health-check.sql
# Résultat attendu: "🎉 EXCELLENT: Système en bonne santé"
```

---

**Dernière mise à jour**: 28 janvier 2026
**Version**: 1.0
**Maintenu par**: Jules Platform Team
