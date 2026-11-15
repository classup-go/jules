-- =====================================================
-- VÉRIFICATION RAPIDE POST-INSTALLATION
-- Copier et exécuter dans Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
  colonnes_ok INTEGER;
  tables_ok INTEGER;
  nb_profs INTEGER;
BEGIN
  RAISE NOTICE '🔍 VÉRIFICATION POST-INSTALLATION';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';

  -- Compter les colonnes créées
  SELECT COUNT(*)
  INTO colonnes_ok
  FROM information_schema.columns
  WHERE table_name = 'users'
  AND column_name IN ('subjects', 'levels', 'teaching_mode', 'hourly_rate', 'profile_completed');

  -- Compter les tables créées
  SELECT COUNT(*)
  INTO tables_ok
  FROM information_schema.tables
  WHERE table_name IN ('teacher_reviews', 'teacher_availability');

  -- Compter les professeurs
  SELECT COUNT(*)
  INTO nb_profs
  FROM users
  WHERE role = 'teacher';

  RAISE NOTICE '📊 Résultats:';
  RAISE NOTICE '   Colonnes créées: % / 5', colonnes_ok;
  RAISE NOTICE '   Tables créées: % / 2', tables_ok;
  RAISE NOTICE '   Professeurs inscrits: %', nb_profs;
  RAISE NOTICE '';

  IF colonnes_ok = 5 AND tables_ok = 2 THEN
    RAISE NOTICE '✅ INSTALLATION RÉUSSIE !';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Prochaines étapes:';
    RAISE NOTICE '   1. Aller sur: http://localhost:3001/teacher/profile/complete';
    RAISE NOTICE '   2. Compléter un profil professeur';
    RAISE NOTICE '   3. Tester la recherche: http://localhost:3001/find-teachers';
  ELSE
    RAISE NOTICE '❌ INSTALLATION INCOMPLÈTE';
    RAISE NOTICE '';
    IF colonnes_ok < 5 THEN
      RAISE NOTICE '   Colonnes manquantes: %', 5 - colonnes_ok;
    END IF;
    IF tables_ok < 2 THEN
      RAISE NOTICE '   Tables manquantes: %', 2 - tables_ok;
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '→ Relancer: supabase-teacher-profile-enhancement.sql';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';

END $$;

-- Voir les détails des colonnes créées
SELECT
  column_name,
  data_type,
  CASE
    WHEN data_type = 'ARRAY' THEN 'Liste'
    WHEN data_type = 'numeric' THEN 'Nombre'
    WHEN data_type = 'boolean' THEN 'Oui/Non'
    ELSE 'Texte'
  END as type_simplifie
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
  'phone', 'city', 'bio', 'experience',
  'subjects', 'levels', 'teaching_mode',
  'hourly_rate', 'can_travel', 'rating',
  'profile_completed', 'is_available'
)
ORDER BY column_name;
