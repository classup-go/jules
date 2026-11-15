-- =====================================================
-- Amélioration du Profil Professeur
-- Service de Mise en Relation Professeur-Étudiant
-- =====================================================

-- Ajouter les colonnes pour un profil professeur complet
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT, -- "1-2 ans", "3-5 ans", "5-10 ans", "10+ ans"
ADD COLUMN IF NOT EXISTS subjects TEXT[], -- Array de matières enseignées
ADD COLUMN IF NOT EXISTS levels TEXT[], -- Array de niveaux enseignés (6ème, 5ème, Terminale, etc.)
ADD COLUMN IF NOT EXISTS teaching_mode TEXT[], -- Array: 'online', 'in_person', 'at_home'
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2), -- Prix horaire en euros
ADD COLUMN IF NOT EXISTS can_travel BOOLEAN DEFAULT false, -- Peut se déplacer
ADD COLUMN IF NOT EXISTS travel_distance INTEGER, -- Distance max de déplacement en km
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true, -- Disponible pour nouveaux élèves
ADD COLUMN IF NOT EXISTS specialties TEXT[], -- Spécialités (préparation bac, soutien scolaire, etc.)
ADD COLUMN IF NOT EXISTS certifications TEXT[], -- Diplômes et certifications
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['Français'], -- Langues parlées
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0, -- Note moyenne
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0, -- Nombre d'avis
ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0, -- Nombre total d'élèves
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false, -- Profil complété à 100%
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false; -- Profil vérifié

-- Index pour la recherche de professeurs
CREATE INDEX IF NOT EXISTS idx_users_role_teacher ON users(role) WHERE role = 'teacher';
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_is_available ON users(is_available);
CREATE INDEX IF NOT EXISTS idx_users_subjects ON users USING gin(subjects);
CREATE INDEX IF NOT EXISTS idx_users_levels ON users USING gin(levels);
CREATE INDEX IF NOT EXISTS idx_users_teaching_mode ON users USING gin(teaching_mode);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating);

-- =====================================================
-- Table: teacher_reviews (Avis sur les professeurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS teacher_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id) -- Un étudiant ne peut laisser qu'un seul avis par professeur
);

CREATE INDEX IF NOT EXISTS idx_teacher_reviews_teacher ON teacher_reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_reviews_student ON teacher_reviews(student_id);

-- RLS pour teacher_reviews
ALTER TABLE teacher_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON teacher_reviews FOR SELECT
  USING (true);

CREATE POLICY "Students create reviews"
  ON teacher_reviews FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own reviews"
  ON teacher_reviews FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Students delete own reviews"
  ON teacher_reviews FOR DELETE
  USING (auth.uid() = student_id);

-- =====================================================
-- Table: teacher_availability (Disponibilités)
-- =====================================================
CREATE TABLE IF NOT EXISTS teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Dimanche, 6=Samedi
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher ON teacher_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_day ON teacher_availability(day_of_week);

-- RLS pour teacher_availability
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability"
  ON teacher_availability FOR SELECT
  USING (true);

CREATE POLICY "Teachers manage own availability"
  ON teacher_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = teacher_availability.teacher_id
      AND id = auth.uid()
    )
  );

-- =====================================================
-- Fonction: Calculer la note moyenne d'un professeur
-- =====================================================
CREATE OR REPLACE FUNCTION update_teacher_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM teacher_reviews
      WHERE teacher_id = NEW.teacher_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM teacher_reviews
      WHERE teacher_id = NEW.teacher_id
    )
  WHERE id = NEW.teacher_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement la note
DROP TRIGGER IF EXISTS trigger_update_teacher_rating ON teacher_reviews;
CREATE TRIGGER trigger_update_teacher_rating
  AFTER INSERT OR UPDATE OR DELETE ON teacher_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_rating();

-- =====================================================
-- Fonction: Vérifier si le profil est complet
-- =====================================================
CREATE OR REPLACE FUNCTION check_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'teacher' THEN
    NEW.profile_completed := (
      NEW.display_name IS NOT NULL AND
      NEW.bio IS NOT NULL AND
      NEW.phone IS NOT NULL AND
      NEW.city IS NOT NULL AND
      NEW.experience IS NOT NULL AND
      array_length(NEW.subjects, 1) > 0 AND
      array_length(NEW.levels, 1) > 0 AND
      array_length(NEW.teaching_mode, 1) > 0 AND
      NEW.hourly_rate IS NOT NULL AND
      NEW.hourly_rate > 0
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier automatiquement la complétion du profil
DROP TRIGGER IF EXISTS trigger_check_profile_completion ON users;
CREATE TRIGGER trigger_check_profile_completion
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_completion();

-- =====================================================
-- Vue: Profils professeurs publics
-- =====================================================
CREATE OR REPLACE VIEW public_teacher_profiles AS
SELECT
  u.id,
  u.display_name,
  u.avatar_url,
  u.bio,
  u.city,
  u.experience,
  u.subjects,
  u.levels,
  u.teaching_mode,
  u.hourly_rate,
  u.can_travel,
  u.travel_distance,
  u.is_available,
  u.specialties,
  u.certifications,
  u.languages,
  u.rating,
  u.total_reviews,
  u.total_students,
  u.profile_completed,
  u.verified,
  u.created_at
FROM users u
WHERE u.role = 'teacher'
  AND u.profile_completed = true
  AND u.is_available = true;

-- =====================================================
-- Fonction: Rechercher des professeurs
-- =====================================================
CREATE OR REPLACE FUNCTION search_teachers(
  search_subject TEXT DEFAULT NULL,
  search_level TEXT DEFAULT NULL,
  search_city TEXT DEFAULT NULL,
  search_mode TEXT DEFAULT NULL,
  min_rating DECIMAL DEFAULT 0,
  max_hourly_rate DECIMAL DEFAULT NULL,
  only_can_travel BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  experience TEXT,
  subjects TEXT[],
  levels TEXT[],
  teaching_mode TEXT[],
  hourly_rate DECIMAL,
  can_travel BOOLEAN,
  rating DECIMAL,
  total_reviews INTEGER,
  profile_completed BOOLEAN,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.display_name,
    u.avatar_url,
    u.bio,
    u.city,
    u.experience,
    u.subjects,
    u.levels,
    u.teaching_mode,
    u.hourly_rate,
    u.can_travel,
    u.rating,
    u.total_reviews,
    u.profile_completed,
    u.verified
  FROM users u
  WHERE u.role = 'teacher'
    AND u.profile_completed = true
    AND u.is_available = true
    AND (search_subject IS NULL OR search_subject = ANY(u.subjects))
    AND (search_level IS NULL OR search_level = ANY(u.levels))
    AND (search_city IS NULL OR u.city ILIKE '%' || search_city || '%')
    AND (search_mode IS NULL OR search_mode = ANY(u.teaching_mode))
    AND u.rating >= min_rating
    AND (max_hourly_rate IS NULL OR u.hourly_rate <= max_hourly_rate)
    AND (only_can_travel = false OR u.can_travel = true)
  ORDER BY u.verified DESC, u.rating DESC, u.total_reviews DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Données de référence
-- =====================================================

-- Vues matérialisées pour les statistiques (optionnel)
CREATE MATERIALIZED VIEW IF NOT EXISTS teacher_stats AS
SELECT
  COUNT(*) FILTER (WHERE profile_completed = true) as total_teachers,
  COUNT(*) FILTER (WHERE is_available = true) as available_teachers,
  AVG(hourly_rate) FILTER (WHERE hourly_rate > 0) as avg_hourly_rate,
  AVG(rating) FILTER (WHERE total_reviews > 0) as avg_rating
FROM users
WHERE role = 'teacher';

-- Rafraîchir les stats une fois par jour
CREATE INDEX IF NOT EXISTS idx_teacher_stats ON teacher_stats(total_teachers);

-- =====================================================
-- Confirmation
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Profil professeur amélioré avec succès !';
  RAISE NOTICE '✅ Nouvelles colonnes ajoutées: phone, address, city, subjects, levels, teaching_mode, hourly_rate, etc.';
  RAISE NOTICE '✅ Table teacher_reviews créée pour les avis';
  RAISE NOTICE '✅ Table teacher_availability créée pour les disponibilités';
  RAISE NOTICE '✅ Fonction de recherche search_teachers() créée';
  RAISE NOTICE '✅ Triggers automatiques pour note et complétion du profil';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Le système de mise en relation est prêt !';
END $$;
