-- ============================================================================
-- FIX: Créer des courses par défaut pour les classrooms sans courses
-- ============================================================================
-- Date: 2026-01-28
-- Problème: Classrooms existent mais n'ont pas de courses
-- Solution: Créer un course par défaut pour chaque classroom
-- ============================================================================

-- 1. État AVANT: Voir les classrooms sans courses
SELECT
  'AVANT: Classrooms sans courses' as phase,
  cl.id as classroom_id,
  cl.title as classroom_title,
  cl.teacher_id,
  COUNT(e.id) as enrollments_waiting
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
LEFT JOIN enrollments e ON e.classroom_id = cl.id
WHERE c.id IS NULL
AND cl.id IN (SELECT DISTINCT classroom_id FROM enrollments)
GROUP BY cl.id, cl.title, cl.teacher_id;

-- 2. Créer un course par défaut pour chaque classroom sans course
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
  cl.id as classroom_id,
  cl.title as title,  -- Même titre que la classroom
  'Course créé automatiquement pour migration des enrollments.' as description,
  jsonb_build_object(
    'duration_minutes', 60,
    'level', 'beginner',
    'language', 'fr'
  ) as settings,
  true as is_published,  -- Publié pour que les students puissent y accéder
  NOW() as created_at,
  NOW() as updated_at
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
WHERE c.id IS NULL  -- Classroom sans course
AND cl.id IN (
  SELECT DISTINCT classroom_id FROM enrollments
)
RETURNING id, title, classroom_id;

-- 3. État APRÈS: Vérifier que les courses ont été créés
SELECT
  'APRÈS: Courses créés' as phase,
  cl.id as classroom_id,
  cl.title as classroom_title,
  COUNT(DISTINCT c.id) as courses_count,
  ARRAY_AGG(c.title) as course_titles
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
WHERE cl.id IN (SELECT DISTINCT classroom_id FROM enrollments)
GROUP BY cl.id, cl.title;

-- 4. Re-mapper les enrollments vers les nouveaux courses
UPDATE enrollments e
SET
  course_id = (
    SELECT id
    FROM courses
    WHERE classroom_id = e.classroom_id
    ORDER BY created_at
    LIMIT 1
  ),
  updated_at = NOW()
WHERE (course_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM courses WHERE id = e.course_id
))
AND classroom_id IS NOT NULL;

-- 5. Vérifier le résultat final
SELECT
  'VÉRIFICATION FINALE' as phase,
  e.id as enrollment_id,
  e.student_id,
  cl.title as classroom_title,
  c.title as course_title,
  CASE
    WHEN e.course_id IS NULL THEN '❌ Pas de course_id'
    WHEN c.id IS NULL THEN '❌ Course invalide'
    ELSE '✅ OK'
  END as status
FROM enrollments e
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
LEFT JOIN courses c ON c.id = e.course_id
ORDER BY e.created_at;

-- 6. Test: Simuler la query student
SELECT
  'TEST STUDENT ACCESS' as test_name,
  e.student_id,
  u.email as student_email,
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  COUNT(DISTINCT ch.id) as accessible_chapters,
  COUNT(DISTINCT l.id) as accessible_lessons
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN courses co ON co.id = e.course_id
LEFT JOIN chapters ch ON ch.course_id = co.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE e.course_id IS NOT NULL
GROUP BY e.student_id, u.email;

-- 7. RÉSUMÉ
DO $$
DECLARE
  v_courses_created INTEGER;
  v_enrollments_fixed INTEGER;
  v_enrollments_still_null INTEGER;
BEGIN
  -- Compter les courses créés aujourd'hui
  SELECT COUNT(*) INTO v_courses_created
  FROM courses
  WHERE DATE(created_at) = CURRENT_DATE;

  -- Compter les enrollments avec course_id
  SELECT COUNT(*) INTO v_enrollments_fixed
  FROM enrollments
  WHERE course_id IS NOT NULL;

  -- Compter les enrollments encore NULL
  SELECT COUNT(*) INTO v_enrollments_still_null
  FROM enrollments
  WHERE course_id IS NULL;

  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'RÉSUMÉ: CRÉATION COURSES PAR DÉFAUT';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Courses créés aujourd''hui: %', v_courses_created;
  RAISE NOTICE 'Enrollments avec course_id: %', v_enrollments_fixed;
  RAISE NOTICE 'Enrollments sans course_id: %', v_enrollments_still_null;
  RAISE NOTICE '';

  IF v_enrollments_still_null = 0 THEN
    RAISE NOTICE '✅ SUCCÈS: Tous les enrollments ont un course_id valide!';
    RAISE NOTICE '';
    RAISE NOTICE 'ATTENTION: Les courses créés n''ont PAS de contenu (chapters/lessons)';
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaines étapes pour chaque teacher:';
    RAISE NOTICE '1. Se connecter sur /teacher/dashboard';
    RAISE NOTICE '2. Aller sur /teacher/courses/[courseId]';
    RAISE NOTICE '3. Ajouter des chapitres (Chapters)';
    RAISE NOTICE '4. Ajouter des leçons (Lessons) dans chaque chapitre';
    RAISE NOTICE '5. Publier le contenu';
    RAISE NOTICE '';
    RAISE NOTICE 'Tant que le contenu n''est pas ajouté:';
    RAISE NOTICE '→ Students verront encore "0 chapitres, 0 leçons"';
  ELSE
    RAISE NOTICE '⚠️  ATTENTION: % enrollments sans course_id!', v_enrollments_still_null;
    RAISE NOTICE 'Vérifier: SELECT * FROM enrollments WHERE course_id IS NULL;';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;

-- 8. Aide pour les teachers: Voir leurs courses à remplir
SELECT
  '💡 AIDE TEACHERS: Courses à remplir' as info,
  cl.teacher_id,
  u.email as teacher_email,
  c.id as course_id,
  c.title as course_title,
  COUNT(DISTINCT e.id) as students_waiting,
  COUNT(DISTINCT ch.id) as chapters_count,
  COUNT(DISTINCT l.id) as lessons_count,
  CASE
    WHEN COUNT(DISTINCT ch.id) = 0 THEN '⚠️  Ajouter des chapitres'
    WHEN COUNT(DISTINCT l.id) = 0 THEN '⚠️  Ajouter des leçons'
    ELSE '✅ Contenu présent'
  END as status
FROM courses c
JOIN classrooms cl ON cl.id = c.classroom_id
JOIN users u ON u.id = cl.teacher_id
LEFT JOIN enrollments e ON e.course_id = c.id
LEFT JOIN chapters ch ON ch.course_id = c.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE DATE(c.created_at) = CURRENT_DATE
GROUP BY cl.teacher_id, u.email, c.id, c.title
ORDER BY students_waiting DESC;
