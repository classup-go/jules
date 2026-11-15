-- =====================================================
-- MIGRATION 005: AJOUTER is_public À classrooms
-- =====================================================
-- Objectif: Séparer visibilité publique de la gratuité
-- Date: 2026-01-23
-- =====================================================

BEGIN;

-- Ajouter la colonne is_public
ALTER TABLE classrooms
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Commentaire
COMMENT ON COLUMN classrooms.is_public IS
  'Indique si la classe est visible dans le catalogue public et autorise les inscriptions directes';

-- Mettre à jour les classes existantes
-- Par défaut: classes gratuites → publiques, classes payantes → privées
UPDATE classrooms
SET is_public = is_free
WHERE is_public IS NULL;

-- Index pour recherche des classes publiques
CREATE INDEX IF NOT EXISTS idx_classrooms_is_public
ON classrooms(is_public)
WHERE is_public = true;

-- Validation
DO $$
DECLARE
  v_total INTEGER;
  v_public INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM classrooms;
  SELECT COUNT(*) INTO v_public FROM classrooms WHERE is_public = true;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 005 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total classes: %', v_total;
  RAISE NOTICE 'Classes publiques: %', v_public;
  RAISE NOTICE 'Classes privées: %', v_total - v_public;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Prochaines étapes:';
  RAISE NOTICE '   1. Décommenter is_public dans /api/classes/route.ts';
  RAISE NOTICE '   2. Tester la création de classe';
  RAISE NOTICE '';
END $$;

COMMIT;
