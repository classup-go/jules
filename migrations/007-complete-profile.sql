-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 007 : COMPLETE PROFILE
-- ═══════════════════════════════════════════════════════════════
-- Ajout des champs pour le profil complet des étudiants
-- Date: 2026-01-24
-- ═══════════════════════════════════════════════════════════════

\echo '🔧 Migration 007 : Complete Profile'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 1. AJOUT DES COLONNES PROFILE
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 1 : Ajout des colonnes à users'

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS bac_type TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

\echo '✅ Colonnes ajoutées'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 2. CONTRAINTES ET VALIDATIONS
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 2 : Ajout des contraintes'

-- Contrainte sur currency : valeurs autorisées
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS check_currency_valid;

ALTER TABLE users
  ADD CONSTRAINT check_currency_valid
  CHECK (currency IN ('EUR', 'TND', 'XOF', 'XAF', 'MAD', 'DZD', 'USD'));

-- Contrainte sur education_level : valeurs autorisées
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS check_education_level_valid;

ALTER TABLE users
  ADD CONSTRAINT check_education_level_valid
  CHECK (education_level IN ('college', 'lycee', 'terminal', 'bac', 'university', 'other', NULL));

\echo '✅ Contraintes ajoutées'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 3. INDEX POUR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 3 : Création des index'

CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_currency ON users(currency);
CREATE INDEX IF NOT EXISTS idx_users_education_level ON users(education_level);
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);

\echo '✅ Index créés'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 4. FONCTION POUR VÉRIFIER LE PROFIL COMPLET
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 4 : Création de la fonction check_profile_complete'

CREATE OR REPLACE FUNCTION check_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour les étudiants, vérifier que tous les champs obligatoires sont remplis
  IF NEW.role = 'student' THEN
    IF NEW.country IS NOT NULL
       AND NEW.phone IS NOT NULL
       AND NEW.currency IS NOT NULL
       AND NEW.education_level IS NOT NULL
    THEN
      NEW.profile_completed = TRUE;
    ELSE
      NEW.profile_completed = FALSE;
    END IF;
  ELSE
    -- Pour les professeurs, le profil est complet par défaut
    NEW.profile_completed = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

\echo '✅ Fonction créée'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 5. TRIGGER POUR AUTO-UPDATE profile_completed
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 5 : Création du trigger'

DROP TRIGGER IF EXISTS trigger_check_profile_complete ON users;

CREATE TRIGGER trigger_check_profile_complete
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_complete();

\echo '✅ Trigger créé'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 6. MISE À JOUR DES PROFILS EXISTANTS
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 6 : Mise à jour des profils existants'

-- Pour les professeurs : profil complet par défaut
UPDATE users
SET profile_completed = TRUE
WHERE role = 'teacher';

-- Pour les étudiants : vérifier si le profil est complet
UPDATE users
SET profile_completed = (
  country IS NOT NULL
  AND phone IS NOT NULL
  AND currency IS NOT NULL
  AND education_level IS NOT NULL
)
WHERE role = 'student';

\echo '✅ Profils existants mis à jour'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 7. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 7 : Configuration RLS policies'

-- Les utilisateurs peuvent voir et modifier leur propre profil
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

\echo '✅ RLS policies configurées'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 8. VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

\echo '🔍 Étape 8 : Vérification'

-- Vérifier que les colonnes existent
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('country', 'address', 'phone', 'currency', 'education_level', 'bac_type', 'profile_completed')
ORDER BY column_name;

\echo ''
\echo '📊 Statistiques des profils'

SELECT
  role,
  COUNT(*) as total_users,
  COUNT(CASE WHEN profile_completed = TRUE THEN 1 END) as profiles_complets,
  COUNT(CASE WHEN profile_completed = FALSE THEN 1 END) as profiles_incomplets
FROM users
GROUP BY role;

\echo ''
\echo '✅ ═══════════════════════════════════════════════════════════'
\echo '✅ MIGRATION 007 TERMINÉE'
\echo '✅ ═══════════════════════════════════════════════════════════'
\echo ''
\echo '📝 PROCHAINES ÉTAPES :'
\echo '1. Créer la page /complete-profile'
\echo '2. Ajouter le middleware pour rediriger les profils incomplets'
\echo '3. Désactiver la détection automatique de devise'
\echo '4. Tester le flow de création de profil'
\echo ''
