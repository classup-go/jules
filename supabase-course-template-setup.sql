-- =====================================================
-- Jules Class Go - Course Template System
-- Système moderne de création de cours pédagogiques
-- =====================================================

-- 1. TABLE: course_templates
-- Template principal du cours
-- =====================================================
CREATE TABLE IF NOT EXISTS course_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  level TEXT, -- 6eme, 5eme, etc.
  subject TEXT NOT NULL,
  duration_weeks INTEGER DEFAULT 12,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE: pedagogical_progressions
-- Progression pédagogique semaine par semaine
-- =====================================================
CREATE TABLE IF NOT EXISTS pedagogical_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_template_id UUID REFERENCES course_templates(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  objectives TEXT[] NOT NULL DEFAULT '{}', -- Objectifs d'apprentissage
  competences TEXT[] NOT NULL DEFAULT '{}', -- Compétences visées
  prerequisites TEXT[] DEFAULT '{}', -- Prérequis
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_template_id, week_number)
);

-- 3. TABLE: lesson_contents
-- Contenu des cours (vidéos, textes, PDFs)
-- =====================================================
CREATE TABLE IF NOT EXISTS lesson_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video', 'text', 'pdf', 'slide')),
  title TEXT NOT NULL,
  content TEXT, -- Contenu texte ou Markdown
  content_url TEXT, -- URL vidéo ou PDF
  thumbnail_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE: course_summaries
-- Résumés de cours
-- =====================================================
CREATE TABLE IF NOT EXISTS course_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  important_concepts JSONB DEFAULT '[]', -- [{concept, definition, example}]
  formulas JSONB DEFAULT '[]', -- [{name, formula, description}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLE: revision_sheets
-- Fiches de révision
-- =====================================================
CREATE TABLE IF NOT EXISTS revision_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  essential_concepts TEXT[] NOT NULL DEFAULT '{}',
  mnemonics JSONB DEFAULT '[]', -- [{concept, mnemonic}]
  quick_recap TEXT[] NOT NULL DEFAULT '{}',
  common_mistakes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLE: exercises
-- Exercices corrigés
-- =====================================================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('application', 'analysis', 'synthesis')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question TEXT NOT NULL,
  hints TEXT[] DEFAULT '{}',
  solution JSONB NOT NULL, -- {steps: [], answer: string, explanation: string}
  points INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABLE: qcm_questions
-- Questions QCM
-- =====================================================
CREATE TABLE IF NOT EXISTS qcm_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  quiz_id UUID, -- NULL si question individuelle
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{id, text, is_correct}]
  explanation TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLE: quizzes
-- Quiz complets
-- =====================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  passing_score INTEGER NOT NULL DEFAULT 60, -- Pourcentage
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABLE: homeworks
-- Devoirs à rendre
-- =====================================================
CREATE TABLE IF NOT EXISTS homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progression_id UUID REFERENCES pedagogical_progressions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  due_days INTEGER NOT NULL DEFAULT 7, -- Jours après la leçon
  max_points INTEGER NOT NULL DEFAULT 100,
  passing_grade INTEGER NOT NULL DEFAULT 60,
  rubric JSONB DEFAULT '[]', -- [{criterion, description, max_points}]
  allow_late_submission BOOLEAN DEFAULT true,
  late_penalty_percent INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TABLE: homework_exercises
-- Exercices du devoir
-- =====================================================
CREATE TABLE IF NOT EXISTS homework_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES homeworks(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
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

-- Policies: Teachers can manage their own templates
CREATE POLICY "Teachers create templates" ON course_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers view own templates" ON course_templates
  FOR SELECT USING (auth.uid() = created_by OR is_published = true);

CREATE POLICY "Teachers update own templates" ON course_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Teachers delete own templates" ON course_templates
  FOR DELETE USING (auth.uid() = created_by);

-- Policies: Teachers manage progressions
CREATE POLICY "Teachers manage progressions" ON pedagogical_progressions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_templates
      WHERE id = pedagogical_progressions.course_template_id
      AND created_by = auth.uid()
    )
  );

-- Policies: Teachers manage lesson contents
CREATE POLICY "Teachers manage lesson contents" ON lesson_contents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = lesson_contents.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- Policies: Students view published content
CREATE POLICY "Students view published lessons" ON lesson_contents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = lesson_contents.progression_id
      AND ct.is_published = true
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Teachers manage summaries" ON course_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = course_summaries.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage revision sheets" ON revision_sheets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = revision_sheets.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage exercises" ON exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = exercises.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage qcm" ON qcm_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = qcm_questions.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage quizzes" ON quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = quizzes.progression_id
      AND ct.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage homeworks" ON homeworks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedagogical_progressions pp
      JOIN course_templates ct ON ct.id = pp.course_template_id
      WHERE pp.id = homeworks.progression_id
      AND ct.created_by = auth.uid()
    )
  );

-- =====================================================
-- UTILITY FUNCTIONS
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
-- 1. course_templates - Templates de cours
-- 2. pedagogical_progressions - Progression pédagogique
-- 3. lesson_contents - Contenu des leçons
-- 4. course_summaries - Résumés
-- 5. revision_sheets - Fiches de révision
-- 6. exercises - Exercices corrigés
-- 7. qcm_questions - Questions QCM
-- 8. quizzes - Quiz complets
-- 9. homeworks - Devoirs
-- 10. homework_exercises - Lien exercices-devoirs
-- =====================================================
