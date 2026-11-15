-- =====================================================
-- SUPPRESSION DE L'ANCIEN SYSTÈME teacher_profiles
-- Ce script supprime l'ancienne table et unifie vers le profil pro
-- =====================================================

-- Désactiver les contraintes temporairement
SET session_replication_role = replica;

-- Supprimer les anciennes tables
DROP TABLE IF EXISTS teacher_reviews CASCADE;
DROP TABLE IF EXISTS teacher_availability CASCADE;
DROP TABLE IF EXISTS teacher_profiles CASCADE;

-- Réactiver les contraintes
SET session_replication_role = DEFAULT;

RAISE NOTICE '✅ Ancien système teacher_profiles supprimé avec succès !';
RAISE NOTICE '   Toutes les données sont maintenant dans la table users';
RAISE NOTICE '   - Profils: users.profile_completed';
RAISE NOTICE '   - Notes: users.rating';
RAISE NOTICE '   - Avis: Utiliser la nouvelle table si nécessaire';
