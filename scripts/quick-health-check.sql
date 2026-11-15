-- ============================================================================
-- QUICK HEALTH CHECK - Plateforme Jules
-- ============================================================================
-- Date: 2026-01-28
-- Usage: Exécuter dans Supabase SQL Editor pour vérifier l'état du système
-- ============================================================================

-- 1. ENROLLMENTS: Vérifier course_id
-- ============================================================================
SELECT
  '1. ENROLLMENTS' as check_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE course_id IS NOT NULL) as with_course_id,
  COUNT(*) FILTER (WHERE course_id IS NULL) as without_course_id,
  CASE
    WHEN COUNT(*) FILTER (WHERE course_id IS NULL) > 0 THEN '❌ PROBLÈME: Enrollments sans course_id'
    ELSE '✅ OK: Tous les enrollments ont course_id'
  END as status
FROM enrollments;

-- 2. CHAPTERS: Vérifier course_id
-- ============================================================================
SELECT
  '2. CHAPTERS' as check_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE course_id IS NOT NULL) as with_course_id,
  COUNT(*) FILTER (WHERE course_id IS NULL) as without_course_id,
  CASE
    WHEN COUNT(*) FILTER (WHERE course_id IS NULL) > 0 THEN '❌ PROBLÈME: Chapters sans course_id'
    ELSE '✅ OK: Tous les chapters ont course_id'
  END as status
FROM chapters;

-- 3. COURSES: Vérifier settings JSONB
-- ============================================================================
SELECT
  '3. COURSES SETTINGS' as check_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE settings IS NOT NULL) as with_settings,
  COUNT(*) FILTER (WHERE settings IS NULL) as without_settings,
  CASE
    WHEN COUNT(*) FILTER (WHERE settings IS NULL) > COUNT(*) / 2 THEN '⚠️ WARNING: Beaucoup de courses sans settings'
    WHEN COUNT(*) FILTER (WHERE settings IS NULL) > 0 THEN '⚠️ INFO: Quelques courses sans settings (probablement ancien)'
    ELSE '✅ OK: Tous les courses ont settings'
  END as status
FROM courses;

-- 4. RLS POLICIES: Vérifier existence
-- ============================================================================
SELECT
  '4. RLS POLICIES' as check_name,
  COUNT(*) FILTER (WHERE tablename = 'courses') as courses_policies,
  COUNT(*) FILTER (WHERE tablename = 'chapters') as chapters_policies,
  COUNT(*) FILTER (WHERE tablename = 'lessons') as lessons_policies,
  CASE
    WHEN COUNT(*) FILTER (WHERE tablename = 'courses') = 0 THEN '❌ CRITIQUE: Aucune policy sur courses'
    WHEN COUNT(*) FILTER (WHERE tablename = 'courses' AND policyname LIKE '%public%') = 0 THEN '⚠️ WARNING: Policy public manquante'
    ELSE '✅ OK: Policies RLS présentes'
  END as status
FROM pg_policies
WHERE tablename IN ('courses', 'chapters', 'lessons');

-- 5. TRANSACTIONS: Vérifier multi-devises
-- ============================================================================
SELECT
  '5. TRANSACTIONS' as check_name,
  COUNT(*) as total,
  COUNT(DISTINCT currency) as currencies_count,
  STRING_AGG(DISTINCT currency::TEXT, ', ') as currencies_used,
  CASE
    WHEN COUNT(*) = 0 THEN '⚠️ INFO: Aucune transaction (normal si nouveau)'
    WHEN COUNT(DISTINCT currency) > 1 THEN '✅ OK: Multi-devises fonctionnel'
    ELSE '⚠️ INFO: Une seule devise utilisée'
  END as status
FROM transactions;

-- 6. TEACHERS: Vérifier profiles
-- ============================================================================
SELECT
  '6. TEACHER PROFILES' as check_name,
  COUNT(*) FILTER (WHERE role = 'teacher') as total_teachers,
  COUNT(DISTINCT tp.teacher_id) as teachers_with_profile,
  CASE
    WHEN COUNT(*) FILTER (WHERE role = 'teacher') = 0 THEN '⚠️ INFO: Aucun teacher'
    WHEN COUNT(DISTINCT tp.teacher_id) < COUNT(*) FILTER (WHERE role = 'teacher') THEN '⚠️ WARNING: Certains teachers sans profile'
    ELSE '✅ OK: Tous les teachers ont un profile'
  END as status
FROM users u
LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.id;

-- 7. CLASSROOMS: Vérifier structure
-- ============================================================================
SELECT
  '7. CLASSROOMS' as check_name,
  COUNT(*) as total_classrooms,
  COUNT(*) FILTER (WHERE is_free = true) as free_classrooms,
  COUNT(*) FILTER (WHERE is_free = false) as paid_classrooms,
  CASE
    WHEN COUNT(*) = 0 THEN '⚠️ INFO: Aucune classroom (normal si nouveau)'
    ELSE '✅ OK: Classrooms créées'
  END as status
FROM classrooms;

-- 8. COURSES par CLASSROOM: Vérifier relations
-- ============================================================================
SELECT
  '8. COURSES/CLASSROOM' as check_name,
  COUNT(DISTINCT c.classroom_id) as classrooms_with_courses,
  COUNT(*) as total_courses,
  ROUND(AVG(courses_per_classroom), 2) as avg_courses_per_classroom,
  CASE
    WHEN AVG(courses_per_classroom) > 10 THEN '⚠️ WARNING: Beaucoup de courses par classroom (normal?)'
    WHEN AVG(courses_per_classroom) < 1 THEN '⚠️ WARNING: Peu de courses'
    ELSE '✅ OK: Ratio courses/classroom normal'
  END as status
FROM (
  SELECT classroom_id, COUNT(*) as courses_per_classroom
  FROM courses
  GROUP BY classroom_id
) c;

-- 9. LESSONS par CHAPTER: Vérifier contenu
-- ============================================================================
SELECT
  '9. LESSONS/CHAPTER' as check_name,
  COUNT(DISTINCT l.chapter_id) as chapters_with_lessons,
  COUNT(*) as total_lessons,
  ROUND(AVG(lessons_per_chapter), 2) as avg_lessons_per_chapter,
  CASE
    WHEN AVG(lessons_per_chapter) < 1 THEN '⚠️ WARNING: Chapitres vides'
    WHEN AVG(lessons_per_chapter) > 20 THEN '⚠️ INFO: Chapitres très remplis'
    ELSE '✅ OK: Contenu normal'
  END as status
FROM (
  SELECT chapter_id, COUNT(*) as lessons_per_chapter
  FROM lessons
  GROUP BY chapter_id
) l;

-- 10. STUDENT ACCESS: Vérifier que students peuvent lire
-- ============================================================================
-- Note: Cette requête teste si la structure permet l'accès student
SELECT
  '10. STUDENT ACCESS' as check_name,
  COUNT(DISTINCT e.student_id) as enrolled_students,
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  COUNT(DISTINCT l.id) as accessible_lessons,
  CASE
    WHEN COUNT(DISTINCT e.student_id) = 0 THEN '⚠️ INFO: Aucun étudiant inscrit'
    WHEN COUNT(DISTINCT l.id) = 0 THEN '❌ PROBLÈME: Étudiants inscrits mais aucune leçon accessible'
    ELSE '✅ OK: Étudiants peuvent accéder aux leçons'
  END as status
FROM enrollments e
JOIN courses co ON co.id = e.course_id
JOIN chapters ch ON ch.course_id = co.id
JOIN lessons l ON l.chapter_id = ch.id;

-- ============================================================================
-- RÉSUMÉ FINAL
-- ============================================================================
SELECT
  '═══════════════════════════════════════' as separator,
  'RÉSUMÉ HEALTH CHECK' as title,
  '═══════════════════════════════════════' as separator2;

-- Compter les problèmes
WITH health_status AS (
  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE course_id IS NULL) > 0 THEN 1
      ELSE 0
    END as enrollment_issues
  FROM enrollments

  UNION ALL

  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE course_id IS NULL) > 0 THEN 1
      ELSE 0
    END
  FROM chapters

  UNION ALL

  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE tablename = 'courses' AND policyname LIKE '%public%') = 0 THEN 1
      ELSE 0
    END
  FROM pg_policies
  WHERE tablename = 'courses'
)
SELECT
  SUM(enrollment_issues) as total_critical_issues,
  CASE
    WHEN SUM(enrollment_issues) = 0 THEN '🎉 EXCELLENT: Système en bonne santé'
    WHEN SUM(enrollment_issues) <= 2 THEN '⚠️ ATTENTION: Quelques problèmes à corriger'
    ELSE '🔴 CRITIQUE: Plusieurs problèmes détectés'
  END as overall_status,
  'Voir ACTION-PLAN-IMMEDIATE.md pour corrections' as action
FROM health_status;

-- ============================================================================
-- DÉTAILS POUR DEBUG (optionnel)
-- ============================================================================
-- Décommenter pour voir les détails:

/*
-- Enrollments sans course_id
SELECT
  e.id,
  e.student_id,
  e.classroom_id,
  cl.title as classroom_title,
  e.enrolled_at
FROM enrollments e
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
WHERE e.course_id IS NULL
LIMIT 10;

-- Chapters sans course_id
SELECT
  ch.id,
  ch.title,
  ch.classroom_id,
  ch.created_at
FROM chapters ch
WHERE ch.course_id IS NULL
LIMIT 10;

-- RLS Policies sur courses
SELECT
  policyname,
  cmd,
  LEFT(qual::TEXT, 100) as qual_preview
FROM pg_policies
WHERE tablename = 'courses';
*/
