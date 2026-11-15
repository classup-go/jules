-- =====================================================
-- Jules Class Go - Course Template System
-- Script de Création COMPLET
-- =====================================================
-- IMPORTANT: Exécutez d'abord supabase-course-template-cleanup.sql
--            pour nettoyer les anciennes tables si elles existent
-- =====================================================

-- Vérifier que la table users existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'La table "users" doit exister avant de créer les templates de cours';
  END IF;
END $$;

-- =====================================================
-- CRÉATION DES TABLES avec Foreign Keys
-- =====================================================

-- 1. course_templates (table principale)
CREATE TABLE course_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  level TEXT,
  subject TEXT NOT NULL,
  duration_weeks INTEGER DEFAULT 12,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. pedagogical_progressions
CREATE TABLE pedagogical_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_template_id UUID NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  objectives TEXT[] NOT NULL DEFAULT '{}',
  competences TEXT[] NOT NULL DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_template_id, week_number)
);

-- 3. lesson_contents
CREATE TABLE lesson_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video', 'text', 'pdf', 'slide')),
  title TEXT NOT NULL,
  content TEXT,
  content_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. course_summaries
CREATE TABLE course_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  important_concepts JSONB DEFAULT '[]',
  formulas JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. revision_sheets
CREATE TABLE revision_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  essential_concepts TEXT[] NOT NULL DEFAULT '{}',
  mnemonics JSONB DEFAULT '[]',
  quick_recap TEXT[] NOT NULL DEFAULT '{}',
  common_mistakes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. exercises
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('application', 'analysis', 'synthesis')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question TEXT NOT NULL,
  hints TEXT[] DEFAULT '{}',
  solution JSONB NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. qcm_questions
CREATE TABLE qcm_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  quiz_id UUID,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  passing_score INTEGER NOT NULL DEFAULT 60,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. homeworks
CREATE TABLE homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID NOT NULL REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
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

-- 10. homework_exercises (table de liaison)
CREATE TABLE homework_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES pour les performances
-- =====================================================

CREATE INDEX idx_course_templates_created_by ON course_templates(created_by);
CREATE INDEX idx_course_templates_subject ON course_templates(subject);
CREATE INDEX idx_course_templates_published ON course_templates(is_published);

CREATE INDEX idx_pedagogical_progressions_course ON pedagogical_progressions(course_template_id);
CREATE INDEX idx_pedagogical_progressions_week ON pedagogical_progressions(week_number);

CREATE INDEX idx_lesson_contents_progression ON lesson_contents(progression_id);
CREATE INDEX idx_course_summaries_progression ON course_summaries(progression_id);
CREATE INDEX idx_revision_sheets_progression ON revision_sheets(progression_id);

CREATE INDEX idx_exercises_progression ON exercises(progression_id);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);

CREATE INDEX idx_qcm_questions_progression ON qcm_questions(progression_id);
CREATE INDEX idx_qcm_questions_quiz ON qcm_questions(quiz_id);

CREATE INDEX idx_quizzes_progression ON quizzes(progression_id);
CREATE INDEX idx_homeworks_progression ON homeworks(progression_id);

CREATE INDEX idx_homework_exercises_homework ON homework_exercises(homework_id);
CREATE INDEX idx_homework_exercises_exercise ON homework_exercises(exercise_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
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

-- =====================================================
-- POLITIQUES RLS - course_templates
-- =====================================================

CREATE POLICY "Teachers create own templates"
  ON course_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers view own or published templates"
  ON course_templates FOR SELECT
  USING (auth.uid() = created_by OR is_published = true);

CREATE POLICY "Teachers update own templates"
  ON course_templates FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers delete own templates"
  ON course_templates FOR DELETE
  USING (auth.uid() = created_by);

-- =====================================================
-- POLITIQUES RLS - pedagogical_progressions
-- =====================================================

CREATE POLICY "Teachers manage own progressions"
  ON pedagogical_progressions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM course_templates
      WHERE id = pedagogical_progressions.course_template_id
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_templates
      WHERE id = pedagogical_progressions.course_template_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published progressions"
  ON pedagogical_progressions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_templates
      WHERE id = pedagogical_progressions.course_template_id
      AND is_published = true
    )
  );

-- =====================================================
-- POLITIQUES RLS - lesson_contents
-- =====================================================

CREATE POLICY "Teachers manage own lesson contents"
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

-- =====================================================
-- POLITIQUES RLS - course_summaries
-- =====================================================

CREATE POLICY "Teachers manage own summaries"
  ON course_summaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = course_summaries.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published summaries"
  ON course_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = course_summaries.progression_id
      AND ct.is_published = true
    )
  );

-- =====================================================
-- POLITIQUES RLS - revision_sheets
-- =====================================================

CREATE POLICY "Teachers manage own revision sheets"
  ON revision_sheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = revision_sheets.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published revision sheets"
  ON revision_sheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = revision_sheets.progression_id
      AND ct.is_published = true
    )
  );

-- =====================================================
-- POLITIQUES RLS - exercises
-- =====================================================

CREATE POLICY "Teachers manage own exercises"
  ON exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = exercises.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published exercises"
  ON exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = exercises.progression_id
      AND ct.is_published = true
    )
  );

-- =====================================================
-- POLITIQUES RLS - qcm_questions
-- =====================================================

CREATE POLICY "Teachers manage own qcm questions"
  ON qcm_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = qcm_questions.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published qcm questions"
  ON qcm_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = qcm_questions.progression_id
      AND ct.is_published = true
    )
  );

-- =====================================================
-- POLITIQUES RLS - quizzes
-- =====================================================

CREATE POLICY "Teachers manage own quizzes"
  ON quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = quizzes.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published quizzes"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = quizzes.progression_id
      AND ct.is_published = true
    )
  );

-- =====================================================
-- POLITIQUES RLS - homeworks
-- =====================================================

CREATE POLICY "Teachers manage own homeworks"
  ON homeworks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = homeworks.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view published homeworks"
  ON homeworks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = homeworks.progression_id
      AND ct.is_published = true
    )
  );

-- =====================================================
-- POLITIQUES RLS - homework_exercises
-- =====================================================

CREATE POLICY "Teachers manage own homework exercises"
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
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour dupliquer un template
CREATE OR REPLACE FUNCTION duplicate_course_template(
  template_id UUID,
  new_title TEXT
)
RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
  prog_record RECORD;
  new_prog_id UUID;
BEGIN
  -- Créer le nouveau template
  INSERT INTO course_templates (
    title, description, level, subject, duration_weeks, thumbnail_url, created_by
  )
  SELECT
    new_title, description, level, subject, duration_weeks, thumbnail_url, auth.uid()
  FROM course_templates
  WHERE id = template_id
  RETURNING id INTO new_template_id;

  -- Copier les progressions
  FOR prog_record IN
    SELECT * FROM pedagogical_progressions
    WHERE course_template_id = template_id
    ORDER BY week_number
  LOOP
    INSERT INTO pedagogical_progressions (
      course_template_id, week_number, title, objectives, competences, prerequisites, order_index
    )
    VALUES (
      new_template_id, prog_record.week_number, prog_record.title,
      prog_record.objectives, prog_record.competences, prog_record.prerequisites, prog_record.order_index
    )
    RETURNING id INTO new_prog_id;

    -- Copier les contenus de leçon
    INSERT INTO lesson_contents (
      progression_id, type, title, content, content_url, thumbnail_url, duration_minutes, order_index
    )
    SELECT
      new_prog_id, type, title, content, content_url, thumbnail_url, duration_minutes, order_index
    FROM lesson_contents
    WHERE progression_id = prog_record.id;

    -- Copier les exercices
    INSERT INTO exercises (
      progression_id, type, difficulty, question, hints, solution, points, order_index
    )
    SELECT
      new_prog_id, type, difficulty, question, hints, solution, points, order_index
    FROM exercises
    WHERE progression_id = prog_record.id;
  END LOOP;

  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Toutes les tables ont été créées avec succès !';
  RAISE NOTICE '✅ 10 tables: course_templates, pedagogical_progressions, lesson_contents, course_summaries, revision_sheets, exercises, qcm_questions, quizzes, homeworks, homework_exercises';
  RAISE NOTICE '✅ Indexes créés pour les performances';
  RAISE NOTICE '✅ Row Level Security activé sur toutes les tables';
  RAISE NOTICE '✅ Politiques RLS configurées pour professeurs et étudiants';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Vous pouvez maintenant utiliser le système de templates de cours !';
  RAISE NOTICE '📖 Consultez COURSE-TEMPLATE-GUIDE.md pour plus d''informations';
END $$;
