-- ============================================================================
-- DEBUG: Payment and Enrollment Issues
-- ============================================================================
-- Date: 2026-01-24
-- Purpose: Debug "Transaction introuvable" after successful payment
-- ============================================================================

-- ============================================================================
-- 1. VOIR TOUS LES ENROLLMENTS RÉCENTS
-- ============================================================================

SELECT
  e.id,
  e.student_id,
  e.course_id,
  e.classroom_id,
  e.status,
  e.payment_required,
  e.enrolled_at,
  u.email as student_email,
  u.display_name as student_name,
  c.title as course_title,
  cl.title as classroom_title
FROM enrollments e
LEFT JOIN users u ON u.id = e.student_id
LEFT JOIN courses c ON c.id = e.course_id
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
ORDER BY e.enrolled_at DESC
LIMIT 10;

-- ============================================================================
-- 2. VOIR TOUTES LES TRANSACTIONS RÉCENTES
-- ============================================================================

SELECT
  t.id,
  t.payment_type,
  t.student_id,
  t.teacher_id,
  t.amount_eur,
  t.amount_local,
  t.currency,
  t.status,
  t.created_at,
  t.metadata->>'course_id' as course_id,
  t.metadata->>'classroom_id' as classroom_id,
  u.email as student_email
FROM transactions t
LEFT JOIN users u ON u.id = t.student_id
WHERE t.payment_type = 'course_enrollment'
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. TROUVER LES PAIEMENTS SANS ENROLLMENT
-- ============================================================================

-- Paiements Stripe qui n'ont pas créé d'enrollment
SELECT
  t.id as transaction_id,
  t.student_id,
  t.metadata->>'course_id' as course_id,
  t.metadata->>'classroom_id' as classroom_id,
  t.created_at,
  t.status,
  CASE
    WHEN e.id IS NULL THEN '❌ PAS D''ENROLLMENT'
    ELSE '✅ Enrollment existe'
  END as enrollment_status
FROM transactions t
LEFT JOIN enrollments e ON (
  (t.metadata->>'course_id' IS NOT NULL AND e.course_id::text = t.metadata->>'course_id')
  OR
  (t.metadata->>'classroom_id' IS NOT NULL AND e.classroom_id::text = t.metadata->>'classroom_id')
) AND e.student_id = t.student_id
WHERE t.payment_type = 'course_enrollment'
  AND t.status = 'completed'
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- 4. VÉRIFIER UN ÉTUDIANT SPÉCIFIQUE
-- ============================================================================

-- Remplacez 'STUDENT_EMAIL_HERE' par l'email de l'étudiant
/*
WITH student_data AS (
  SELECT id FROM users WHERE email = 'STUDENT_EMAIL_HERE'
)
SELECT
  'Enrollments' as type,
  e.id,
  e.course_id,
  e.classroom_id,
  e.status,
  e.enrolled_at as date,
  c.title as course_title
FROM enrollments e
JOIN student_data s ON s.id = e.student_id
LEFT JOIN courses c ON c.id = e.course_id
UNION ALL
SELECT
  'Transactions' as type,
  t.id,
  t.metadata->>'course_id' as course_id,
  t.metadata->>'classroom_id' as classroom_id,
  t.status,
  t.created_at as date,
  NULL as course_title
FROM transactions t
JOIN student_data s ON s.id = t.student_id
WHERE t.payment_type = 'course_enrollment'
ORDER BY date DESC;
*/

-- ============================================================================
-- 5. VÉRIFIER UN COURS SPÉCIFIQUE
-- ============================================================================

-- Remplacez 'COURSE_ID_HERE' par l'ID du cours
/*
SELECT
  e.id as enrollment_id,
  e.student_id,
  u.email as student_email,
  u.display_name as student_name,
  e.status,
  e.enrolled_at,
  e.payment_required,
  c.title as course_title,
  c.price,
  c.access_type
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN courses c ON c.id = e.course_id
WHERE e.course_id = 'COURSE_ID_HERE'
ORDER BY e.enrolled_at DESC;
*/

-- ============================================================================
-- 6. CRÉER MANUELLEMENT UN ENROLLMENT (SI BESOIN)
-- ============================================================================

-- ⚠️ UTILISER SEULEMENT SI LE PAIEMENT A ÉTÉ FAIT MAIS PAS D'ENROLLMENT
-- Remplacez les valeurs avant d'exécuter

/*
INSERT INTO enrollments (
  student_id,
  course_id,
  classroom_id,
  status,
  payment_required,
  progress
) VALUES (
  'STUDENT_ID_HERE',     -- ID de l'étudiant
  'COURSE_ID_HERE',      -- ID du cours
  'CLASSROOM_ID_HERE',   -- ID de la classroom
  'active',              -- Statut
  true,                  -- Paiement requis
  0                      -- Progression
)
RETURNING *;
*/

-- ============================================================================
-- 7. STATISTIQUES GÉNÉRALES
-- ============================================================================

-- Vue d'ensemble
SELECT
  'Total Enrollments' as metric,
  COUNT(*) as count
FROM enrollments
UNION ALL
SELECT
  'Active Enrollments',
  COUNT(*)
FROM enrollments
WHERE status = 'active'
UNION ALL
SELECT
  'Total Transactions',
  COUNT(*)
FROM transactions
WHERE payment_type = 'course_enrollment'
UNION ALL
SELECT
  'Completed Transactions',
  COUNT(*)
FROM transactions
WHERE payment_type = 'course_enrollment'
  AND status = 'completed';

-- ============================================================================
-- 8. DÉTECTER LES PROBLÈMES COURANTS
-- ============================================================================

-- Enrollments en double pour le même étudiant et cours
SELECT
  course_id,
  classroom_id,
  student_id,
  COUNT(*) as duplicates,
  STRING_AGG(id::text, ', ') as enrollment_ids
FROM enrollments
GROUP BY course_id, classroom_id, student_id
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;

-- Courses sans classroom_id
SELECT
  c.id,
  c.title,
  c.classroom_id
FROM courses c
WHERE c.classroom_id IS NULL
LIMIT 10;

-- Enrollments avec course_id mais sans classroom_id
SELECT
  e.id,
  e.course_id,
  e.classroom_id,
  c.classroom_id as course_classroom_id,
  'UPDATE enrollments SET classroom_id = ''' || c.classroom_id || ''' WHERE id = ''' || e.id || ''';' as fix_sql
FROM enrollments e
JOIN courses c ON c.id = e.course_id
WHERE e.classroom_id IS NULL
  AND c.classroom_id IS NOT NULL
LIMIT 10;

-- ============================================================================
-- 9. LOGS UTILES POUR DEBUGGING
-- ============================================================================

-- Dernières activités par étudiant
SELECT
  u.email,
  u.display_name,
  (SELECT COUNT(*) FROM enrollments WHERE student_id = u.id) as enrollment_count,
  (SELECT COUNT(*) FROM transactions WHERE student_id = u.id AND payment_type = 'course_enrollment') as payment_count,
  (SELECT MAX(enrolled_at) FROM enrollments WHERE student_id = u.id) as last_enrollment,
  (SELECT MAX(created_at) FROM transactions WHERE student_id = u.id) as last_payment
FROM users u
WHERE u.role = 'student'
  AND (
    (SELECT COUNT(*) FROM enrollments WHERE student_id = u.id) > 0
    OR
    (SELECT COUNT(*) FROM transactions WHERE student_id = u.id) > 0
  )
ORDER BY last_enrollment DESC NULLS LAST, last_payment DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

SELECT '✅ Script de debug chargé. Exécutez les requêtes une par une.' as status;
