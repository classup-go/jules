-- ============================================================================
-- FIX: Publier les Cours Non Publiés
-- ============================================================================
-- Date: 2026-01-24
-- But: Résoudre le problème de 0 cours affichés dans la recherche
-- ============================================================================

-- ============================================================================
-- 1. DIAGNOSTIC: Voir l'état actuel des cours
-- ============================================================================

-- Compter les cours par statut de publication
SELECT
  is_published,
  COUNT(*) as count,
  STRING_AGG(title, ', ') as courses
FROM courses
GROUP BY is_published;

-- ============================================================================
-- 2. VOIR TOUS LES COURS AVEC LEUR STATUT
-- ============================================================================

SELECT
  c.id,
  c.title,
  c.price,
  c.access_type,
  c.is_published,
  c.subject,
  c.level,
  cl.title as classroom_title,
  u.display_name as teacher_name,
  c.created_at
FROM courses c
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
LEFT JOIN users u ON u.id = cl.teacher_id
ORDER BY c.created_at DESC;

-- ============================================================================
-- 3. PUBLIER TOUS LES COURS NON PUBLIÉS
-- ============================================================================

-- ⚠️ ATTENTION: Cela publiera TOUS les cours non publiés
-- Décommentez cette ligne pour exécuter:

UPDATE courses
SET is_published = true
WHERE is_published = false
RETURNING id, title, is_published;

-- ============================================================================
-- 4. VÉRIFICATION APRÈS UPDATE
-- ============================================================================

-- Compter les cours publiés
SELECT
  COUNT(*) as total_published_courses,
  COUNT(*) FILTER (WHERE price > 0) as paid_courses,
  COUNT(*) FILTER (WHERE access_type = 'free') as free_courses
FROM courses
WHERE is_published = true;

-- ============================================================================
-- 5. VOIR CE QUI SERA VISIBLE DANS LA RECHERCHE
-- ============================================================================

-- Cette requête simule ce que la page de recherche va récupérer
SELECT
  c.id,
  c.title,
  c.description,
  c.subject,
  c.level,
  c.price,
  c.access_type,
  c.enrolled_count,
  c.classroom_id,
  cl.id as classroom_id_check,
  cl.title as classroom_title,
  cl.teacher_id,
  u.id as teacher_id_check,
  u.display_name as teacher_name
FROM courses c
INNER JOIN classrooms cl ON cl.id = c.classroom_id
INNER JOIN users u ON u.id = cl.teacher_id
WHERE c.is_published = true
ORDER BY c.enrolled_count DESC;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

SELECT '✅ Exécutez UPDATE courses SET is_published = true pour publier les cours' as instruction;
