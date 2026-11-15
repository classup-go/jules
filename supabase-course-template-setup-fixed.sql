-- =====================================================
-- Jules Class Go - Course Template System (FIXED)
-- Système moderne de création de cours pédagogiques
-- =====================================================

-- IMPORTANT: Ce script nécessite que la table 'users' existe déjà
-- Si la table 'users' n'existe pas, commentez les lignes avec REFERENCES users(id)

-- =====================================================
-- PARTIE 1: CRÉATION DES TABLES
-- =====================================================

-- 1. TABLE: course_templates
CREATE TABLE IF NOT EXISTS course_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  level TEXT,
  subject TEXT NOT NULL,
  duration_weeks INTEGER DEFAULT 12,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL, -- Sera lié à users(id) après
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE: pedagogical_progressions
CREATE TABLE IF NOT EXISTS pedagogical_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_template_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  objectives TEXT[] NOT NULL DEFAULT '{}',
  competences TEXT[] NOT NULL DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_template_id, week_number)
);

-- 3. TABLE: lesson_contents
CREATE TABLE IF NOT EXISTS lesson_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'text', 'pdf', 'slide')),
  title TEXT NOT NULL,
  content TEXT,
  content_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE: course_summaries
CREATE TABLE IF NOT EXISTS course_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  important_concepts JSONB DEFAULT '[]',
  formulas JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLE: revision_sheets
CREATE TABLE IF NOT EXISTS revision_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL,
  essential_concepts TEXT[] NOT NULL DEFAULT '{}',
  mnemonics JSONB DEFAULT '[]',
  quick_recap TEXT[] NOT NULL DEFAULT '{}',
  common_mistakes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLE: exercises
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL,
  type TEXT CHECK (type IN ('application', 'analysis', 'synthesis')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question TEXT NOT NULL,
  hints TEXT[] DEFAULT '{}',
  solution JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABLE: qcm_questions
CREATE TABLE IF NOT EXISTS qcm_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL,
  quiz_id UUID,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLE: quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  passing_score INTEGER NOT NULL DEFAULT 60,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABLE: homeworks
CREATE TABLE IF NOT EXISTS homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  due_days INTEGER NOT NULL DEFAULT 7,
  max_points INTEGER NOT NULL DEFAULT 100,
  passing_grade INTEGER NOT NULL DEFAULT 60,
  rubric JSONB DEFAULT '[]',
  allow_late_submission BOOLEAN DEFAULT true,
  late_penalty_percent INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TABLE: homework_exercises
CREATE TABLE IF NOT EXISTS homework_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PARTIE 2: AJOUT DES FOREIGN KEYS
-- =====================================================

-- Ajouter les contraintes de clés étrangères après la création des tables
DO $$
BEGIN
  -- course_templates -> users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE course_templates
      DROP CONSTRAINT IF EXISTS course_templates_created_by_fkey;
    ALTER TABLE course_templates
      ADD CONSTRAINT course_templates_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- pedagogical_progressions -> course_templates
  ALTER TABLE pedagogical_progressions
    DROP CONSTRAINT IF EXISTS pedagogical_progressions_course_template_id_fkey;
  ALTER TABLE pedagogical_progressions
    ADD CONSTRAINT pedagogical_progressions_course_template_id_fkey
    FOREIGN KEY (course_template_id) REFERENCES course_templates(id) ON DELETE CASCADE;

  -- lesson_contents -> pedagogical_progressions
  ALTER TABLE lesson_contents
    DROP CONSTRAINT IF EXISTS lesson_contents_progression_id_fkey;
  ALTER TABLE lesson_contents
    ADD CONSTRAINT lesson_contents_progression_id_fkey
    FOREIGN KEY (progression_id) REFERENCES pedagogical_progressions(id) ON DELETE CASCADE;

  -- course_summaries -> pedagogical_progressions
  ALTER TABLE course_summaries
    DROP CONSTRAINT IF EXISTS course_summaries_progression_id_fkey;
  ALTER TABLE course_summaries
    ADD CONSTRAINT course_summaries_progression_id_fkey
    FOREIGN KEY (progression_id) REFERENCES pedagogical_progressions(id) ON DELETE CASCADE;

  -- revision_sheets -> pedagogical_progressions
  ALTER TABLE revision_sheets
    DROP CONSTRAINT IF EXISTS revision_sheets_progression_id_fkey;
  ALTER TABLE revision_sheets
    ADD CONSTRAINT revision_sheets_progression_id_fkey
    FOREIGN KEY (progression_id) REFERENCES pedagogical_progressions(id) ON DELETE CASCADE;

  -- exercises -> pedagogical_progressions
  ALTER TABLE exercises
    DROP CONSTRAINT IF EXISTS exercises_progression_id_fkey;
  ALTER TABLE exercises
    ADD CONSTRAINT exercises_progression_id_fkey
    FOREIGN KEY (progression_id) REFERENCES pedagogical_progressions(id) ON DELETE CASCADE;

  -- qcm_questions -> pedagogical_progressions
  ALTER TABLE qcm_questions
    DROP CONSTRAINT IF EXISTS qcm_questions_progression_id_fkey;
  ALTER TABLE qcm_questions
    ADD CONSTRAINT qcm_questions_progression_id_fkey
    FOREIGN KEY (progression_id) REFERENCES pedagogical_progressions(id) ON DELETE CASCADE;

  -- quizzes -> pedagogical_progressions
  ALTER TABLE quizzes
    DROP CONSTRAINT IF EXISTS quizzes_progression_id_fkey;
  ALTER TABLE quizzes
    ADD CONSTRAINT quizzes_progression_id_fkey
    FOREIGN KEY (progression_id) REFERENCES pedagogical_progressions(id) ON DELETE CASCADE;

  -- homeworks -> pedagogical_progressions
  ALTER TABLE homeworks
    DROP CONSTRAINT IF EXISTS homeworks_progression_id_fkey;
  ALTER TABLE homeworks
    ADD CONSTRAINT homeworks_progression_id_fkey
    FOREIGN KEY (progression_id) REFERENCES pedagogical_progressions(id) ON DELETE CASCADE;

  -- homework_exercises -> homeworks
  ALTER TABLE homework_exercises
    DROP CONSTRAINT IF EXISTS homework_exercises_homework_id_fkey;
  ALTER TABLE homework_exercises
    ADD CONSTRAINT homework_exercises_homework_id_fkey
    FOREIGN KEY (homework_id) REFERENCES homeworks(id) ON DELETE CASCADE;

  -- homework_exercises -> exercises
  ALTER TABLE homework_exercises
    DROP CONSTRAINT IF EXISTS homework_exercises_exercise_id_fkey;
  ALTER TABLE homework_exercises
    ADD CONSTRAINT homework_exercises_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

END $$;

-- =====================================================
-- PARTIE 3: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_course_templates_created_by ON course_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_course_templates_subject ON course_templates(subject);
CREATE INDEX IF NOT EXISTS idx_pedagogical_progressions_course ON pedagogical_progressions(course_template_id);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_progression ON lesson_contents(progression_id);
CREATE INDEX IF NOT EXISTS idx_exercises_progression ON exercises(progression_id);
CREATE INDEX IF NOT EXISTS idx_qcm_questions_progression ON qcm_questions(progression_id);
CREATE INDEX IF NOT EXISTS idx_qcm_questions_quiz ON qcm_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_progression ON quizzes(progression_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_progression ON homeworks(progression_id);

-- =====================================================
-- PARTIE 4: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers create templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers view own templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers update own templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers delete own templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers manage progressions" ON pedagogical_progressions;
DROP POLICY IF EXISTS "Teachers manage lesson contents" ON lesson_contents;
DROP POLICY IF EXISTS "Students view published lessons" ON lesson_contents;
DROP POLICY IF EXISTS "Teachers manage summaries" ON course_summaries;
DROP POLICY IF EXISTS "Teachers manage revision sheets" ON revision_sheets;
DROP POLICY IF EXISTS "Teachers manage exercises" ON exercises;
DROP POLICY IF EXISTS "Teachers manage qcm" ON qcm_questions;
DROP POLICY IF EXISTS "Teachers manage quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers manage homeworks" ON homeworks;
DROP POLICY IF EXISTS "Teachers manage homework exercises" ON homework_exercises;

-- Policies for course_templates
CREATE POLICY "Teachers create templates"
  ON course_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers view own templates"
  ON course_templates FOR SELECT
  USING (auth.uid() = created_by OR is_published = true);

CREATE POLICY "Teachers update own templates"
  ON course_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Teachers delete own templates"
  ON course_templates FOR DELETE
  USING (auth.uid() = created_by);

-- Policies for pedagogical_progressions
CREATE POLICY "Teachers manage progressions"
  ON pedagogical_progressions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM course_templates ct
      WHERE ct.id = pedagogical_progressions.course_template_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies for lesson_contents
CREATE POLICY "Teachers manage lesson contents"
  ON lesson_contents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = lesson_contents.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published lessons"
  ON lesson_contents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = lesson_contents.progression_id
      AND ct.is_published = true
    )
  );

-- Policies for course_summaries
CREATE POLICY "Teachers manage summaries"
  ON course_summaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = course_summaries.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies for revision_sheets
CREATE POLICY "Teachers manage revision sheets"
  ON revision_sheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = revision_sheets.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies for exercises
CREATE POLICY "Teachers manage exercises"
  ON exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = exercises.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies for qcm_questions
CREATE POLICY "Teachers manage qcm"
  ON qcm_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = qcm_questions.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies for quizzes
CREATE POLICY "Teachers manage quizzes"
  ON quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = quizzes.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies for homeworks
CREATE POLICY "Teachers manage homeworks"
  ON homeworks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = homeworks.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies for homework_exercises
CREATE POLICY "Teachers manage homework exercises"
  ON homework_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM homeworks h
      JOIN pedagogical_progressions pp ON pp.id = h.progression_id
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE h.id = homework_exercises.homework_id
      AND ct.created_by = auth.uid()
    )
  );

-- =====================================================
-- PARTIE 5: UTILITY FUNCTIONS
-- =====================================================

-- Function to duplicate a course template
CREATE OR REPLACE FUNCTION duplicate_course_template(
  template_id UUID,
  new_title TEXT
)
RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
BEGIN
  -- Create new template
  INSERT INTO course_templates (title, description, level, subject, duration_weeks, created_by)
  SELECT new_title, description, level, subject, duration_weeks, auth.uid()
  FROM course_templates
  WHERE id = template_id
  RETURNING id INTO new_template_id;

  -- Copy progressions and all related content
  -- (Implementation would go here)

  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Tables créées:
-- ✅ course_templates
-- ✅ pedagogical_progressions
-- ✅ lesson_contents
-- ✅ course_summaries
-- ✅ revision_sheets
-- ✅ exercises
-- ✅ qcm_questions
-- ✅ quizzes
-- ✅ homeworks
-- ✅ homework_exercises
--
-- Foreign keys, indexes, et RLS configurés
-- =====================================================
