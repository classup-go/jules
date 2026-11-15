-- =====================================================
-- Nettoyage des Tables de Template de Cours
-- ATTENTION: Ce script supprime TOUTES les données !
-- =====================================================

-- Désactiver temporairement les politiques RLS pour éviter les erreurs
ALTER TABLE IF EXISTS homework_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homeworks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS qcm_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS revision_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pedagogical_progressions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_templates DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS existantes
DROP POLICY IF EXISTS "Teachers create templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers view own templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers update own templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers delete own templates" ON course_templates;
DROP POLICY IF EXISTS "Teachers manage progressions" ON pedagogical_progressions;
DROP POLICY IF EXISTS "Teachers manage lesson contents" ON lesson_contents;
DROP POLICY IF EXISTS "Students view published lessons" ON lesson_contents;
DROP POLICY IF EXISTS "Teachers manage summaries" ON course_summaries;
DROP POLICY IF EXISTS "Teachers manage revision sheets" ON revision_sheets;
DROP POLICY IF EXISTS "Teachers manage exercises" ON exercises;
DROP POLICY IF EXISTS "Teachers manage qcm" ON qcm_questions;
DROP POLICY IF EXISTS "Teachers manage quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers manage homeworks" ON homeworks;
DROP POLICY IF EXISTS "Teachers manage homework exercises" ON homework_exercises;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS duplicate_course_template(UUID, TEXT);

-- Supprimer les tables dans le bon ordre (enfants avant parents)
DROP TABLE IF EXISTS homework_exercises CASCADE;
DROP TABLE IF EXISTS homeworks CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS qcm_questions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS revision_sheets CASCADE;
DROP TABLE IF EXISTS course_summaries CASCADE;
DROP TABLE IF EXISTS lesson_contents CASCADE;
DROP TABLE IF EXISTS pedagogical_progressions CASCADE;
DROP TABLE IF EXISTS course_templates CASCADE;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Nettoyage terminé. Toutes les tables de template de cours ont été supprimées.';
  RAISE NOTICE 'Vous pouvez maintenant exécuter le script de création.';
END $$;
