-- ============================================================================
-- VÉRIFIER LES RLS POLICIES POUR LESSON_QUIZZES
-- ============================================================================

-- Voir toutes les policies pour lesson_quizzes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lesson_quizzes'
ORDER BY cmd, policyname;

-- Tester si un professeur peut insérer
-- ⚠️ Remplacez YOUR_USER_ID par votre vrai user ID (auth.uid())
DO $$
DECLARE
  test_user_id UUID := 'YOUR_USER_ID_HERE';  -- Remplacez par votre user ID
BEGIN
  -- Vérifier le rôle
  SELECT auth.uid();  -- Montre votre ID actuel

  RAISE NOTICE 'User ID: %', test_user_id;
END $$;

-- Vérifier la structure de la table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'lesson_quizzes'
ORDER BY ordinal_position;
