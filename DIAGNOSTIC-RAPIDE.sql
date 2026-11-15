-- ═══════════════════════════════════════════════════════════════
-- DIAGNOSTIC RAPIDE DU SYSTÈME
-- Exécutez ce script dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

\echo '🔍 === DIAGNOSTIC 1 : Structure des tables ==='

-- Vérifier si course_id existe dans enrollments
SELECT
  EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'enrollments'
    AND column_name = 'course_id'
  ) as course_id_exists_in_enrollments;

-- Vérifier si enrolled_count existe dans courses
SELECT
  EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'courses'
    AND column_name = 'enrolled_count'
  ) as enrolled_count_exists_in_courses;

\echo ''
\echo '📊 === DIAGNOSTIC 2 : Données des cours ==='

-- Voir tous les cours avec leurs prix
SELECT
  c.id,
  c.title,
  c.price,
  c.access_type,
  c.created_at,
  cl.title as classroom_title,
  u.display_name as teacher_name
FROM courses c
LEFT JOIN classrooms cl ON c.classroom_id = cl.id
LEFT JOIN users u ON c.teacher_id = u.id
ORDER BY c.created_at DESC
LIMIT 10;

\echo ''
\echo '💰 === DIAGNOSTIC 3 : Statistiques des prix ==='

SELECT
  COUNT(*) as total_courses,
  COUNT(CASE WHEN price = 0 THEN 1 END) as prix_zero,
  COUNT(CASE WHEN price > 0 THEN 1 END) as prix_positif,
  MIN(price) as prix_min,
  MAX(price) as prix_max,
  ROUND(AVG(price)::numeric, 2) as prix_moyen,
  COUNT(CASE WHEN access_type = 'free' THEN 1 END) as cours_gratuits,
  COUNT(CASE WHEN access_type = 'premium' THEN 1 END) as cours_premium
FROM courses;

\echo ''
\echo '⚠️ === DIAGNOSTIC 4 : Incohérences ==='

-- Cours avec prix = 0 mais access_type = 'premium'
SELECT
  'Cours premium avec prix = 0' as issue,
  COUNT(*) as count
FROM courses
WHERE price = 0 AND access_type = 'premium';

-- Cours avec prix > 0 mais access_type = 'free'
SELECT
  'Cours gratuit avec prix > 0' as issue,
  COUNT(*) as count
FROM courses
WHERE price > 0 AND access_type = 'free';

\echo ''
\echo '👥 === DIAGNOSTIC 5 : Enrollments ==='

-- Enrollments récents
SELECT
  e.id,
  e.student_id,
  e.course_id,
  e.classroom_id,
  e.status,
  e.created_at,
  c.title as course_title,
  c.price as course_price
FROM enrollments e
LEFT JOIN courses c ON e.course_id = c.id
ORDER BY e.created_at DESC
LIMIT 10;

-- Statistiques enrollments
SELECT
  COUNT(*) as total_enrollments,
  COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as avec_course_id,
  COUNT(CASE WHEN course_id IS NULL THEN 1 END) as sans_course_id,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as actifs,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as annules
FROM enrollments;

\echo ''
\echo '💳 === DIAGNOSTIC 6 : Transactions ==='

-- Transactions récentes
SELECT
  t.id,
  t.student_id,
  t.amount_eur,
  t.amount_local,
  t.currency,
  t.status,
  t.created_at,
  t.metadata->>'course_id' as course_id_metadata
FROM transactions t
ORDER BY t.created_at DESC
LIMIT 10;

-- Statistiques transactions
SELECT
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  SUM(CASE WHEN status = 'completed' THEN amount_eur ELSE 0 END) as total_eur_completed
FROM transactions;

\echo ''
\echo '🔐 === DIAGNOSTIC 7 : RLS Policies ==='

-- Vérifier les policies sur courses
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'courses';

\echo ''
\echo '✅ === FIN DU DIAGNOSTIC ==='
\echo ''
\echo 'INTERPRÉTATION :'
\echo '- Si course_id_exists_in_enrollments = false → Exécuter migration 006'
\echo '- Si prix_positif = 0 → Tous les cours sont gratuits (problème)'
\echo '- Si avec_course_id = 0 → Les enrollments n\'ont pas de course_id (problème)'
\echo '- Si policies est vide → Problème RLS à corriger'
