-- =====================================================
-- VÉRIFICATION SCHÉMA BASE DE DONNÉES
-- =====================================================
-- À exécuter AVANT les migrations pour diagnostiquer
-- =====================================================

\echo '============================================'
\echo 'VÉRIFICATION DU SCHÉMA ACTUEL'
\echo '============================================'
\echo ''

-- =====================================================
-- 1. VÉRIFIER TABLES EXISTANTES
-- =====================================================

\echo '1. TABLES EXISTANTES:'
\echo ''

SELECT
  table_name,
  CASE
    WHEN table_name IN ('courses', 'chapters', 'lessons', 'presentations', 'slides', 'slide_blocks', 'profiles', 'enrollments')
    THEN '✅'
    ELSE '⚠️'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('courses', 'chapters', 'lessons', 'presentations', 'slides', 'slide_blocks', 'profiles', 'enrollments')
ORDER BY table_name;

\echo ''

-- =====================================================
-- 2. COLONNES DE LA TABLE COURSES
-- =====================================================

\echo '2. COLONNES TABLE courses:'
\echo ''

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('id', 'teacher_id', 'title', 'price', 'currency', 'created_at') THEN '✅ Core'
    WHEN column_name IN ('description', 'thumbnail', 'is_published', 'updated_at') THEN '📝 Mig 002'
    WHEN column_name IN ('settings', 'target_audience', 'enrolled_count', 'completion_rate', 'avg_rating') THEN '🎯 Mig 003'
    ELSE '➡️ Autre'
  END as migration
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;

\echo ''

-- =====================================================
-- 3. COLONNES DE LA TABLE LESSONS
-- =====================================================

\echo '3. COLONNES TABLE lessons:'
\echo ''

SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'chapter_id', 'title', 'duration_minutes', 'order_index', 'is_free_preview', 'created_at') THEN '✅ Core'
    WHEN column_name IN ('content', 'video_url', 'is_published', 'updated_at') THEN '📝 Mig 002'
    WHEN column_name = 'presentation_id' THEN '🎨 Mig 004'
    ELSE '➡️ Autre'
  END as migration
FROM information_schema.columns
WHERE table_name = 'lessons'
ORDER BY ordinal_position;

\echo ''

-- =====================================================
-- 4. COLONNES DE LA TABLE CHAPTERS
-- =====================================================

\echo '4. COLONNES TABLE chapters:'
\echo ''

SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name IN ('id', 'course_id', 'title', 'order_index', 'created_at') THEN '✅ Core'
    WHEN column_name IN ('description', 'is_published', 'updated_at') THEN '📝 Mig 002'
    ELSE '➡️ Autre'
  END as migration
FROM information_schema.columns
WHERE table_name = 'chapters'
ORDER BY ordinal_position;

\echo ''

-- =====================================================
-- 5. VÉRIFICATIONS SPÉCIFIQUES
-- =====================================================

\echo '5. VÉRIFICATIONS SPÉCIFIQUES:'
\echo ''

DO $$
DECLARE
  -- Migration 002
  v_courses_has_thumbnail BOOLEAN;
  v_courses_has_description BOOLEAN;
  v_courses_has_is_published BOOLEAN;
  v_courses_has_updated_at BOOLEAN;

  v_lessons_has_content BOOLEAN;
  v_lessons_has_video_url BOOLEAN;
  v_lessons_has_is_published BOOLEAN;
  v_lessons_has_updated_at BOOLEAN;

  v_chapters_has_description BOOLEAN;
  v_chapters_has_is_published BOOLEAN;
  v_chapters_has_updated_at BOOLEAN;

  -- Migration 003
  v_courses_has_settings BOOLEAN;
  v_courses_has_target_audience BOOLEAN;
  v_courses_has_enrolled_count BOOLEAN;

  -- Migration 004
  v_lessons_has_presentation_id BOOLEAN;

  -- Compteurs
  v_nb_migrations_needed INTEGER := 0;
BEGIN
  -- Vérifier colonnes Migration 002
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'thumbnail') INTO v_courses_has_thumbnail;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'description') INTO v_courses_has_description;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'is_published') INTO v_courses_has_is_published;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'updated_at') INTO v_courses_has_updated_at;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'content') INTO v_lessons_has_content;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'video_url') INTO v_lessons_has_video_url;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_published') INTO v_lessons_has_is_published;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'updated_at') INTO v_lessons_has_updated_at;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'description') INTO v_chapters_has_description;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'is_published') INTO v_chapters_has_is_published;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'updated_at') INTO v_chapters_has_updated_at;

  -- Vérifier colonnes Migration 003
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'settings') INTO v_courses_has_settings;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'target_audience') INTO v_courses_has_target_audience;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'enrolled_count') INTO v_courses_has_enrolled_count;

  -- Vérifier colonnes Migration 004
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'presentation_id') INTO v_lessons_has_presentation_id;

  -- Afficher résultats
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DIAGNOSTIC MIGRATIONS NÉCESSAIRES';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Migration 002
  RAISE NOTICE '📝 MIGRATION 002 (Colonnes manquantes):';

  IF NOT v_courses_has_thumbnail THEN
    RAISE NOTICE '   ❌ courses.thumbnail manquante';
    v_nb_migrations_needed := v_nb_migrations_needed + 1;
  ELSE
    RAISE NOTICE '   ✅ courses.thumbnail';
  END IF;

  IF NOT v_courses_has_description THEN
    RAISE NOTICE '   ❌ courses.description manquante';
    v_nb_migrations_needed := v_nb_migrations_needed + 1;
  ELSE
    RAISE NOTICE '   ✅ courses.description';
  END IF;

  IF NOT v_lessons_has_content THEN
    RAISE NOTICE '   ❌ lessons.content manquante';
    v_nb_migrations_needed := v_nb_migrations_needed + 1;
  ELSE
    RAISE NOTICE '   ✅ lessons.content';
  END IF;

  IF NOT v_lessons_has_video_url THEN
    RAISE NOTICE '   ❌ lessons.video_url manquante';
    v_nb_migrations_needed := v_nb_migrations_needed + 1;
  ELSE
    RAISE NOTICE '   ✅ lessons.video_url';
  END IF;

  RAISE NOTICE '';

  -- Migration 003
  RAISE NOTICE '🎯 MIGRATION 003 (Programme Unifié):';

  IF NOT v_courses_has_settings THEN
    RAISE NOTICE '   ❌ courses.settings manquante';
  ELSE
    RAISE NOTICE '   ✅ courses.settings';
  END IF;

  IF NOT v_courses_has_target_audience THEN
    RAISE NOTICE '   ❌ courses.target_audience manquante';
  ELSE
    RAISE NOTICE '   ✅ courses.target_audience';
  END IF;

  IF NOT v_courses_has_enrolled_count THEN
    RAISE NOTICE '   ❌ courses.enrolled_count manquante';
  ELSE
    RAISE NOTICE '   ✅ courses.enrolled_count';
  END IF;

  RAISE NOTICE '';

  -- Migration 004
  RAISE NOTICE '🎨 MIGRATION 004 (Intégration Slides):';

  IF NOT v_lessons_has_presentation_id THEN
    RAISE NOTICE '   ❌ lessons.presentation_id manquante';
  ELSE
    RAISE NOTICE '   ✅ lessons.presentation_id';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RECOMMANDATIONS:';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Recommandations
  IF v_nb_migrations_needed > 0 THEN
    RAISE NOTICE '⚠️  MIGRATION 002 REQUISE';
    RAISE NOTICE '   Exécuter: psql -d votre_base -f migrations/002-add-missing-columns.sql';
    RAISE NOTICE '';
  END IF;

  IF NOT v_courses_has_settings THEN
    RAISE NOTICE '⚠️  MIGRATION 003 REQUISE (après 002)';
    RAISE NOTICE '   Exécuter: psql -d votre_base -f migrations/003-unified-programme-model.sql';
    RAISE NOTICE '';
  END IF;

  IF NOT v_lessons_has_presentation_id THEN
    RAISE NOTICE '⚠️  MIGRATION 004 REQUISE (après 002 et 003)';
    RAISE NOTICE '   Exécuter: psql -d votre_base -f migrations/004-integrate-slides-into-lessons.sql';
    RAISE NOTICE '';
  END IF;

  IF v_nb_migrations_needed = 0 AND v_courses_has_settings AND v_lessons_has_presentation_id THEN
    RAISE NOTICE '✅ TOUTES LES MIGRATIONS DÉJÀ APPLIQUÉES!';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '============================================';
END $$;

\echo ''

-- =====================================================
-- 6. STATISTIQUES DES DONNÉES
-- =====================================================

\echo '6. STATISTIQUES DES DONNÉES:'
\echo ''

SELECT
  'Courses' as table_name,
  COUNT(*) as nb_lignes
FROM courses
UNION ALL
SELECT
  'Chapters' as table_name,
  COUNT(*) as nb_lignes
FROM chapters
UNION ALL
SELECT
  'Lessons' as table_name,
  COUNT(*) as nb_lignes
FROM lessons
UNION ALL
SELECT
  'Presentations' as table_name,
  COUNT(*) as nb_lignes
FROM presentations
UNION ALL
SELECT
  'Slides' as table_name,
  COUNT(*) as nb_lignes
FROM slides;

\echo ''
\echo '============================================'
\echo 'FIN DE LA VÉRIFICATION'
\echo '============================================'
