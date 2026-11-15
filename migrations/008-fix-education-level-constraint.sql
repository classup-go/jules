-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 008 : FIX EDUCATION LEVEL CONSTRAINT
-- ═══════════════════════════════════════════════════════════════
-- Description: Mise à jour du check constraint pour accepter les niveaux détaillés
-- Date: 2026-01-28
-- Problème: Le constraint accepte seulement les catégories (college, lycee)
--           mais le code envoie des niveaux détaillés (sixieme, terminale, etc.)
-- ═══════════════════════════════════════════════════════════════

\echo '🔧 Migration 008 : Fix Education Level Constraint'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 1. SUPPRIMER L'ANCIEN CONSTRAINT
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 1 : Suppression de l''ancien constraint'

ALTER TABLE users DROP CONSTRAINT IF EXISTS check_education_level_valid;

\echo '✅ Ancien constraint supprimé'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 2. CRÉER LE NOUVEAU CONSTRAINT AVEC VALEURS DÉTAILLÉES
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 2 : Création du nouveau constraint avec niveaux détaillés'

ALTER TABLE users
  ADD CONSTRAINT check_education_level_valid
  CHECK (
    education_level IS NULL OR education_level IN (
      -- Collège
      'sixieme',
      'cinquieme',
      'quatrieme',
      'troisieme',

      -- Lycée
      'seconde',
      'premiere',
      'terminale',

      -- Post-bac
      'bac_obtenu',
      'bac_plus_1',
      'bac_plus_2',
      'bac_plus_3',
      'bac_plus_4',
      'bac_plus_5',
      'superieur',

      -- Anciennes valeurs pour rétro-compatibilité
      'college',
      'lycee',
      'terminal',
      'bac',
      'university',
      'other'
    )
  );

\echo '✅ Nouveau constraint créé avec valeurs détaillées'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 3. VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

\echo '📊 Vérification du constraint'

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'check_education_level_valid'
  AND conrelid = 'users'::regclass;

\echo ''
\echo '✅ Migration 008 terminée avec succès'
\echo ''
\echo '💡 Le constraint accepte maintenant:'
\echo '   - Niveaux détaillés: sixieme, terminale, bac_plus_3, etc.'
\echo '   - Anciennes valeurs: college, lycee, bac, university, other'
\echo ''
