-- =====================================================
-- Jules Class Go - LiveKit Sessions System
-- Système de sessions live et 1-to-1
-- =====================================================

-- =====================================================
-- DIAGNOSTIC: Vérification des tables existantes
-- =====================================================
-- Décommentez pour vérifier la structure de vos tables:
/*
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'enrollments'
AND table_schema = 'public';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND table_schema = 'public';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'classrooms'
AND table_schema = 'public';
*/
-- =====================================================

-- 1. TABLE: live_sessions
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Pour sessions 1-to-1

  -- Session details
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('group', 'one_to_one')),

  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60, -- en minutes

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),

  -- LiveKit
  livekit_room TEXT UNIQUE,
  livekit_room_sid TEXT,
  max_participants INTEGER DEFAULT 50,

  -- Recording
  recording_enabled BOOLEAN DEFAULT false,
  recording_url TEXT,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher ON live_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_classroom ON live_sessions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_student ON live_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON live_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_room ON live_sessions(livekit_room);

-- 2. TABLE: session_participants (pour tracking)
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Participation
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Metadata
  device_type TEXT,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);

-- 3. TABLE: session_chat_messages (chat pendant la session)
CREATE TABLE IF NOT EXISTS session_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_chat_session ON session_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_chat_created ON session_chat_messages(created_at);

-- 4. ROW LEVEL SECURITY
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour live_sessions

-- Enseignants peuvent créer et gérer leurs sessions
CREATE POLICY "Teachers manage own sessions"
ON live_sessions FOR ALL
USING (teacher_id = auth.uid());

-- Étudiants peuvent voir les sessions de leurs cours
-- IMPORTANT: Cette politique nécessite la table 'enrollments'
-- Si vous obtenez une erreur "column does not exist":
-- 1. Vérifiez que la table 'enrollments' existe
-- 2. Exécutez le diagnostic ci-dessus pour voir les colonnes
-- 3. Remplacez 'student_id' par le nom correct de la colonne (ex: 'user_id')
-- 4. Ou commentez cette politique temporairement et créez-la plus tard

DO $$
BEGIN
  -- Essai de créer la politique avec student_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments'
    AND column_name = 'student_id'
  ) THEN
    EXECUTE '
      CREATE POLICY "Students view classroom sessions"
      ON live_sessions FOR SELECT
      USING (
        session_type = ''group''
        AND status != ''cancelled''
        AND classroom_id IN (
          SELECT classroom_id FROM enrollments
          WHERE student_id = auth.uid()
          AND status = ''active''
        )
      )
    ';
  -- Essai avec user_id si student_id n'existe pas
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments'
    AND column_name = 'user_id'
  ) THEN
    EXECUTE '
      CREATE POLICY "Students view classroom sessions"
      ON live_sessions FOR SELECT
      USING (
        session_type = ''group''
        AND status != ''cancelled''
        AND classroom_id IN (
          SELECT classroom_id FROM enrollments
          WHERE user_id = auth.uid()
          AND status = ''active''
        )
      )
    ';
  ELSE
    RAISE NOTICE 'Cannot create "Students view classroom sessions" policy: enrollments table or student_id/user_id column not found';
  END IF;
END $$;

-- Étudiants peuvent voir leurs sessions 1-to-1
CREATE POLICY "Students view own one-to-one sessions"
ON live_sessions FOR SELECT
USING (
  session_type = 'one_to_one'
  AND student_id = auth.uid()
);

-- RLS Policies pour session_participants

CREATE POLICY "Users view own participation"
ON session_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users insert own participation"
ON session_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies pour session_chat_messages

CREATE POLICY "Participants view session chat"
ON session_chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM session_participants
    WHERE session_participants.session_id = session_chat_messages.session_id
    AND session_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Participants send messages"
ON session_chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM session_participants
    WHERE session_participants.session_id = session_chat_messages.session_id
    AND session_participants.user_id = auth.uid()
  )
);

-- 5. FUNCTIONS

-- Fonction pour générer un nom de room unique
CREATE OR REPLACE FUNCTION generate_livekit_room_name()
RETURNS TEXT AS $$
DECLARE
  room_name TEXT;
BEGIN
  room_name := 'room_' || gen_random_uuid()::TEXT;
  RETURN room_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour démarrer une session
CREATE OR REPLACE FUNCTION start_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE live_sessions
  SET
    status = 'live',
    started_at = NOW()
  WHERE id = p_session_id
  AND teacher_id = auth.uid()
  AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour terminer une session
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE live_sessions
  SET
    status = 'ended',
    ended_at = NOW()
  WHERE id = p_session_id
  AND teacher_id = auth.uid()
  AND status = 'live';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour annuler une session
CREATE OR REPLACE FUNCTION cancel_session(p_session_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE live_sessions
  SET
    status = 'cancelled',
    description = COALESCE(p_reason, description)
  WHERE id = p_session_id
  AND teacher_id = auth.uid()
  AND status = 'scheduled';

  -- Créer une notification pour les participants
  -- (À implémenter selon votre système de notifications)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rejoindre une session
CREATE OR REPLACE FUNCTION join_session(
  p_session_id UUID,
  p_device_type TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  participant_id UUID;
BEGIN
  INSERT INTO session_participants (
    session_id,
    user_id,
    device_type,
    user_agent
  ) VALUES (
    p_session_id,
    auth.uid(),
    p_device_type,
    p_user_agent
  )
  ON CONFLICT (session_id, user_id) DO UPDATE
  SET joined_at = NOW()
  RETURNING id INTO participant_id;

  RETURN participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour quitter une session
CREATE OR REPLACE FUNCTION leave_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE session_participants
  SET
    left_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - joined_at))::INTEGER
  WHERE session_id = p_session_id
  AND user_id = auth.uid()
  AND left_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGERS

-- Trigger pour update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER live_sessions_updated_at
BEFORE UPDATE ON live_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger pour générer le room name si vide
CREATE OR REPLACE FUNCTION ensure_livekit_room()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.livekit_room IS NULL THEN
    NEW.livekit_room = generate_livekit_room_name();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_livekit_room_trigger
BEFORE INSERT ON live_sessions
FOR EACH ROW
EXECUTE FUNCTION ensure_livekit_room();

-- 7. VIEWS

-- Vue pour les sessions à venir
CREATE OR REPLACE VIEW upcoming_sessions AS
SELECT
  ls.*,
  u.display_name as teacher_name,
  u.avatar_url as teacher_avatar,
  c.title as classroom_title,
  COUNT(DISTINCT sp.user_id) as participant_count
FROM live_sessions ls
LEFT JOIN users u ON u.id = ls.teacher_id
LEFT JOIN classrooms c ON c.id = ls.classroom_id
LEFT JOIN session_participants sp ON sp.session_id = ls.id
WHERE ls.status = 'scheduled'
AND ls.scheduled_at > NOW()
GROUP BY ls.id, u.display_name, u.avatar_url, c.title
ORDER BY ls.scheduled_at ASC;

-- Vue pour les sessions en cours
CREATE OR REPLACE VIEW active_sessions AS
SELECT
  ls.*,
  u.display_name as teacher_name,
  u.avatar_url as teacher_avatar,
  c.title as classroom_title,
  COUNT(DISTINCT sp.user_id) as current_participants
FROM live_sessions ls
LEFT JOIN users u ON u.id = ls.teacher_id
LEFT JOIN classrooms c ON c.id = ls.classroom_id
LEFT JOIN session_participants sp ON sp.session_id = ls.id AND sp.left_at IS NULL
WHERE ls.status = 'live'
GROUP BY ls.id, u.display_name, u.avatar_url, c.title;

-- 8. STORAGE BUCKET pour enregistrements
-- À créer dans Supabase Storage UI:
-- Nom: 'session-recordings'
-- Type: Private

-- POLICIES Storage (à appliquer via SQL ou UI):
/*
CREATE POLICY "Teachers upload recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-recordings'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authorized users view recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'session-recordings'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.teacher_id = auth.uid()
      AND storage.filename(name) LIKE live_sessions.livekit_room || '%'
    )
  )
);
*/

-- 9. VÉRIFICATION
SELECT 'Tables créées:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('live_sessions', 'session_participants', 'session_chat_messages');

SELECT 'Vues créées:' as status;
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('upcoming_sessions', 'active_sessions');

SELECT 'Fonctions créées:' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('start_session', 'end_session', 'cancel_session', 'join_session', 'leave_session');

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Prochaines étapes:
-- 1. Configurer les variables d'environnement LiveKit
-- 2. Créer les API endpoints pour tokens LiveKit
-- 3. Implémenter les composants React
-- 4. Créer le bucket 'session-recordings'
-- =====================================================
