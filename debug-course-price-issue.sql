-- ============================================================================
-- DEBUG: Course Price and Enrollment Issues
-- ============================================================================
-- Date: 2026-01-24
-- Purpose: Diagnose and fix course price display and checkout errors
-- ============================================================================

-- ============================================================================
-- 1. VÉRIFIER LES COURS EXISTANTS
-- ============================================================================

-- Afficher tous les cours avec leurs prix
SELECT
  c.id,
  c.title,
  c.price,
  c.access_type,
  c.is_published,
  c.classroom_id,
  cl.title as classroom_title,
  cl.teacher_id,
  c.created_at
FROM courses c
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
ORDER BY c.created_at DESC
LIMIT 20;

-- ============================================================================
-- 2. VÉRIFIER LES COURS AVEC PRIX = 0 MAIS ACCESS_TYPE = PREMIUM
-- ============================================================================

-- Identifier les cours problématiques
SELECT
  c.id,
  c.title,
  c.price,
  c.access_type,
  c.classroom_id,
  'PROBLÈME: Cours premium avec prix 0' as issue
FROM courses c
WHERE c.access_type = 'premium'
  AND (c.price IS NULL OR c.price = 0);

-- ============================================================================
-- 3. VÉRIFIER LES COURS NON PUBLIÉS
-- ============================================================================

-- Cours créés mais non publiés (invisibles dans la recherche)
SELECT
  c.id,
  c.title,
  c.price,
  c.is_published,
  c.access_type,
  c.created_at
FROM courses c
WHERE c.is_published = false
ORDER BY c.created_at DESC;

-- ============================================================================
-- 4. VÉRIFIER LES RELATIONS COURS-CLASSE-PROFESSEUR
-- ============================================================================

-- Vérifier que toutes les relations sont correctes
SELECT
  c.id as course_id,
  c.title as course_title,
  c.classroom_id,
  cl.id as classroom_id_check,
  cl.teacher_id,
  u.id as teacher_id_check,
  u.display_name as teacher_name,
  CASE
    WHEN cl.id IS NULL THEN '❌ Classroom manquante'
    WHEN u.id IS NULL THEN '❌ Teacher manquant'
    ELSE '✅ OK'
  END as status
FROM courses c
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
LEFT JOIN users u ON u.id = cl.teacher_id
ORDER BY c.created_at DESC
LIMIT 20;

-- ============================================================================
-- 5. CORRIGER LES COURS AVEC PRIX NULL
-- ============================================================================

-- Mettre à jour les cours avec prix NULL
-- ATTENTION: Décommentez seulement si nécessaire

/*
UPDATE courses
SET price = 0,
    access_type = 'free'
WHERE price IS NULL;
*/

-- ============================================================================
-- 6. PUBLIER LES COURS NON PUBLIÉS (si nécessaire)
-- ============================================================================

-- ATTENTION: Cela publiera TOUS les cours non publiés
-- Adaptez la condition WHERE selon vos besoins

/*
UPDATE courses
SET is_published = true
WHERE is_published = false
  AND price > 0;  -- Seulement les cours payants
*/

-- ============================================================================
-- 7. VÉRIFIER LES ENROLLMENTS EXISTANTS
-- ============================================================================

-- Voir les enrollments pour un cours spécifique
-- Remplacez 'COURSE_ID_HERE' par l'ID du cours problématique

/*
SELECT
  e.id,
  e.student_id,
  e.course_id,
  e.classroom_id,
  e.status,
  e.enrolled_at,
  u.display_name as student_name,
  u.email as student_email
FROM enrollments e
LEFT JOIN users u ON u.id = e.student_id
WHERE e.course_id = 'COURSE_ID_HERE'
ORDER BY e.enrolled_at DESC;
*/

-- ============================================================================
-- 8. TESTER UN COURS SPÉCIFIQUE
-- ============================================================================

-- Remplacez 'COURSE_ID_HERE' par l'ID du cours de la capture d'écran
-- (7309a915-1e22-4aef-848e-6c2db8e1ca8a)

/*
SELECT
  c.id,
  c.title,
  c.description,
  c.price,
  c.access_type,
  c.is_published,
  c.classroom_id,
  c.subject,
  c.level,
  c.enrolled_count,
  cl.title as classroom_title,
  cl.teacher_id,
  u.display_name as teacher_name,
  u.email as teacher_email
FROM courses c
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
LEFT JOIN users u ON u.id = cl.teacher_id
WHERE c.id = '7309a915-1e22-4aef-848e-6c2db8e1ca8a';
*/

-- ============================================================================
-- 9. CRÉER UN COURS DE TEST (si nécessaire)
-- ============================================================================

-- ATTENTION: Remplacez les valeurs par vos propres données

/*
INSERT INTO courses (
  classroom_id,
  title,
  description,
  subject,
  level,
  price,
  access_type,
  is_published,
  settings
) VALUES (
  'YOUR_CLASSROOM_ID',  -- Remplacez par un ID de classroom valide
  'Cours de Test - Mathématiques',
  'Un cours de test pour vérifier le système de paiement',
  'Mathématiques',
  'Terminale',
  50.00,
  'premium',
  true,
  '{"access_mode": "acces_individuel", "duration_type": "moyen", "pacing_type": "libre"}'::jsonb
)
RETURNING *;
*/

-- ============================================================================
-- 10. STATISTIQUES GÉNÉRALES
-- ============================================================================

-- Vue d'ensemble des cours
SELECT
  COUNT(*) as total_courses,
  COUNT(*) FILTER (WHERE is_published = true) as published_courses,
  COUNT(*) FILTER (WHERE access_type = 'free') as free_courses,
  COUNT(*) FILTER (WHERE access_type = 'premium') as premium_courses,
  COUNT(*) FILTER (WHERE price > 0) as paid_courses,
  ROUND(AVG(price), 2) as average_price,
  MAX(price) as max_price,
  MIN(price) FILTER (WHERE price > 0) as min_price_non_zero
FROM courses;

-- Cours par matière
SELECT
  subject,
  COUNT(*) as course_count,
  COUNT(*) FILTER (WHERE is_published = true) as published_count,
  ROUND(AVG(price), 2) as avg_price
FROM courses
GROUP BY subject
ORDER BY course_count DESC;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Exécutez d'abord les requêtes SELECT pour diagnostiquer le problème
-- 2. Notez les IDs des cours problématiques
-- 3. Décommentez et exécutez les UPDATE seulement si nécessaire
-- 4. Vérifiez à nouveau avec les requêtes SELECT

SELECT '✅ Script de debug chargé. Exécutez les requêtes une par une.' as status;
