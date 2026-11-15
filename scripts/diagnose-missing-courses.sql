-- ============================================================================
-- DIAGNOSTIC: Vérifier pourquoi les courses sont manquants
-- ============================================================================
-- Date: 2026-01-28
-- Problème: Migration réussie mais courses_count = 0
-- ============================================================================

-- 1. Compter les courses totaux dans la DB
SELECT
  '1. COURSES EN BASE' as check_name,
  COUNT(*) as total_courses
FROM courses;

-- 2. Voir les course_ids référencés par les enrollments
SELECT
  '2. COURSE_IDS DANS ENROLLMENTS' as check_name,
  course_id,
  COUNT(*) as enrollment_count
FROM enrollments
WHERE course_id IS NOT NULL
GROUP BY course_id;

-- 3. Vérifier si ces course_ids existent vraiment
SELECT
  '3. VALIDATION COURSE_IDS' as check_name,
  e.course_id,
  COUNT(e.id) as enrollment_count,
  CASE
    WHEN c.id IS NULL THEN '❌ COURSE N''EXISTE PAS'
    ELSE '✅ Course existe'
  END as status,
  c.title as course_title
FROM enrollments e
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.course_id IS NOT NULL
GROUP BY e.course_id, c.id, c.title;

-- 4. Voir les classrooms et leurs courses
SELECT
  '4. CLASSROOMS ET LEURS COURSES' as check_name,
  cl.id as classroom_id,
  cl.title as classroom_title,
  cl.teacher_id,
  COUNT(DISTINCT c.id) as courses_count,
  ARRAY_AGG(c.title) FILTER (WHERE c.id IS NOT NULL) as course_titles
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
WHERE cl.id IN (
  SELECT DISTINCT classroom_id FROM enrollments
)
GROUP BY cl.id, cl.title, cl.teacher_id;

-- 5. Voir les enrollments avec leurs données complètes
SELECT
  '5. ENROLLMENTS DÉTAILLÉS' as check_name,
  e.id as enrollment_id,
  e.student_id,
  e.classroom_id,
  cl.title as classroom_title,
  e.course_id,
  c.title as course_title,
  CASE
    WHEN e.course_id IS NULL THEN '❌ Pas de course_id'
    WHEN c.id IS NULL THEN '❌ Course n''existe pas'
    ELSE '✅ OK'
  END as status
FROM enrollments e
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
LEFT JOIN courses c ON c.id = e.course_id
ORDER BY e.created_at;

-- 6. Compter chapters et lessons par classroom
SELECT
  '6. CONTENU PAR CLASSROOM' as check_name,
  cl.id as classroom_id,
  cl.title as classroom_title,
  COUNT(DISTINCT c.id) as courses_count,
  COUNT(DISTINCT ch.id) as chapters_count,
  COUNT(DISTINCT l.id) as lessons_count
FROM classrooms cl
LEFT JOIN courses c ON c.classroom_id = cl.id
LEFT JOIN chapters ch ON ch.course_id = c.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE cl.id IN (
  SELECT DISTINCT classroom_id FROM enrollments
)
GROUP BY cl.id, cl.title;

-- 7. Si courses existent, voir pourquoi ils ne sont pas liés
SELECT
  '7. TOUS LES COURSES EN BASE' as check_name,
  c.id as course_id,
  c.title as course_title,
  c.classroom_id,
  cl.title as classroom_title,
  COUNT(DISTINCT e.id) as enrollments_count
FROM courses c
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
LEFT JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title, c.classroom_id, cl.title;

-- 8. RÉSUMÉ
DO $$
DECLARE
  v_total_courses INTEGER;
  v_total_enrollments INTEGER;
  v_enrollments_with_course INTEGER;
  v_valid_course_refs INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_courses FROM courses;
  SELECT COUNT(*) INTO v_total_enrollments FROM enrollments;
  SELECT COUNT(*) INTO v_enrollments_with_course FROM enrollments WHERE course_id IS NOT NULL;

  SELECT COUNT(*) INTO v_valid_course_refs
  FROM enrollments e
  WHERE e.course_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM courses WHERE id = e.course_id);

  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'DIAGNOSTIC: COURSES MANQUANTS';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Courses en base: %', v_total_courses;
  RAISE NOTICE 'Enrollments total: %', v_total_enrollments;
  RAISE NOTICE 'Enrollments avec course_id: %', v_enrollments_with_course;
  RAISE NOTICE 'Enrollments avec course_id VALIDE: %', v_valid_course_refs;
  RAISE NOTICE '';

  IF v_total_courses = 0 THEN
    RAISE NOTICE '❌ PROBLÈME: Aucun course en base!';
    RAISE NOTICE '';
    RAISE NOTICE 'CAUSE: Les teachers n''ont jamais créé de courses';
    RAISE NOTICE 'SOLUTION: Créer des courses pour chaque classroom';
    RAISE NOTICE '';
    RAISE NOTICE 'Options:';
    RAISE NOTICE '1. Créer manuellement via UI: /teacher/classes/create';
    RAISE NOTICE '2. Créer par SQL: voir scripts/create-default-courses.sql';
  ELSIF v_enrollments_with_course > v_valid_course_refs THEN
    RAISE NOTICE '⚠️  PROBLÈME: % enrollments pointent vers des courses inexistants!',
                 v_enrollments_with_course - v_valid_course_refs;
    RAISE NOTICE '';
    RAISE NOTICE 'CAUSE: Migration a créé des course_ids invalides';
    RAISE NOTICE 'SOLUTION: Réinitialiser les course_id à NULL';
  ELSE
    RAISE NOTICE '✅ Tous les enrollments pointent vers des courses valides';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;
