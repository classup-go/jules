-- =============================================
-- Trigger pour générer automatiquement room_id
-- =============================================

-- Fonction pour générer un room_id unique
CREATE OR REPLACE FUNCTION ensure_room_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.room_id IS NULL THEN
    NEW.room_id = 'room_' || gen_random_uuid()::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS ensure_room_id_trigger ON live_sessions;

-- Créer le trigger
CREATE TRIGGER ensure_room_id_trigger
BEFORE INSERT ON live_sessions
FOR EACH ROW
EXECUTE FUNCTION ensure_room_id();

-- =============================================
-- Mise à jour des sessions existantes sans room_id
-- =============================================

-- Générer des room_id pour les sessions existantes qui n'en ont pas
UPDATE live_sessions
SET room_id = 'room_' || gen_random_uuid()::TEXT
WHERE room_id IS NULL;

-- Vérification
SELECT
  COUNT(*) as total_sessions,
  COUNT(room_id) as sessions_with_room_id,
  COUNT(*) - COUNT(room_id) as sessions_without_room_id
FROM live_sessions;

-- =============================================
-- SETUP COMPLETE
-- =============================================
-- Maintenant toutes les nouvelles sessions auront
-- automatiquement un room_id unique généré
-- =============================================
