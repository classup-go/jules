-- Migration: Ajouter la colonne duration_minutes à la table courses
-- Date: 2026-01-21
-- Description: Permet aux professeurs de spécifier la durée en minutes pour les cours individuels

-- Ajouter la colonne duration_minutes à la table courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE courses ADD COLUMN duration_minutes INTEGER;
    COMMENT ON COLUMN courses.duration_minutes IS 'Durée du cours en minutes (pour cours individuels)';

    RAISE NOTICE 'Colonne duration_minutes ajoutée avec succès à la table courses';
  ELSE
    RAISE NOTICE 'La colonne duration_minutes existe déjà dans la table courses';
  END IF;
END $$;

-- Vérifier que les colonnes duration_hours et duration_weeks existent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'duration_hours'
  ) THEN
    RAISE WARNING 'La colonne duration_hours n''existe pas dans la table courses';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'duration_weeks'
  ) THEN
    RAISE WARNING 'La colonne duration_weeks n''existe pas dans la table courses';
  END IF;
END $$;
