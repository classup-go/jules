-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 007 : COMPLETE PROFILE (VERSION FINALE FUSIONNÉE)
-- ═══════════════════════════════════════════════════════════════
-- Description: Ajout des champs pour le profil complet de TOUS les utilisateurs
-- Date: 2026-01-28
-- Fusion de: 007-complete-profile.sql + 007-complete-profile-fixed.sql + 007-complete-profile-all-users.sql
-- ═══════════════════════════════════════════════════════════════

\echo '🔧 Migration 007 : Complete Profile (Version Finale)'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 1. AJOUT DES COLONNES PROFILE
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 1 : Ajout des colonnes à users'

DO $$
BEGIN
  -- country
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'country') THEN
    ALTER TABLE users ADD COLUMN country TEXT;
    RAISE NOTICE '✅ Colonne country ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne country existe déjà';
  END IF;

  -- address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'address') THEN
    ALTER TABLE users ADD COLUMN address TEXT;
    RAISE NOTICE '✅ Colonne address ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne address existe déjà';
  END IF;

  -- phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Colonne phone ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne phone existe déjà';
  END IF;

  -- currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'currency') THEN
    ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'EUR';
    RAISE NOTICE '✅ Colonne currency ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne currency existe déjà';
  END IF;

  -- education_level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'education_level') THEN
    ALTER TABLE users ADD COLUMN education_level TEXT;
    RAISE NOTICE '✅ Colonne education_level ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne education_level existe déjà';
  END IF;

  -- bac_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'bac_type') THEN
    ALTER TABLE users ADD COLUMN bac_type TEXT;
    RAISE NOTICE '✅ Colonne bac_type ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne bac_type existe déjà';
  END IF;

  -- profile_completed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'profile_completed') THEN
    ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Colonne profile_completed ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne profile_completed existe déjà';
  END IF;
END $$;

\echo '✅ Colonnes vérifiées/ajoutées'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 2. GESTION DU TYPE ENUM CURRENCY (SI EXISTE)
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 2 : Conversion ENUM currency_type en TEXT (si nécessaire)'

DO $$
BEGIN
  -- Vérifier si le type ENUM currency_type existe
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
    RAISE NOTICE 'ℹ️  Type ENUM currency_type détecté';

    -- Vérifier le type actuel de la colonne currency
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'currency'
      AND udt_name = 'currency_type'
    ) THEN
      RAISE NOTICE '⚠️  Colonne currency utilise le type ENUM, conversion en TEXT';

      -- Convertir la colonne en TEXT en préservant les valeurs
      ALTER TABLE users
        ALTER COLUMN currency TYPE TEXT
        USING currency::TEXT;

      RAISE NOTICE '✅ Colonne currency convertie en TEXT';
    ELSE
      RAISE NOTICE 'ℹ️  Colonne currency est déjà en TEXT';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Pas de type ENUM currency_type, pas de conversion nécessaire';
  END IF;
END $$;

\echo '✅ Type currency vérifié'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 3. CONTRAINTES ET VALIDATIONS
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 3 : Ajout des contraintes'

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

\echo '✅ Contraintes ajoutées'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 4. INDEX POUR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 4 : Création des index'

CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_currency ON users(currency);
CREATE INDEX IF NOT EXISTS idx_users_education_level ON users(education_level);
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);

\echo '✅ Index créés'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 5. FONCTION POUR VÉRIFIER LE PROFIL COMPLET
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 5 : Création de la fonction check_profile_complete'

DROP TRIGGER IF EXISTS trigger_check_profile_complete ON users;
DROP FUNCTION IF EXISTS check_profile_complete();

CREATE OR REPLACE FUNCTION check_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour les étudiants : country, phone, currency, education_level obligatoires
  IF NEW.role = 'student' THEN
    IF NEW.country IS NOT NULL
       AND NEW.country != ''
       AND NEW.phone IS NOT NULL
       AND NEW.phone != ''
       AND NEW.currency IS NOT NULL
       AND NEW.currency != ''
       AND NEW.education_level IS NOT NULL
       AND NEW.education_level != ''
    THEN
      NEW.profile_completed = TRUE;
    ELSE
      NEW.profile_completed = FALSE;
    END IF;

  -- Pour les professeurs : country, phone, currency obligatoires
  ELSIF NEW.role = 'teacher' THEN
    IF NEW.country IS NOT NULL
       AND NEW.country != ''
       AND NEW.phone IS NOT NULL
       AND NEW.phone != ''
       AND NEW.currency IS NOT NULL
       AND NEW.currency != ''
    THEN
      NEW.profile_completed = TRUE;
    ELSE
      NEW.profile_completed = FALSE;
    END IF;

  -- Pour les autres rôles (admin, etc.)
  ELSE
    NEW.profile_completed = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

\echo '✅ Fonction créée'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 6. TRIGGER POUR AUTO-UPDATE profile_completed
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 6 : Création du trigger'

CREATE TRIGGER trigger_check_profile_complete
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_complete();

\echo '✅ Trigger créé'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 7. MISE À JOUR DES PROFILS EXISTANTS
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 7 : Mise à jour des profils existants'

-- Mettre la devise par défaut pour ceux qui n'en ont pas
UPDATE users
SET currency = 'EUR'
WHERE currency IS NULL OR currency = '';

-- Pour les professeurs : vérifier les champs obligatoires
UPDATE users
SET profile_completed = (
  country IS NOT NULL AND country != ''
  AND phone IS NOT NULL AND phone != ''
  AND currency IS NOT NULL AND currency != ''
)
WHERE role = 'teacher';

-- Pour les étudiants : vérifier tous les champs obligatoires
UPDATE users
SET profile_completed = (
  country IS NOT NULL AND country != ''
  AND phone IS NOT NULL AND phone != ''
  AND currency IS NOT NULL AND currency != ''
  AND education_level IS NOT NULL AND education_level != ''
)
WHERE role = 'student';

\echo '✅ Profils existants mis à jour'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 8. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

\echo '📝 Étape 8 : Configuration RLS policies'

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

\echo '✅ RLS policies configurées'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 9. VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

\echo '🔍 Étape 9 : Vérification'

-- Vérifier que les colonnes existent
SELECT
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('country', 'address', 'phone', 'currency', 'education_level', 'bac_type', 'profile_completed')
ORDER BY column_name;

\echo ''
\echo '📊 Statistiques des profils'

-- Statistiques des profils
SELECT
  role,
  COUNT(*) as total_users,
  COUNT(CASE WHEN profile_completed = TRUE THEN 1 END) as profiles_complets,
  COUNT(CASE WHEN profile_completed = FALSE OR profile_completed IS NULL THEN 1 END) as profiles_incomplets,
  ROUND(100.0 * COUNT(CASE WHEN profile_completed = TRUE THEN 1 END) / COUNT(*), 1) as pourcentage_complets
FROM users
GROUP BY role
ORDER BY role;

\echo ''
\echo '🔍 Utilisateurs avec profil incomplet (échantillon)'

-- Voir un échantillon d'utilisateurs avec profil incomplet
SELECT
  id,
  email,
  display_name,
  role,
  country,
  phone,
  currency,
  education_level,
  profile_completed,
  created_at
FROM users
WHERE profile_completed = FALSE OR profile_completed IS NULL
ORDER BY created_at DESC
LIMIT 5;

\echo ''
\echo '✅ ═══════════════════════════════════════════════════════════'
\echo '✅ MIGRATION 007 TERMINÉE'
\echo '✅ ═══════════════════════════════════════════════════════════'
\echo ''
\echo '📝 NOTES IMPORTANTES :'
\echo '   - Professeurs ET étudiants doivent compléter leur profil'
\echo '   - Students: country, phone, currency, education_level obligatoires'
\echo '   - Teachers: country, phone, currency obligatoires'
\echo '   - Gestion robuste des types ENUM convertis en TEXT'
\echo ''
\echo '📝 PROCHAINES ÉTAPES :'
\echo '   1. Tester la page /complete-profile'
\echo '   2. Vérifier le middleware de redirection'
\echo '   3. Tester le flow complet de création de profil'
\echo ''
