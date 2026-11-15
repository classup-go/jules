-- ============================================================================
-- MIGRATION: Remplir les course_id manquants dans enrollments
-- ============================================================================
-- Date: 2026-01-28
-- Problème: Enrollments ont classroom_id mais course_id = NULL
-- Solution: Mapper chaque enrollment à son course via classroom_id
-- ============================================================================

-- 1. État AVANT migration
SELECT
  'AVANT MIGRATION' as phase,
  COUNT(*) as total_enrollments,
  COUNT(*) FILTER (WHERE course_id IS NOT NULL) as with_course_id,
  COUNT(*) FILTER (WHERE course_id IS NULL) as without_course_id
FROM enrollments;

-- 2. Voir quels enrollments seront affectés
SELECT
  e.id as enrollment_id,
  e.classroom_id,
  e.student_id,
  e.course_id as current_course_id,
  c.id as target_course_id,
  c.title as course_title,
  cl.title as classroom_title
FROM enrollments e
JOIN classrooms cl ON cl.id = e.classroom_id
LEFT JOIN courses c ON c.classroom_id = e.classroom_id
WHERE e.course_id IS NULL
ORDER BY e.created_at
LIMIT 10;

-- 3. MIGRATION: Mapper chaque enrollment à son course
-- Stratégie: Prendre le premier course de chaque classroom
UPDATE enrollments e
SET
  course_id = (
    SELECT id
    FROM courses
    WHERE classroom_id = e.classroom_id
    ORDER BY created_at  -- Prendre le premier cours créé
    LIMIT 1
  ),
  updated_at = NOW()
WHERE course_id IS NULL
AND classroom_id IS NOT NULL;

-- 4. État APRÈS migration
SELECT
  'APRÈS MIGRATION' as phase,
  COUNT(*) as total_enrollments,
  COUNT(*) FILTER (WHERE course_id IS NOT NULL) as with_course_id,
  COUNT(*) FILTER (WHERE course_id IS NULL) as without_course_id
FROM enrollments;

-- 5. Vérifier les enrollments migrés
SELECT
  e.id as enrollment_id,
  e.student_id,
  u.email as student_email,
  cl.title as classroom_title,
  c.title as course_title,
  e.status,
  e.enrolled_at
FROM enrollments e
JOIN users u ON u.id = e.student_id
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
LEFT JOIN courses c ON c.id = e.course_id
ORDER BY e.enrolled_at DESC
LIMIT 10;

-- 6. Identifier les problèmes potentiels
SELECT
  'PROBLÈMES DÉTECTÉS' as check_name,
  COUNT(*) FILTER (WHERE course_id IS NULL) as enrollments_sans_course,
  COUNT(*) FILTER (WHERE classroom_id IS NULL) as enrollments_sans_classroom,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM courses WHERE id = enrollments.course_id
  )) as enrollments_course_invalide
FROM enrollments;

-- 7. RÉSUMÉ ET ACTIONS
DO $$
DECLARE
  v_null_course_id INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_course_id FROM enrollments WHERE course_id IS NULL;
  SELECT COUNT(*) INTO v_total FROM enrollments;

  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'RÉSUMÉ MIGRATION ENROLLMENTS';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total enrollments: %', v_total;
  RAISE NOTICE 'Enrollments avec course_id: %', v_total - v_null_course_id;
  RAISE NOTICE 'Enrollments sans course_id: %', v_null_course_id;
  RAISE NOTICE '';

  IF v_null_course_id = 0 THEN
    RAISE NOTICE '✅ SUCCÈS: Tous les enrollments ont un course_id!';
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaines étapes:';
    RAISE NOTICE '1. Rafraîchir l''application (npm run dev)';
    RAISE NOTICE '2. Se connecter comme student';
    RAISE NOTICE '3. Aller sur /student/my-courses';
    RAISE NOTICE '4. Vérifier que les cours s''affichent avec leçons';
  ELSIF v_null_course_id > 0 THEN
    RAISE NOTICE '⚠️  ATTENTION: % enrollments sans course_id!', v_null_course_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Causes possibles:';
    RAISE NOTICE '- Classroom sans course associé';
    RAISE NOTICE '- Course supprimé';
    RAISE NOTICE '';
    RAISE NOTICE 'Actions:';
    RAISE NOTICE '1. Vérifier: SELECT * FROM enrollments WHERE course_id IS NULL;';
    RAISE NOTICE '2. Créer un course pour chaque classroom orphelin';
    RAISE NOTICE '3. Réexécuter ce script';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;

-- 8. Test final: Simuler une query student
-- Cette requête doit maintenant fonctionner!
SELECT
  'TEST: Query student courses' as test_name,
  e.student_id,
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  COUNT(DISTINCT ch.id) as accessible_chapters,
  COUNT(DISTINCT l.id) as accessible_lessons
FROM enrollments e
JOIN courses co ON co.id = e.course_id  -- Cette JOIN doit marcher!
LEFT JOIN chapters ch ON ch.course_id = co.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE e.course_id IS NOT NULL
GROUP BY e.student_id
LIMIT 5;
