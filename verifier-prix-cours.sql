-- Vérifier les prix des cours dans la base de données
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Voir tous les cours avec leurs prix
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
LEFT JOIN users u ON cl.teacher_id = u.id
ORDER BY c.created_at DESC
LIMIT 20;

-- 2. Statistiques des prix
SELECT
  COUNT(*) as total_courses,
  COUNT(CASE WHEN price = 0 THEN 1 END) as prix_zero,
  COUNT(CASE WHEN price > 0 THEN 1 END) as prix_positif,
  MIN(price) as prix_min,
  MAX(price) as prix_max,
  AVG(price) as prix_moyen
FROM courses;

-- 3. Cours avec prix = 0 mais access_type = 'premium'
SELECT
  c.id,
  c.title,
  c.price,
  c.access_type,
  c.created_at
FROM courses c
WHERE c.price = 0 AND c.access_type = 'premium'
ORDER BY c.created_at DESC;

-- 4. Si vous voulez corriger un cours spécifique (remplacer COURSE_ID et PRIX)
-- UPDATE courses
-- SET price = 30
-- WHERE id = 'COURSE_ID';
