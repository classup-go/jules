-- ============================================================================
-- FIX RAPIDE: RLS Policy pour lesson_quizzes
-- ============================================================================

-- 1. Voir la structure de lessons
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name IN ('id', 'chapter_id', 'classroom_id')
ORDER BY ordinal_position;

-- 2. Supprimer et recréer la policy avec la bonne structure
DROP POLICY IF EXISTS "Teachers can manage their lesson quizzes" ON lesson_quizzes;

-- Policy qui fonctionne selon la structure actuelle de lessons
-- lessons a chapter_id → chapters a classroom_id → classrooms a teacher_id
CREATE POLICY "Teachers can manage their lesson quizzes"
  ON lesson_quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN courses co ON co.id = ch.course_id
      JOIN classrooms cl ON cl.id = co.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
        AND cl.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lessons l
      JOIN chapters ch ON ch.id = l.chapter_id
      JOIN courses co ON co.id = ch.course_id
      JOIN classrooms cl ON cl.id = co.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
        AND cl.teacher_id = auth.uid()
    )
  );

-- 3. Vérifier que ça fonctionne
SELECT
  'Policy mise à jour. Testez la création de quiz.' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'lesson_quizzes';
