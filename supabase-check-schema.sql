-- =====================================================
-- Diagnostic rapide - Vérifier la structure de la base
-- =====================================================
-- Exécutez ce fichier AVANT supabase-livekit-setup.sql
-- pour identifier les colonnes de vos tables
-- =====================================================

-- 1. Vérifier la table enrollments
SELECT 'Structure de la table enrollments:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier la table users
SELECT 'Structure de la table users:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier la table classrooms
SELECT 'Structure de la table classrooms:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'classrooms'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Vérifier si les tables existent
SELECT 'Tables existantes:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'classrooms', 'enrollments', 'live_sessions')
ORDER BY table_name;

-- =====================================================
-- RÉSULTATS ATTENDUS:
-- =====================================================
-- La table 'enrollments' devrait avoir:
--   - classroom_id (uuid)
--   - student_id (uuid) OU user_id (uuid)
--   - status (text)
--
-- La table 'users' devrait avoir:
--   - id (uuid)
--   - email (text)
--   - role (text)
--
-- La table 'classrooms' devrait avoir:
--   - id (uuid)
--   - teacher_id (uuid)
--   - title (text)
-- =====================================================
