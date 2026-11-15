-- ============================================================================
-- DIAGNOSTIC: État de la base de données
-- ============================================================================
-- Date: 2026-01-28
-- Usage: Exécuter dans Supabase SQL Editor pour identifier les tables existantes
-- ============================================================================

-- 1. LISTER TOUTES LES TABLES
-- ============================================================================
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. VÉRIFIER TABLES CRITIQUES
-- ============================================================================
SELECT
  'users' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
    THEN '✅ Existe' ELSE '❌ Manquante' END as status
UNION ALL
SELECT 'classrooms', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classrooms')
    THEN '✅ Existe' ELSE '❌ Manquante' END
UNION ALL
SELECT 'courses', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses')
    THEN '✅ Existe' ELSE '❌ Manquante' END
UNION ALL
SELECT 'chapters', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapters')
    THEN '✅ Existe' ELSE '❌ Manquante' END
UNION ALL
SELECT 'lessons', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons')
    THEN '✅ Existe' ELSE '❌ Manquante' END
UNION ALL
SELECT 'enrollments', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments')
    THEN '✅ Existe' ELSE '❌ Manquante' END
UNION ALL
SELECT 'transactions', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')
    THEN '✅ Existe' ELSE '❌ Manquante' END
UNION ALL
SELECT 'teacher_profiles', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_profiles')
    THEN '✅ Existe' ELSE '❌ Manquante' END;

-- 3. VÉRIFIER COLONNES DE ENROLLMENTS (si existe)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN
    RAISE NOTICE 'Table enrollments existe, colonnes:';
  ELSE
    RAISE NOTICE '❌ Table enrollments N''EXISTE PAS';
  END IF;
END $$;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;

-- 4. VÉRIFIER COLONNES DE CHAPTERS (si existe)
-- ============================================================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'chapters'
ORDER BY ordinal_position;

-- 5. VÉRIFIER SI C'EST UN TYPO (enrolment vs enrollment)
-- ============================================================================
SELECT
  table_name
FROM information_schema.tables
WHERE table_name LIKE '%enrol%'
   OR table_name LIKE '%student%'
   OR table_name LIKE '%subscription%';

-- 6. COMPTER LES TABLES SUPABASE AUTH
-- ============================================================================
SELECT
  COUNT(*) as auth_tables_count
FROM information_schema.tables
WHERE table_schema = 'auth';

-- 7. VÉRIFIER EXTENSIONS
-- ============================================================================
SELECT
  extname as extension_name,
  extversion as version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pgjwt');

-- ============================================================================
-- DIAGNOSTIC RÉSUMÉ
-- ============================================================================
SELECT
  '═══════════════════════════════════════' as separator,
  'DIAGNOSTIC DATABASE' as title,
  '═══════════════════════════════════════' as separator2;

WITH table_check AS (
  SELECT
    COUNT(*) FILTER (WHERE table_name = 'users') as has_users,
    COUNT(*) FILTER (WHERE table_name = 'classrooms') as has_classrooms,
    COUNT(*) FILTER (WHERE table_name = 'courses') as has_courses,
    COUNT(*) FILTER (WHERE table_name = 'enrollments') as has_enrollments
  FROM information_schema.tables
  WHERE table_schema = 'public'
)
SELECT
  CASE
    WHEN has_enrollments = 0 THEN '❌ CRITIQUE: Table enrollments manquante'
    WHEN has_courses = 0 THEN '❌ CRITIQUE: Tables principales manquantes'
    WHEN has_classrooms = 0 THEN '❌ CRITIQUE: Tables principales manquantes'
    ELSE '✅ Tables principales présentes'
  END as status,
  CASE
    WHEN has_enrollments = 0 THEN 'Exécuter les migrations (voir ci-dessous)'
    ELSE 'Base de données configurée'
  END as action
FROM table_check;

-- ============================================================================
-- INSTRUCTIONS SI TABLES MANQUANTES
-- ============================================================================
-- Si enrollments n'existe PAS, vous devez:
--
-- 1. Vérifier que vous êtes sur le bon projet Supabase
-- 2. Exécuter les migrations dans l'ordre:
--    - migrations/000-verify-schema.sql
--    - migrations/001-multi-currency.sql
--    - migrations/002-add-missing-columns.sql
--    - migrations/003-unified-programme-model.sql
--    - migrations/004-integrate-slides.sql
--    - migrations/005-add-is-public.sql
--    - migrations/006-course-level-enrollment.sql
--    - migrations/007-complete-profile-FINAL.sql
--    - migrations/008-teacher-subscriptions.sql
--
-- 3. OU exécuter un fichier de setup complet (si disponible)
--
-- Si enrollments EXISTE mais query échoue:
-- - Vérifiez que vous exécutez dans le bon schéma (public)
-- - Vérifiez les permissions RLS
-- ============================================================================
