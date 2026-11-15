-- =====================================================
-- TEST RAPIDE - Système de Profil Professeur
-- Copier et exécuter dans Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
  column_count INTEGER;
  review_table_exists BOOLEAN;
  availability_table_exists BOOLEAN;
  teacher_count INTEGER;
  completed_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 TEST DU SYSTÈME DE PROFIL PROFESSEUR';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Test 1: Vérifier les colonnes
  RAISE NOTICE '📊 Test 1: Vérification des colonnes...';

  SELECT COUNT(*)
  INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'users'
  AND column_name IN ('subjects', 'levels', 'teaching_mode', 'hourly_rate', 'profile_completed');

  IF column_count = 5 THEN
    RAISE NOTICE '✅ Les colonnes sont présentes (5/5)';
  ELSE
    RAISE NOTICE '❌ Colonnes manquantes ! Trouvé: % / 5', column_count;
    RAISE NOTICE '   → SOLUTION: Exécuter supabase-teacher-profile-enhancement.sql';
  END IF;

  -- Test 2: Vérifier teacher_reviews
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test 2: Table teacher_reviews...';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'teacher_reviews'
  ) INTO review_table_exists;

  IF review_table_exists THEN
    RAISE NOTICE '✅ Table teacher_reviews existe';
  ELSE
    RAISE NOTICE '❌ Table teacher_reviews manquante !';
    RAISE NOTICE '   → SOLUTION: Exécuter supabase-teacher-profile-enhancement.sql';
  END IF;

  -- Test 3: Vérifier teacher_availability
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test 3: Table teacher_availability...';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'teacher_availability'
  ) INTO availability_table_exists;

  IF availability_table_exists THEN
    RAISE NOTICE '✅ Table teacher_availability existe';
  ELSE
    RAISE NOTICE '❌ Table teacher_availability manquante !';
    RAISE NOTICE '   → SOLUTION: Exécuter supabase-teacher-profile-enhancement.sql';
  END IF;

  -- Test 4: Compter les professeurs (seulement si colonnes existent)
  IF column_count = 5 THEN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Test 4: Professeurs inscrits...';

    SELECT COUNT(*)
    INTO teacher_count
    FROM users
    WHERE role = 'teacher';

    RAISE NOTICE '   Professeurs total: %', teacher_count;

    IF teacher_count > 0 THEN
      SELECT COUNT(*)
      INTO completed_count
      FROM users
      WHERE role = 'teacher'
      AND profile_completed = true;

      RAISE NOTICE '   Profils complétés: %', completed_count;

      IF completed_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  ATTENTION: Aucun profil complété !';
        RAISE NOTICE '   → Les étudiants ne verront aucun professeur.';
        RAISE NOTICE '   → SOLUTION: Un professeur doit compléter son profil sur:';
        RAISE NOTICE '     /teacher/profile/complete';
      END IF;
    ELSE
      RAISE NOTICE '   Aucun professeur inscrit.';
    END IF;
  END IF;

  -- Résumé
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '📋 RÉSUMÉ';
  RAISE NOTICE '================================================';

  IF column_count < 5 OR NOT review_table_exists OR NOT availability_table_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ SYSTÈME NON CONFIGURÉ';
    RAISE NOTICE '';
    RAISE NOTICE '✅ SOLUTION:';
    RAISE NOTICE '   1. Copier: supabase-teacher-profile-enhancement.sql';
    RAISE NOTICE '   2. Coller dans SQL Editor';
    RAISE NOTICE '   3. Exécuter';
    RAISE NOTICE '   4. Relancer ce test';
  ELSIF teacher_count = 0 OR completed_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  SYSTÈME CONFIGURÉ mais vide';
    RAISE NOTICE '';
    RAISE NOTICE '✅ PROCHAINE ÉTAPE:';
    RAISE NOTICE '   1. Se connecter en tant que professeur';
    RAISE NOTICE '   2. Aller sur: /teacher/profile/complete';
    RAISE NOTICE '   3. Compléter les 4 étapes';
    RAISE NOTICE '   4. Le profil apparaîtra dans la recherche';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ SYSTÈME OPÉRATIONNEL';
    RAISE NOTICE '';
    RAISE NOTICE '📊 État:';
    RAISE NOTICE '   • % professeur(s)', teacher_count;
    RAISE NOTICE '   • % profil(s) complété(s)', completed_count;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 URLs:';
    RAISE NOTICE '   • Professeur: /teacher/profile/complete';
    RAISE NOTICE '   • Étudiant: /find-teachers';
    RAISE NOTICE '   • Profil public: /teachers/[id]';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Test terminé';
  RAISE NOTICE '';

END $$;
