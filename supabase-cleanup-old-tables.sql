-- =====================================================
-- NETTOYAGE: Suppression des anciennes tables
-- Exécuter dans Supabase SQL Editor
-- =====================================================

-- Supprimer les anciennes tables (CASCADE supprime aussi les contraintes)
DROP TABLE IF EXISTS teacher_availability CASCADE;
DROP TABLE IF EXISTS teacher_reviews CASCADE;
DROP TABLE IF EXISTS teacher_profiles CASCADE;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Nettoyage terminé !';
  RAISE NOTICE '';
  RAISE NOTICE '   Anciennes tables supprimées:';
  RAISE NOTICE '   - teacher_profiles ❌';
  RAISE NOTICE '   - teacher_reviews ❌';
  RAISE NOTICE '   - teacher_availability ❌';
  RAISE NOTICE '';
  RAISE NOTICE '   Système unifié actif:';
  RAISE NOTICE '   - users (avec toutes les colonnes profil pro) ✅';
  RAISE NOTICE '';
  RAISE NOTICE '   Prochaine étape:';
  RAISE NOTICE '   → Les professeurs doivent compléter leur profil via:';
  RAISE NOTICE '     /teacher/profile/complete';
END $$;
