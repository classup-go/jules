-- ============================================================================
-- DIAGNOSTIC: Vérifier l'enrollment étudiant et la structure du cours
-- ============================================================================
-- Date: 2026-01-24
-- Problème: Étudiant voit "0 chapitres, 0 leçons" après paiement
-- ============================================================================

-- 1. Vérifier les enrollments de l'étudiant
-- Remplacez STUDENT_USER_ID par l'ID de l'étudiant
SELECT
  e.id,
  e.classroom_id,
  e.course_id,
  e.status,
  e.enrolled_at,
  cl.title as classroom_title,
  c.title as course_title
FROM enrollments e
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.student_id = 'STUDENT_USER_ID'  -- Remplacez par l'ID étudiant
ORDER BY e.enrolled_at DESC;

-- 2. Vérifier la structure du cours (chapters et lessons)
-- Remplacez COURSE_ID par le course_id de l'enrollment ci-dessus
SELECT
  'Course' as type,
  c.id,
  c.title,
  c.classroom_id,
  NULL::integer as order_index,
  NULL::text as chapter_title
FROM courses c
WHERE c.id = 'COURSE_ID'  -- Remplacez par le course_id

UNION ALL

SELECT
  'Chapter' as type,
  ch.id,
  'Chapter: ' || ch.title as title,
  NULL::uuid as classroom_id,
  ch.order_index,
  ch.title as chapter_title
FROM chapters ch
WHERE ch.course_id = 'COURSE_ID'  -- Remplacez par le course_id

UNION ALL

SELECT
  'Lesson' as type,
  l.id,
  '  └─ ' || l.title as title,
  NULL::uuid as classroom_id,
  l.order_index,
  ch.title as chapter_title
FROM lessons l
JOIN chapters ch ON ch.id = l.chapter_id
WHERE ch.course_id = 'COURSE_ID'  -- Remplacez par le course_id
ORDER BY chapter_title NULLS FIRST, order_index;

-- 3. Compter les chapitres et leçons par cours
SELECT
  c.id as course_id,
  c.title as course_title,
  COUNT(DISTINCT ch.id) as total_chapters,
  COUNT(DISTINCT l.id) as total_lessons
FROM courses c
LEFT JOIN chapters ch ON ch.course_id = c.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE c.id = 'COURSE_ID'  -- Remplacez par le course_id
GROUP BY c.id, c.title;

-- 4. Vérifier les RLS policies pour les students
-- Vérifier que les students peuvent lire les lessons
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('lessons', 'chapters', 'courses')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- 5. Test RLS: Simuler une requête étudiant
-- Remplacez COURSE_ID par le course_id de l'enrollment
SELECT
  'Chapters accessible' as test_name,
  COUNT(*) as count
FROM chapters
WHERE course_id = 'COURSE_ID';

SELECT
  'Lessons accessible' as test_name,
  COUNT(*) as count
FROM lessons l
JOIN chapters ch ON ch.id = l.chapter_id
WHERE ch.course_id = 'COURSE_ID';

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Exécutez la première requête pour obtenir l'ID étudiant (dans Supabase: Auth > Users)
-- 2. Remplacez 'STUDENT_USER_ID' par le vrai user ID de l'étudiant
-- 3. Notez le course_id de l'enrollment
-- 4. Remplacez 'COURSE_ID' dans toutes les autres requêtes par ce course_id
-- 5. Exécutez toutes les requêtes pour voir la structure
--
-- Résultat attendu:
-- - L'étudiant a un enrollment avec course_id non null
-- - Le cours a des chapters (total_chapters > 0)
-- - Les chapters ont des lessons (total_lessons > 0)
--
-- Si total_chapters = 0 ou total_lessons = 0:
-- → Le professeur n'a pas créé de contenu pour ce cours
-- → Ou les lessons/chapters ne sont pas liés correctement au cours
