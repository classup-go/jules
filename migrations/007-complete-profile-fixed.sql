-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 007 : COMPLETE PROFILE (FIXED)
-- ═══════════════════════════════════════════════════════════════
-- Ajout des champs pour le profil complet des étudiants
-- Date: 2026-01-24
-- Fix: Gestion du type ENUM currency_type existant
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. AJOUT DES COLONNES PROFILE
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- country
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'country') THEN
    ALTER TABLE users ADD COLUMN country TEXT;
    RAISE NOTICE '✅ Colonne country ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne country existe déjà';
  END IF;

  -- address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'address') THEN
    ALTER TABLE users ADD COLUMN address TEXT;
    RAISE NOTICE '✅ Colonne address ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne address existe déjà';
  END IF;

  -- phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Colonne phone ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne phone existe déjà';
  END IF;

  -- currency : Gérer le cas où elle existe déjà avec un type ENUM
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'currency') THEN
    ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'EUR';
    RAISE NOTICE '✅ Colonne currency ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne currency existe déjà';
  END IF;

  -- education_level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'education_level') THEN
    ALTER TABLE users ADD COLUMN education_level TEXT;
    RAISE NOTICE '✅ Colonne education_level ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne education_level existe déjà';
  END IF;

  -- bac_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'bac_type') THEN
    ALTER TABLE users ADD COLUMN bac_type TEXT;
    RAISE NOTICE '✅ Colonne bac_type ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne bac_type existe déjà';
  END IF;

  -- profile_completed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'profile_completed') THEN
    ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Colonne profile_completed ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne profile_completed existe déjà';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. GESTION DU TYPE ENUM CURRENCY (SI EXISTE)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Vérifier si le type ENUM currency_type existe
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
    RAISE NOTICE 'ℹ️ Type ENUM currency_type détecté';

    -- Vérifier le type actuel de la colonne currency
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'currency'
      AND udt_name = 'currency_type'
    ) THEN
      RAISE NOTICE '⚠️ Colonne currency utilise le type ENUM, conversion en TEXT';

      -- Convertir la colonne en TEXT en préservant les valeurs
      ALTER TABLE users
        ALTER COLUMN currency TYPE TEXT
        USING currency::TEXT;

      RAISE NOTICE '✅ Colonne currency convertie en TEXT';
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. CONTRAINTES ET VALIDATIONS
-- ═══════════════════════════════════════════════════════════════

-- Supprimer les anciennes contraintes si elles existent
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_currency_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_education_level_valid;

-- Contrainte sur currency : valeurs autorisées
ALTER TABLE users
  ADD CONSTRAINT check_currency_valid
  CHECK (currency IS NULL OR currency IN ('EUR', 'TND', 'XOF', 'XAF', 'MAD', 'DZD', 'USD'));

-- Contrainte sur education_level : valeurs autorisées
ALTER TABLE users
  ADD CONSTRAINT check_education_level_valid
  CHECK (education_level IS NULL OR education_level IN ('college', 'lycee', 'terminal', 'bac', 'university', 'other'));

-- ═══════════════════════════════════════════════════════════════
-- 4. INDEX POUR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_currency ON users(currency);
CREATE INDEX IF NOT EXISTS idx_users_education_level ON users(education_level);
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);

-- ═══════════════════════════════════════════════════════════════
-- 5. FONCTION POUR VÉRIFIER LE PROFIL COMPLET
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- 6. TRIGGER POUR AUTO-UPDATE profile_completed
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_check_profile_complete ON users;

CREATE TRIGGER trigger_check_profile_complete
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_complete();

-- ═══════════════════════════════════════════════════════════════
-- 7. MISE À JOUR DES PROFILS EXISTANTS
-- ═══════════════════════════════════════════════════════════════

-- Mettre la devise par défaut pour ceux qui n'en ont pas
UPDATE users
SET currency = 'EUR'
WHERE currency IS NULL;

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

-- ═══════════════════════════════════════════════════════════════
-- 8. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Les utilisateurs peuvent voir leur propre profil
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Les utilisateurs peuvent modifier leur propre profil
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- 9. VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

-- Vérifier que les colonnes existent
SELECT
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('country', 'address', 'phone', 'currency', 'education_level', 'bac_type', 'profile_completed')
ORDER BY column_name;

-- Statistiques des profils
SELECT
  role,
  COUNT(*) as total_users,
  COUNT(CASE WHEN profile_completed = TRUE THEN 1 END) as profiles_complets,
  COUNT(CASE WHEN profile_completed = FALSE OR profile_completed IS NULL THEN 1 END) as profiles_incomplets
FROM users
GROUP BY role;

-- ═══════════════════════════════════════════════════════════════
-- ✅ MIGRATION 007 TERMINÉE
-- ═══════════════════════════════════════════════════════════════
