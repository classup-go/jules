-- ============================================================================
-- DIAGNOSTIC: Structure exacte de la table enrollments
-- ============================================================================

-- 1. Vérifier si la table existe
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments')
    THEN '✅ Table enrollments existe'
    ELSE '❌ Table enrollments N''EXISTE PAS'
  END as status;

-- 2. Voir TOUTES les colonnes de enrollments
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'enrollments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Voir les contraintes (foreign keys, etc.)
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'enrollments'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 4. Compter les enrollments existants
SELECT COUNT(*) as total_enrollments FROM enrollments;

-- 5. Sample des données (5 premières lignes)
SELECT * FROM enrollments LIMIT 5;
