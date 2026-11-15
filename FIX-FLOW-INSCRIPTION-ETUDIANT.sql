-- ═══════════════════════════════════════════════════════════════
-- FIX FLOW INSCRIPTION ÉTUDIANT
-- ═══════════════════════════════════════════════════════════════
-- Problème : Après inscription, redirection vers dashboard au lieu de /complete-profile
-- Solution : S'assurer que profile_completed = FALSE pour les nouveaux étudiants
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. VÉRIFICATION DE L'ÉTAT ACTUEL
-- ═══════════════════════════════════════════════════════════════

-- Voir les utilisateurs récents et leur état
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
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- 2. FIX : MODIFIER LE TRIGGER
-- ═══════════════════════════════════════════════════════════════

-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS trigger_check_profile_complete ON users;
DROP FUNCTION IF EXISTS check_profile_complete();

-- Créer la nouvelle fonction avec logique corrigée
CREATE OR REPLACE FUNCTION check_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour les étudiants uniquement
  IF NEW.role = 'student' THEN
    -- Vérifier si tous les champs obligatoires sont remplis
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
      -- IMPORTANT : Forcer FALSE si les champs ne sont pas remplis
      NEW.profile_completed = FALSE;
    END IF;
  ELSE
    -- Pour les professeurs et admins, profil complet par défaut
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
-- 3. CORRIGER LES ÉTUDIANTS EXISTANTS
-- ═══════════════════════════════════════════════════════════════

-- Forcer profile_completed = FALSE pour les étudiants sans profil complet
UPDATE users
SET profile_completed = FALSE
WHERE role = 'student'
  AND (
    country IS NULL OR country = ''
    OR phone IS NULL OR phone = ''
    OR currency IS NULL OR currency = ''
    OR education_level IS NULL OR education_level = ''
  );

-- Forcer profile_completed = TRUE pour les étudiants avec profil complet
UPDATE users
SET profile_completed = TRUE
WHERE role = 'student'
  AND country IS NOT NULL AND country != ''
  AND phone IS NOT NULL AND phone != ''
  AND currency IS NOT NULL AND currency != ''
  AND education_level IS NOT NULL AND education_level != '';

-- Forcer profile_completed = TRUE pour tous les professeurs
UPDATE users
SET profile_completed = TRUE
WHERE role = 'teacher';

-- ═══════════════════════════════════════════════════════════════
-- 4. VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════

-- Voir l'état après correction
SELECT
  role,
  COUNT(*) as total,
  COUNT(CASE WHEN profile_completed = TRUE THEN 1 END) as complets,
  COUNT(CASE WHEN profile_completed = FALSE THEN 1 END) as incomplets,
  COUNT(CASE WHEN profile_completed IS NULL THEN 1 END) as null_values
FROM users
GROUP BY role;

-- Voir les étudiants avec profil incomplet
SELECT
  id,
  email,
  display_name,
  country,
  phone,
  currency,
  education_level,
  profile_completed,
  created_at
FROM users
WHERE role = 'student'
  AND profile_completed = FALSE
ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- ✅ FIX TERMINÉ
-- ═══════════════════════════════════════════════════════════════

-- Test : Créer un utilisateur test pour vérifier
-- (À exécuter manuellement si besoin)
/*
INSERT INTO users (email, role, display_name)
VALUES ('test-student@example.com', 'student', 'Test Student')
RETURNING id, email, role, profile_completed;

-- Résultat attendu : profile_completed = FALSE
*/
