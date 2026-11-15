-- Migration: Ajouter la colonne is_free à la table classrooms
-- Date: 2026-01-21
-- Description: Permet d'indiquer si une classe est gratuite ou payante

-- Ajouter la colonne is_free à la table classrooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classrooms' AND column_name = 'is_free'
  ) THEN
    -- Ajouter la colonne avec une valeur par défaut
    ALTER TABLE classrooms ADD COLUMN is_free BOOLEAN DEFAULT true;

    -- Mettre à jour les enregistrements existants : is_free = false si price > 0
    UPDATE classrooms SET is_free = (price = 0 OR price IS NULL);

    -- Ajouter un commentaire
    COMMENT ON COLUMN classrooms.is_free IS 'Indique si la classe est gratuite (true) ou payante (false)';

    RAISE NOTICE 'Colonne is_free ajoutée avec succès à la table classrooms';
  ELSE
    RAISE NOTICE 'La colonne is_free existe déjà dans la table classrooms';
  END IF;
END $$;

-- Vérification
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'classrooms'
  AND column_name = 'is_free';
