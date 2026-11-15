-- ============================================================================
-- TEST: Système de Quiz (QCM et Texte à Trou)
-- ============================================================================
-- Date: 2026-01-24
-- Purpose: Vérifier que le système de quiz est opérationnel
-- ============================================================================

-- ============================================================================
-- 1. VÉRIFIER QUE LES TABLES EXISTENT
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_quizzes') THEN
    RAISE NOTICE '✅ Table lesson_quizzes existe';
  ELSE
    RAISE EXCEPTION '❌ Table lesson_quizzes manquante - Exécutez supabase-quiz-system-setup.sql';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_submissions') THEN
    RAISE NOTICE '✅ Table quiz_submissions existe';
  ELSE
    RAISE EXCEPTION '❌ Table quiz_submissions manquante - Exécutez supabase-quiz-system-setup.sql';
  END IF;
END $$;

-- ============================================================================
-- 2. VÉRIFIER LES INDEXES
-- ============================================================================

SELECT
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ Indexes pour lesson_quizzes OK (' || COUNT(*) || ' indexes)'
    ELSE '⚠️ Indexes manquants pour lesson_quizzes (' || COUNT(*) || ' trouvés, 3 attendus)'
  END as status
FROM pg_indexes
WHERE tablename = 'lesson_quizzes';

SELECT
  CASE
    WHEN COUNT(*) >= 6 THEN '✅ Indexes pour quiz_submissions OK (' || COUNT(*) || ' indexes)'
    ELSE '⚠️ Indexes manquants pour quiz_submissions (' || COUNT(*) || ' trouvés, 6 attendus)'
  END as status
FROM pg_indexes
WHERE tablename = 'quiz_submissions';

-- ============================================================================
-- 3. VÉRIFIER LES RLS POLICIES
-- ============================================================================

-- Policies pour lesson_quizzes
SELECT
  '✅ Policy: ' || policyname || ' (' || cmd || ')' as status
FROM pg_policies
WHERE tablename = 'lesson_quizzes'
ORDER BY policyname;

-- Policies pour quiz_submissions
SELECT
  '✅ Policy: ' || policyname || ' (' || cmd || ')' as status
FROM pg_policies
WHERE tablename = 'quiz_submissions'
ORDER BY policyname;

-- ============================================================================
-- 4. VÉRIFIER LES FONCTIONS
-- ============================================================================

SELECT
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ Fonctions utilitaires créées (' || COUNT(*) || ' fonctions)'
    ELSE '⚠️ Certaines fonctions manquent (' || COUNT(*) || ' trouvées, 4 attendues)'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_quiz_stats',
    'get_student_best_score',
    'get_quiz_leaderboard',
    'get_student_quiz_history'
  );

-- Liste des fonctions créées
SELECT
  '✅ Fonction: ' || proname as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%quiz%'
ORDER BY proname;

-- ============================================================================
-- 5. VÉRIFIER LES VUES
-- ============================================================================

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'latest_quiz_submissions')
    THEN '✅ Vue latest_quiz_submissions existe'
    ELSE '⚠️ Vue latest_quiz_submissions manquante'
  END as status;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'best_quiz_submissions')
    THEN '✅ Vue best_quiz_submissions existe'
    ELSE '⚠️ Vue best_quiz_submissions manquante'
  END as status;

-- ============================================================================
-- 6. STATISTIQUES ACTUELLES
-- ============================================================================

-- Nombre de quiz créés
SELECT
  COUNT(*) as total_quizzes,
  COUNT(*) FILTER (WHERE quiz_type = 'qcm') as qcm_count,
  COUNT(*) FILTER (WHERE quiz_type = 'fill_in_blanks') as fill_in_blanks_count
FROM lesson_quizzes;

-- Nombre de soumissions
SELECT
  COUNT(*) as total_submissions,
  COUNT(*) FILTER (WHERE passed = true) as passed_count,
  COUNT(*) FILTER (WHERE passed = false) as failed_count,
  ROUND(AVG(score), 2) as average_score
FROM quiz_submissions;

-- ============================================================================
-- 7. TESTER L'INSERTION (Simulation)
-- ============================================================================

-- Test: Peut-on insérer un quiz QCM?
DO $$
DECLARE
  test_lesson_id UUID := '00000000-0000-0000-0000-000000000001';
  test_quiz_data JSONB := '{
    "title": "Test QCM",
    "questions": [
      {
        "id": "q1",
        "question": "Test question?",
        "points": 1,
        "answers": [
          {"id": "a1", "text": "Answer 1", "isCorrect": false},
          {"id": "a2", "text": "Answer 2", "isCorrect": true}
        ]
      }
    ],
    "passingScore": 60,
    "showCorrectAnswers": true,
    "allowRetry": true
  }';
BEGIN
  -- Cette insertion va échouer si la lesson n'existe pas, mais ça teste la structure
  BEGIN
    INSERT INTO lesson_quizzes (lesson_id, quiz_type, data)
    VALUES (test_lesson_id, 'qcm', test_quiz_data);

    -- Si ça marche, supprimer immédiatement
    DELETE FROM lesson_quizzes WHERE lesson_id = test_lesson_id;

    RAISE NOTICE '✅ Structure de lesson_quizzes valide (test insertion OK)';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE '✅ Structure de lesson_quizzes valide (foreign key attendue)';
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Problème avec la structure de lesson_quizzes: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- 8. QUIZ PAR TYPE
-- ============================================================================

SELECT
  quiz_type,
  COUNT(*) as count,
  ROUND(AVG(COALESCE((data->>'passingScore')::int, 0)), 2) as avg_passing_score
FROM lesson_quizzes
GROUP BY quiz_type;

-- ============================================================================
-- 9. TOP 10 LESSONS AVEC QUIZ
-- ============================================================================

SELECT
  l.title as lesson_title,
  lq.quiz_type,
  lq.data->>'title' as quiz_title,
  (SELECT COUNT(*) FROM quiz_submissions WHERE lesson_id = l.id) as submission_count,
  lq.created_at
FROM lesson_quizzes lq
JOIN lessons l ON l.id = lq.lesson_id
ORDER BY lq.created_at DESC
LIMIT 10;

-- ============================================================================
-- 10. SOUMISSIONS RÉCENTES
-- ============================================================================

SELECT
  qs.id,
  u.email as student_email,
  l.title as lesson_title,
  qs.quiz_type,
  qs.score,
  qs.passed,
  qs.time_spent,
  qs.submitted_at
FROM quiz_submissions qs
LEFT JOIN users u ON u.id = qs.student_id
LEFT JOIN lessons l ON l.id = qs.lesson_id
ORDER BY qs.submitted_at DESC
LIMIT 10;

-- ============================================================================
-- 11. RÉSUMÉ FINAL
-- ============================================================================

DO $$
DECLARE
  quiz_count INT;
  submission_count INT;
  has_policies BOOLEAN;
  has_functions BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO quiz_count FROM lesson_quizzes;
  SELECT COUNT(*) INTO submission_count FROM quiz_submissions;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename IN ('lesson_quizzes', 'quiz_submissions')
  ) INTO has_policies;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname LIKE '%quiz%'
  ) INTO has_functions;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '                    RÉSUMÉ DU TEST';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Quiz créés:           %', quiz_count;
  RAISE NOTICE 'Soumissions:          %', submission_count;
  RAISE NOTICE 'RLS Policies:         %', CASE WHEN has_policies THEN '✅ Actives' ELSE '❌ Manquantes' END;
  RAISE NOTICE 'Fonctions:            %', CASE WHEN has_functions THEN '✅ Créées' ELSE '❌ Manquantes' END;
  RAISE NOTICE '';

  IF has_policies AND has_functions THEN
    RAISE NOTICE '🎉 Système de quiz opérationnel!';
  ELSE
    RAISE WARNING '⚠️  Système de quiz incomplet - Exécutez supabase-quiz-system-setup.sql';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DU TEST
-- ============================================================================
