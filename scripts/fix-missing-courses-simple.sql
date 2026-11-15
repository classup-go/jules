-- ============================================================================
-- FIX SIMPLIFIÉ: Créer courses manquants pour classrooms avec enrollments
-- ============================================================================
-- Date: 2026-01-28
-- ============================================================================

-- ÉTAPE 1: Identifier les classrooms qui ont des enrollments mais pas de courses
SELECT
  '📋 CLASSROOMS SANS COURSES (avec enrollments)' as info,
  cl.id as classroom_id,
  cl.title as classroom_title,
  cl.teacher_id,
  COUNT(DISTINCT e.id) as enrollments_count
FROM classrooms cl
INNER JOIN enrollments e ON e.classroom_id = cl.id
LEFT JOIN courses c ON c.classroom_id = cl.id
WHERE c.id IS NULL
GROUP BY cl.id, cl.title, cl.teacher_id
ORDER BY COUNT(e.id) DESC;

-- ÉTAPE 2: Créer un course pour chaque classroom sans course
WITH classrooms_needing_courses AS (
  SELECT DISTINCT
    cl.id as classroom_id,
    cl.title as classroom_title,
    cl.teacher_id
  FROM classrooms cl
  INNER JOIN enrollments e ON e.classroom_id = cl.id
  LEFT JOIN courses c ON c.classroom_id = cl.id
  WHERE c.id IS NULL
)
INSERT INTO courses (
  classroom_id,
  title,
  description,
  settings,
  is_published,
  created_at,
  updated_at
)
SELECT
  classroom_id,
  classroom_title || ' - Programme Principal' as title,
  'Course créé automatiquement lors de la migration du système d''enrollments. Le contenu pédagogique sera ajouté par le professeur.' as description,
  jsonb_build_object(
    'duration_minutes', 60,
    'level', 'intermediate',
    'language', 'fr',
    'created_automatically', true
  ) as settings,
  true as is_published,
  NOW() as created_at,
  NOW() as updated_at
FROM classrooms_needing_courses
RETURNING
  id as course_id,
  title as course_title,
  classroom_id;

-- ÉTAPE 3: Vérifier que tous les courses ont été créés
SELECT
  '✅ COURSES CRÉÉS' as info,
  cl.id as classroom_id,
  cl.title as classroom_title,
  COUNT(DISTINCT c.id) as courses_count,
  STRING_AGG(c.title, ', ') as course_titles
FROM classrooms cl
INNER JOIN enrollments e ON e.classroom_id = cl.id
LEFT JOIN courses c ON c.classroom_id = cl.id
GROUP BY cl.id, cl.title
ORDER BY courses_count ASC;

-- ÉTAPE 4: Mapper les enrollments avec course_id NULL vers les courses
UPDATE enrollments e
SET
  course_id = (
    SELECT c.id
    FROM courses c
    WHERE c.classroom_id = e.classroom_id
    ORDER BY c.created_at ASC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE e.course_id IS NULL
  AND e.classroom_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM courses c WHERE c.classroom_id = e.classroom_id
  );

-- ÉTAPE 5: Corriger les enrollments avec course_id invalide
UPDATE enrollments e
SET
  course_id = (
    SELECT c.id
    FROM courses c
    WHERE c.classroom_id = e.classroom_id
    ORDER BY c.created_at ASC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE e.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM courses c WHERE c.id = e.course_id
  )
  AND EXISTS (
    SELECT 1 FROM courses c WHERE c.classroom_id = e.classroom_id
  );

-- ÉTAPE 6: État final des enrollments
SELECT
  '📊 ÉTAT FINAL DES ENROLLMENTS' as info,
  COUNT(*) as total_enrollments,
  COUNT(*) FILTER (WHERE course_id IS NOT NULL) as with_course_id,
  COUNT(*) FILTER (WHERE course_id IS NULL) as without_course_id,
  COUNT(DISTINCT course_id) as unique_courses
FROM enrollments;

-- ÉTAPE 7: Détail des enrollments par student
SELECT
  '👥 ENROLLMENTS PAR STUDENT' as info,
  e.student_id,
  u.email as student_email,
  cl.title as classroom_title,
  c.title as course_title,
  CASE
    WHEN e.course_id IS NULL THEN '❌ Pas de course_id'
    WHEN c.id IS NULL THEN '❌ Course invalide'
    ELSE '✅ OK'
  END as status
FROM enrollments e
LEFT JOIN users u ON u.id = e.student_id
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
LEFT JOIN courses c ON c.id = e.course_id
ORDER BY u.email, cl.title;

-- ÉTAPE 8: Test d'accès student (avec chapters et lessons)
SELECT
  '🎓 TEST ACCÈS STUDENT' as info,
  e.student_id,
  u.email as student_email,
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  COUNT(DISTINCT ch.id) as accessible_chapters,
  COUNT(DISTINCT l.id) as accessible_lessons
FROM enrollments e
LEFT JOIN users u ON u.id = e.student_id
LEFT JOIN courses co ON co.id = e.course_id
LEFT JOIN chapters ch ON ch.course_id = co.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE e.course_id IS NOT NULL
GROUP BY e.student_id, u.email
ORDER BY u.email;

-- ÉTAPE 9: Résumé final
DO $$
DECLARE
  v_total_courses INTEGER;
  v_courses_created_today INTEGER;
  v_total_enrollments INTEGER;
  v_enrollments_ok INTEGER;
  v_enrollments_null INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_courses FROM courses;
  SELECT COUNT(*) INTO v_courses_created_today FROM courses WHERE DATE(created_at) = CURRENT_DATE;
  SELECT COUNT(*) INTO v_total_enrollments FROM enrollments;
  SELECT COUNT(*) INTO v_enrollments_ok FROM enrollments WHERE course_id IS NOT NULL;
  SELECT COUNT(*) INTO v_enrollments_null FROM enrollments WHERE course_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '              RÉSUMÉ DE LA MIGRATION';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Courses en base: % (dont % créés aujourd''hui)', v_total_courses, v_courses_created_today;
  RAISE NOTICE '👥 Enrollments total: %', v_total_enrollments;
  RAISE NOTICE '✅ Enrollments avec course_id valide: %', v_enrollments_ok;
  RAISE NOTICE '❌ Enrollments sans course_id: %', v_enrollments_null;
  RAISE NOTICE '';

  IF v_enrollments_null = 0 THEN
    RAISE NOTICE '✅ MIGRATION RÉUSSIE!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Les courses créés sont VIDES';
    RAISE NOTICE '   (0 chapters, 0 lessons)';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Prochaines étapes:';
    RAISE NOTICE '';
    RAISE NOTICE '   Pour chaque teacher:';
    RAISE NOTICE '   1. Se connecter sur /teacher/dashboard';
    RAISE NOTICE '   2. Cliquer sur le course';
    RAISE NOTICE '   3. Ajouter des chapitres (bouton "Nouveau chapitre")';
    RAISE NOTICE '   4. Pour chaque chapitre, ajouter des leçons';
    RAISE NOTICE '   5. (Optionnel) Créer un QCM à la fin d''un chapitre';
    RAISE NOTICE '';
    RAISE NOTICE '   Une fois le contenu ajouté:';
    RAISE NOTICE '   → Students pourront voir et suivre les cours!';
  ELSE
    RAISE NOTICE '⚠️  ATTENTION: % enrollments sans course_id', v_enrollments_null;
    RAISE NOTICE '';
    RAISE NOTICE '   Vérifier avec:';
    RAISE NOTICE '   SELECT * FROM enrollments WHERE course_id IS NULL;';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
