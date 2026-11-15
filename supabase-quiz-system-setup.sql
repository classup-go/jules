-- ============================================================================
-- SYSTÈME DE QUIZ - Setup Base de Données
-- ============================================================================
-- Date: 2026-01-24
-- Description: Tables et policies pour le système de quiz (QCM et Texte à Trou)
-- ============================================================================

-- ============================================================================
-- 1. TABLE: lesson_quizzes
-- ============================================================================
-- Stocke les données de quiz pour chaque leçon

CREATE TABLE IF NOT EXISTS lesson_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('qcm', 'fill_in_blanks')),
  data JSONB NOT NULL, -- Stocke QCMData ou FillInBlanksData
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte : une seule leçon par quiz
  UNIQUE(lesson_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_lesson_id ON lesson_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_type ON lesson_quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_created ON lesson_quizzes(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_lesson_quizzes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_quizzes_updated_at
  BEFORE UPDATE ON lesson_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_quizzes_updated_at();

-- ============================================================================
-- 2. TABLE: quiz_submissions
-- ============================================================================
-- Stocke les soumissions des étudiants

CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('qcm', 'fill_in_blanks')),
  answers JSONB NOT NULL, -- Stocke les réponses de l'étudiant
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN NOT NULL,
  time_spent INTEGER, -- En secondes
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Permet plusieurs tentatives par étudiant
  CONSTRAINT unique_submission UNIQUE(lesson_id, student_id, submitted_at)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_lesson ON quiz_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_passed ON quiz_submissions(passed);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_score ON quiz_submissions(score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_submitted ON quiz_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_composite ON quiz_submissions(lesson_id, student_id, submitted_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur les deux tables
ALTER TABLE lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3.1. RLS pour lesson_quizzes
-- ============================================================================

-- Policy: Professeurs peuvent tout faire sur leurs quiz
DROP POLICY IF EXISTS "Teachers can manage their lesson quizzes" ON lesson_quizzes;
CREATE POLICY "Teachers can manage their lesson quizzes"
  ON lesson_quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN courses c ON c.id = ch.course_id
      JOIN classrooms cl ON cl.id = c.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN courses c ON c.id = ch.course_id
      JOIN classrooms cl ON cl.id = c.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  );

-- Policy: Étudiants peuvent voir les quiz de leurs cours
DROP POLICY IF EXISTS "Students can view quizzes in their courses" ON lesson_quizzes;
CREATE POLICY "Students can view quizzes in their courses"
  ON lesson_quizzes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN courses c ON c.id = ch.course_id
      JOIN enrollments e ON e.course_id = c.id
      WHERE l.id = lesson_quizzes.lesson_id
      AND e.student_id = auth.uid()
      AND e.status = 'active'
    )
  );

-- ============================================================================
-- 3.2. RLS pour quiz_submissions
-- ============================================================================

-- Policy: Étudiants peuvent soumettre leurs propres quiz
DROP POLICY IF EXISTS "Students can submit their quizzes" ON quiz_submissions;
CREATE POLICY "Students can submit their quizzes"
  ON quiz_submissions
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Policy: Étudiants peuvent voir leurs propres soumissions
DROP POLICY IF EXISTS "Students can view their submissions" ON quiz_submissions;
CREATE POLICY "Students can view their submissions"
  ON quiz_submissions
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: Professeurs peuvent voir les soumissions de leurs étudiants
DROP POLICY IF EXISTS "Teachers can view submissions for their lessons" ON quiz_submissions;
CREATE POLICY "Teachers can view submissions for their lessons"
  ON quiz_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN courses c ON c.id = ch.course_id
      JOIN classrooms cl ON cl.id = c.classroom_id
      WHERE l.id = quiz_submissions.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  );

-- Policy: Professeurs peuvent supprimer les soumissions de leurs leçons
DROP POLICY IF EXISTS "Teachers can delete submissions" ON quiz_submissions;
CREATE POLICY "Teachers can delete submissions"
  ON quiz_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN courses c ON c.id = ch.course_id
      JOIN classrooms cl ON cl.id = c.classroom_id
      WHERE l.id = quiz_submissions.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. FONCTIONS UTILITAIRES
-- ============================================================================

-- ============================================================================
-- 4.1. Fonction: Obtenir les statistiques d'un quiz
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quiz_stats(p_lesson_id UUID)
RETURNS TABLE (
  total_attempts BIGINT,
  passed_count BIGINT,
  failed_count BIGINT,
  average_score NUMERIC,
  average_time_minutes NUMERIC,
  students_completed BIGINT,
  best_score INTEGER,
  worst_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE passed = true) as passed_count,
    COUNT(*) FILTER (WHERE passed = false) as failed_count,
    ROUND(AVG(score), 2) as average_score,
    ROUND(AVG(time_spent) / 60.0, 2) as average_time_minutes,
    COUNT(DISTINCT student_id) as students_completed,
    MAX(score) as best_score,
    MIN(score) as worst_score
  FROM quiz_submissions
  WHERE lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4.2. Fonction: Obtenir le meilleur score d'un étudiant pour un quiz
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_best_score(p_lesson_id UUID, p_student_id UUID)
RETURNS TABLE (
  best_score INTEGER,
  passed BOOLEAN,
  time_spent INTEGER,
  submitted_at TIMESTAMPTZ,
  attempts_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.score as best_score,
    s.passed,
    s.time_spent,
    s.submitted_at,
    (SELECT COUNT(*) FROM quiz_submissions WHERE lesson_id = p_lesson_id AND student_id = p_student_id) as attempts_count
  FROM quiz_submissions s
  WHERE s.lesson_id = p_lesson_id
    AND s.student_id = p_student_id
  ORDER BY s.score DESC, s.submitted_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4.3. Fonction: Obtenir le classement des étudiants pour un quiz
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quiz_leaderboard(p_lesson_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  best_score INTEGER,
  time_spent INTEGER,
  submitted_at TIMESTAMPTZ,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH best_submissions AS (
    SELECT DISTINCT ON (s.student_id)
      s.student_id,
      s.score,
      s.time_spent,
      s.submitted_at
    FROM quiz_submissions s
    WHERE s.lesson_id = p_lesson_id
    ORDER BY s.student_id, s.score DESC, s.time_spent ASC, s.submitted_at ASC
  )
  SELECT
    bs.student_id,
    p.full_name as student_name,
    bs.score as best_score,
    bs.time_spent,
    bs.submitted_at,
    ROW_NUMBER() OVER (ORDER BY bs.score DESC, bs.time_spent ASC, bs.submitted_at ASC) as rank
  FROM best_submissions bs
  JOIN profiles p ON p.id = bs.student_id
  ORDER BY rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4.4. Fonction: Obtenir l'historique des tentatives d'un étudiant
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_quiz_history(p_lesson_id UUID, p_student_id UUID)
RETURNS TABLE (
  id UUID,
  score INTEGER,
  passed BOOLEAN,
  time_spent INTEGER,
  submitted_at TIMESTAMPTZ,
  attempt_number BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.score,
    s.passed,
    s.time_spent,
    s.submitted_at,
    ROW_NUMBER() OVER (ORDER BY s.submitted_at ASC) as attempt_number
  FROM quiz_submissions s
  WHERE s.lesson_id = p_lesson_id
    AND s.student_id = p_student_id
  ORDER BY s.submitted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. VUES UTILES
-- ============================================================================

-- ============================================================================
-- 5.1. Vue: Dernière tentative de chaque étudiant
-- ============================================================================

CREATE OR REPLACE VIEW latest_quiz_submissions AS
SELECT DISTINCT ON (lesson_id, student_id)
  s.*,
  p.full_name as student_name,
  p.email as student_email
FROM quiz_submissions s
JOIN profiles p ON p.id = s.student_id
ORDER BY lesson_id, student_id, submitted_at DESC;

-- ============================================================================
-- 5.2. Vue: Meilleures tentatives de chaque étudiant
-- ============================================================================

CREATE OR REPLACE VIEW best_quiz_submissions AS
SELECT DISTINCT ON (lesson_id, student_id)
  s.*,
  p.full_name as student_name,
  p.email as student_email
FROM quiz_submissions s
JOIN profiles p ON p.id = s.student_id
ORDER BY lesson_id, student_id, score DESC, time_spent ASC, submitted_at ASC;

-- ============================================================================
-- 6. DONNÉES DE TEST (Optionnel - Décommenter pour tester)
-- ============================================================================

/*
-- Insérer un QCM de test
INSERT INTO lesson_quizzes (lesson_id, quiz_type, data) VALUES (
  'VOTRE_LESSON_ID_ICI',
  'qcm',
  '{
    "title": "Quiz de Test - Mathématiques",
    "description": "Quiz de test pour valider le système",
    "questions": [
      {
        "id": "q1",
        "question": "Combien font 2 + 2 ?",
        "points": 1,
        "answers": [
          {"id": "a1", "text": "3", "isCorrect": false},
          {"id": "a2", "text": "4", "isCorrect": true},
          {"id": "a3", "text": "5", "isCorrect": false}
        ]
      }
    ],
    "passingScore": 60,
    "randomizeQuestions": false,
    "randomizeAnswers": false,
    "showCorrectAnswers": true,
    "allowRetry": true
  }'::jsonb
);

-- Insérer un Texte à Trou de test
INSERT INTO lesson_quizzes (lesson_id, quiz_type, data) VALUES (
  'VOTRE_LESSON_ID_ICI',
  'fill_in_blanks',
  '{
    "title": "Exercice de Test",
    "description": "Exercice de test pour valider le système",
    "text": "La capitale de la France est {{1}}.",
    "blanks": [
      {
        "id": "b1",
        "position": 1,
        "correctAnswers": ["Paris", "paris"],
        "hint": "Ville lumière",
        "points": 1
      }
    ],
    "caseSensitive": false,
    "acceptSynonyms": true,
    "showHints": true,
    "passingScore": 60,
    "allowRetry": true
  }'::jsonb
);
*/

-- ============================================================================
-- 7. VÉRIFICATION
-- ============================================================================

-- Vérifier que les tables existent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_quizzes') THEN
    RAISE NOTICE '✅ Table lesson_quizzes créée avec succès';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_submissions') THEN
    RAISE NOTICE '✅ Table quiz_submissions créée avec succès';
  END IF;

  RAISE NOTICE '✅ Setup du système de quiz terminé !';
END $$;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
