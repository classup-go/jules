-- ============================================================================
-- FIX: RLS Policy pour lesson_quizzes
-- ============================================================================
-- Date: 2026-01-24
-- Problème: Error saving quiz: {}
-- Solution: Simplifier la policy RLS
-- ============================================================================

-- Voir la structure actuelle de lessons
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name IN ('id', 'chapter_id', 'classroom_id', 'teacher_id')
ORDER BY ordinal_position;

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Teachers can manage their lesson quizzes" ON lesson_quizzes;

-- Créer une nouvelle policy simplifiée
-- Option 1: Si lessons a directement classroom_id
CREATE POLICY "Teachers can manage their lesson quizzes"
  ON lesson_quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN classrooms cl ON cl.id = l.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN classrooms cl ON cl.id = l.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  );

-- Tester la policy
-- Vérifier qu'un professeur peut maintenant insérer
SELECT 'Policy mise à jour. Testez à nouveau la création de quiz.' as status;

-- ============================================================================
-- Alternative: Si lessons n'a pas classroom_id directement
-- ============================================================================
/*
-- Décommentez cette version si la première ne fonctionne pas:

DROP POLICY IF EXISTS "Teachers can manage their lesson quizzes" ON lesson_quizzes;

CREATE POLICY "Teachers can manage their lesson quizzes"
  ON lesson_quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN classrooms cl ON cl.id = ch.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN classrooms cl ON cl.id = ch.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  );
*/
