# 🗄️ GUIDE DE CONFIGURATION BASE DE DONNÉES

**Date**: 28 janvier 2026
**Problème détecté**: Table `enrollments` n'existe pas

---

## 🔍 DIAGNOSTIC

L'erreur `relation "enrollments" does not exist` indique que votre base de données Supabase n'a **pas encore été initialisée** avec le schéma complet.

### Étape 1: Confirmer l'état actuel

**Exécutez dans Supabase SQL Editor**:
```bash
# Ouvrir: https://app.supabase.com/project/[votre-project-id]/sql
# Exécuter: scripts/diagnose-database.sql
```

Cela vous montrera:
- Quelles tables existent
- Quelles tables manquent
- L'état général de votre DB

---

## 🚀 OPTION A: Setup Automatique (Recommandé)

Si vous voulez un setup complet rapide, utilisez cette commande unique:

### 1. Créer le fichier de setup complet

Créez un fichier `supabase-complete-setup.sql` avec ce contenu:

```sql
-- ============================================================================
-- SETUP COMPLET - Base de données Jules
-- ============================================================================
-- Ce fichier crée TOUTES les tables nécessaires en une seule fois
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'essentiel', 'premium')),
  plan_expires_at TIMESTAMPTZ,
  currency TEXT DEFAULT 'EUR',
  commission_rate NUMERIC DEFAULT 15.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. TEACHER_PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bio TEXT,
  subjects TEXT[],
  levels TEXT[],
  hourly_rate NUMERIC,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_hours INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id)
);

-- ============================================================================
-- 3. CLASSROOMS (Classes/Groupes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  level TEXT,
  price NUMERIC DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  max_students INTEGER,
  enrolled_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. COURSES (Programmes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  access_type TEXT DEFAULT 'free' CHECK (access_type IN ('free', 'premium')),
  enrolled_count INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. CHAPTERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  required_score INTEGER DEFAULT 75,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. LESSONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'video', 'pdf', 'slides', 'qcm', 'fill_in_blanks')),
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  video_url TEXT,
  presentation_id UUID,
  is_free_preview BOOLEAN DEFAULT false,
  is_chapter_validation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. ENROLLMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  payment_id UUID,
  payment_required BOOLEAN DEFAULT false,
  payment_completed_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- ============================================================================
-- 8. TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id),
  teacher_id UUID REFERENCES public.users(id),
  course_id UUID REFERENCES public.courses(id),
  payment_type TEXT NOT NULL,
  amount_eur NUMERIC NOT NULL,
  amount_local NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  exchange_rate NUMERIC DEFAULT 1.0,
  payment_provider TEXT,
  provider_transaction_id TEXT,
  provider_payment_intent TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  idempotency_key TEXT UNIQUE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. LESSON_QUIZZES (QCM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('qcm', 'fill_in_blanks')),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id)
);

-- ============================================================================
-- 10. QUIZ_SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score NUMERIC,
  passed BOOLEAN,
  time_spent INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. STUDENT_PROGRESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- ============================================================================
-- INDEXES pour performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_classroom ON public.courses(classroom_id);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON public.chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student ON public.transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON public.quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON public.student_progress(student_id);

-- ============================================================================
-- RLS POLICIES (Basic - à affiner)
-- ============================================================================

-- Users: Everyone can read, only own profile can update
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Classrooms: Public readable, teachers can manage theirs
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public classrooms readable" ON public.classrooms FOR SELECT USING (is_public = true OR teacher_id = auth.uid());
CREATE POLICY "Teachers manage own classrooms" ON public.classrooms FOR ALL USING (teacher_id = auth.uid());

-- Courses: Public readable if classroom public, or if enrolled
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public courses" ON public.courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = courses.classroom_id
    AND (c.is_public = true OR c.teacher_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = courses.id
    AND e.student_id = auth.uid()
  )
);

-- Chapters: Readable if course accessible
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chapters accessible via courses" ON public.chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses co
    JOIN public.classrooms cl ON cl.id = co.classroom_id
    WHERE co.id = chapters.course_id
    AND (cl.is_public = true OR cl.teacher_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = chapters.course_id
    AND e.student_id = auth.uid()
  )
);

-- Lessons: Readable if free preview OR enrolled
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons accessible" ON public.lessons FOR SELECT
USING (
  is_free_preview = true
  OR EXISTS (
    SELECT 1 FROM public.chapters ch
    JOIN public.courses co ON co.id = ch.course_id
    JOIN public.enrollments e ON e.course_id = co.id
    WHERE ch.id = lessons.chapter_id
    AND e.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.chapters ch
    JOIN public.courses co ON co.id = ch.course_id
    JOIN public.classrooms cl ON cl.id = co.classroom_id
    WHERE ch.id = lessons.chapter_id
    AND cl.teacher_id = auth.uid()
  )
);

-- Enrollments: Students see theirs, teachers see their students
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own enrollments" ON public.enrollments FOR SELECT
USING (student_id = auth.uid());
CREATE POLICY "Teachers view their enrollments" ON public.enrollments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms cl
    WHERE cl.id = enrollments.classroom_id
    AND cl.teacher_id = auth.uid()
  )
);

-- Lesson Quizzes: Teachers can manage, students can read if enrolled
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage lesson quizzes" ON public.lesson_quizzes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.courses co ON co.id = ch.course_id
    JOIN public.classrooms cl ON cl.id = co.classroom_id
    WHERE l.id = lesson_quizzes.lesson_id
    AND cl.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students read quizzes of enrolled courses" ON public.lesson_quizzes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.courses co ON co.id = ch.course_id
    JOIN public.enrollments e ON e.course_id = co.id
    WHERE l.id = lesson_quizzes.lesson_id
    AND e.student_id = auth.uid()
  )
);

-- ============================================================================
-- TRIGGERS pour updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================
SELECT
  '✅ Setup complet terminé!' as status,
  'Exécutez scripts/diagnose-database.sql pour vérifier' as next_step;
```

### 2. Exécuter le setup

**Dans Supabase SQL Editor**:
1. Copier tout le contenu de `supabase-complete-setup.sql`
2. Coller dans SQL Editor
3. Cliquer "Run"
4. Attendre la fin (peut prendre 30-60 secondes)

### 3. Vérifier

```sql
-- Exécuter dans SQL Editor:
-- scripts/diagnose-database.sql

-- Résultat attendu:
-- ✅ Toutes les tables existent
```

---

## 🔧 OPTION B: Migrations Progressives (Avancé)

Si vous préférez appliquer les migrations une par une:

### Ordre d'exécution

```bash
1. migrations/000-verify-schema.sql                    (Vérification)
2. migrations/001-multi-currency-stripe-connect.sql   (Paiements)
3. migrations/002-add-missing-columns.sql             (Colonnes)
4. migrations/003-unified-programme-model.sql         (Settings JSONB)
5. migrations/004-integrate-slides-into-lessons.sql   (Slides)
6. migrations/005-add-is-public-to-classrooms.sql     (Public/Privé)
7. migrations/006-course-level-enrollment.sql         (course_id)
8. migrations/007-complete-profile-FINAL.sql          (Profiles - merger les 3 x007)
9. migrations/008-teacher-subscriptions.sql           (Subscriptions)
```

### Exécution

Pour chaque migration:
1. Ouvrir le fichier dans votre éditeur
2. Copier le contenu
3. Coller dans Supabase SQL Editor
4. Run
5. Vérifier qu'il n'y a pas d'erreurs
6. Passer au suivant

---

## ❌ TROUBLESHOOTING

### Erreur: "relation already exists"

**Cause**: Table déjà créée

**Solution**: Commenter ou skipper cette partie du script

### Erreur: "column already exists"

**Cause**: Colonne déjà ajoutée

**Solution**:
```sql
-- Remplacer:
ALTER TABLE xxx ADD COLUMN yyy;

-- Par:
ALTER TABLE xxx ADD COLUMN IF NOT EXISTS yyy;
```

### Erreur: "permission denied"

**Cause**: RLS activé

**Solution**:
```sql
-- Temporairement désactiver RLS pour setup:
ALTER TABLE xxx DISABLE ROW LEVEL SECURITY;
-- ... faire les modifications ...
ALTER TABLE xxx ENABLE ROW LEVEL SECURITY;
```

---

## ✅ POST-SETUP

### 1. Vérifier que tout fonctionne

```bash
# Dans Supabase SQL Editor:
# Exécuter: scripts/quick-health-check.sql

# Résultat attendu:
# 🎉 EXCELLENT: Système en bonne santé
```

### 2. Créer un user test

```sql
-- Créer un teacher test (dans Supabase Auth UI):
-- Email: teacher@test.com
-- Password: Test123!

-- Puis assigner le rôle:
UPDATE public.users
SET role = 'teacher'
WHERE email = 'teacher@test.com';
```

### 3. Tester l'application

1. Se connecter comme teacher
2. Créer une classroom
3. Créer un course
4. Ajouter un chapitre et une leçon
5. Se connecter comme student et vérifier l'accès

---

## 📚 RESSOURCES

- [AUDIT-COMPLET-2026-01-28.md](AUDIT-COMPLET-2026-01-28.md) - Audit détaillé
- [ACTION-PLAN-IMMEDIATE.md](ACTION-PLAN-IMMEDIATE.md) - Plan d'action
- [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Référence rapide
- [scripts/diagnose-database.sql](scripts/diagnose-database.sql) - Diagnostic

---

**Créé**: 28 janvier 2026
**Status**: 🔴 CRITIQUE - DB non initialisée
**Priorité**: Setup immédiat requis
