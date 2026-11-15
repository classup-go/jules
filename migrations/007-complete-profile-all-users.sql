-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 007 : COMPLETE PROFILE POUR TOUS LES UTILISATEURS
-- ═══════════════════════════════════════════════════════════════
-- Modification : Professeurs ET étudiants doivent compléter leur profil
-- Date: 2026-01-24
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. MODIFIER LA FONCTION check_profile_complete
-- ═══════════════════════════════════════════════════════════════

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

-- Recréer le trigger
CREATE TRIGGER trigger_check_profile_complete
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_complete();

-- ═══════════════════════════════════════════════════════════════
-- 2. METTRE À JOUR LES PROFILS EXISTANTS
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- 3. VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

-- Statistiques des profils
SELECT
  role,
  COUNT(*) as total_users,
  COUNT(CASE WHEN profile_completed = TRUE THEN 1 END) as profiles_complets,
  COUNT(CASE WHEN profile_completed = FALSE OR profile_completed IS NULL THEN 1 END) as profiles_incomplets
FROM users
GROUP BY role;

-- Voir les utilisateurs avec profil incomplet
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
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- ✅ MIGRATION 007 TERMINÉE
-- ═══════════════════════════════════════════════════════════════
