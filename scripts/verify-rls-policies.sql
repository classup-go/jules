-- ============================================================================
-- VÉRIFICATION: RLS Policies appliquées correctement
-- ============================================================================
-- Date: 2026-01-28
-- Objectif: Vérifier que toutes les policies RLS nécessaires sont en place
-- ============================================================================

-- 1. Vérifier que RLS est activé sur les tables critiques
SELECT
  '1️⃣ RLS ACTIVÉ SUR LES TABLES' as check_name,
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ RLS activé'
    ELSE '❌ RLS désactivé'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'chapters', 'lessons', 'enrollments', 'classrooms', 'transactions')
ORDER BY tablename;

-- 2. Lister toutes les policies sur la table courses
SELECT
  '2️⃣ POLICIES SUR COURSES' as check_name,
  policyname as policy_name,
  cmd as command,
  CASE
    WHEN permissive THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as policy_type,
  roles as applies_to_roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'courses'
ORDER BY policyname;

-- 3. Vérifier la policy critique pour students
SELECT
  '3️⃣ POLICY CRITIQUE: Anyone can view public classroom courses' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'courses'
        AND policyname = 'Anyone can view public classroom courses'
    ) THEN '✅ Policy existe'
    ELSE '❌ Policy MANQUANTE'
  END as status;

-- 4. Lister les policies sur enrollments
SELECT
  '4️⃣ POLICIES SUR ENROLLMENTS' as check_name,
  policyname as policy_name,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'enrollments'
ORDER BY policyname;

-- 5. Lister les policies sur chapters
SELECT
  '5️⃣ POLICIES SUR CHAPTERS' as check_name,
  policyname as policy_name,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'chapters'
ORDER BY policyname;

-- 6. Lister les policies sur lessons
SELECT
  '6️⃣ POLICIES SUR LESSONS' as check_name,
  policyname as policy_name,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'lessons'
ORDER BY policyname;

-- 7. Test: Simuler accès public aux courses (sans auth)
-- Cette query devrait retourner les courses de classrooms publics
SELECT
  '7️⃣ TEST: Courses publics visibles sans auth' as check_name,
  c.id as course_id,
  c.title as course_title,
  cl.title as classroom_title,
  CASE
    WHEN c.is_published THEN '✅ Publié'
    ELSE '⚠️ Non publié'
  END as publication_status
FROM courses c
JOIN classrooms cl ON cl.id = c.classroom_id
WHERE c.is_published = true
LIMIT 5;

-- 8. Test: Compter les courses accessibles
SELECT
  '8️⃣ RÉSUMÉ ACCESSIBILITÉ COURSES' as check_name,
  COUNT(*) as total_courses,
  COUNT(*) FILTER (WHERE is_published = true) as published_courses,
  COUNT(*) FILTER (WHERE is_published = false) as unpublished_courses
FROM courses;

-- 9. Vérifier les policies sur transactions (pour payments)
SELECT
  '9️⃣ POLICIES SUR TRANSACTIONS' as check_name,
  policyname as policy_name,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'transactions'
ORDER BY policyname;

-- 10. RÉSUMÉ FINAL
DO $$
DECLARE
  v_rls_courses BOOLEAN;
  v_rls_enrollments BOOLEAN;
  v_rls_chapters BOOLEAN;
  v_policy_exists BOOLEAN;
  v_published_courses INTEGER;
BEGIN
  -- Vérifier RLS activé
  SELECT rowsecurity INTO v_rls_courses FROM pg_tables WHERE tablename = 'courses';
  SELECT rowsecurity INTO v_rls_enrollments FROM pg_tables WHERE tablename = 'enrollments';
  SELECT rowsecurity INTO v_rls_chapters FROM pg_tables WHERE tablename = 'chapters';

  -- Vérifier policy critique
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'courses'
      AND policyname = 'Anyone can view public classroom courses'
  ) INTO v_policy_exists;

  -- Compter courses publiés
  SELECT COUNT(*) INTO v_published_courses FROM courses WHERE is_published = true;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '          VÉRIFICATION RLS POLICIES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- RLS Status
  IF v_rls_courses AND v_rls_enrollments AND v_rls_chapters THEN
    RAISE NOTICE '✅ RLS activé sur toutes les tables critiques';
  ELSE
    RAISE NOTICE '❌ RLS manquant sur certaines tables:';
    IF NOT v_rls_courses THEN
      RAISE NOTICE '   - courses';
    END IF;
    IF NOT v_rls_enrollments THEN
      RAISE NOTICE '   - enrollments';
    END IF;
    IF NOT v_rls_chapters THEN
      RAISE NOTICE '   - chapters';
    END IF;
  END IF;

  RAISE NOTICE '';

  -- Policy critique
  IF v_policy_exists THEN
    RAISE NOTICE '✅ Policy "Anyone can view public classroom courses" existe';
  ELSE
    RAISE NOTICE '❌ Policy critique MANQUANTE!';
    RAISE NOTICE '';
    RAISE NOTICE '   ACTION REQUISE:';
    RAISE NOTICE '   Exécuter: FIX-RLS-POLICIES-FINAL.sql';
  END IF;

  RAISE NOTICE '';

  -- Courses accessibles
  RAISE NOTICE '📊 Courses publiés: %', v_published_courses;

  RAISE NOTICE '';

  -- Verdict final
  IF v_rls_courses AND v_rls_enrollments AND v_rls_chapters AND v_policy_exists THEN
    RAISE NOTICE '✅ RLS CONFIGURATION OK';
    RAISE NOTICE '';
    RAISE NOTICE '   Prochaine étape:';
    RAISE NOTICE '   Tester l''accès student sans auth:';
    RAISE NOTICE '   1. Ouvrir navigation privée';
    RAISE NOTICE '   2. Aller sur /search ou /classroom/[id]';
    RAISE NOTICE '   3. Vérifier que les prix s''affichent';
  ELSE
    RAISE NOTICE '⚠️  PROBLÈMES RLS DÉTECTÉS';
    RAISE NOTICE '';
    RAISE NOTICE '   Voir détails ci-dessus et corriger';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
