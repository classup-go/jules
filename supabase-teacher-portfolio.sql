-- =====================================================
-- Jules Class Go - Teacher Portfolio System
-- Ajout des champs pour le portfolio enseignant
-- =====================================================

-- Ajouter les colonnes pour le portfolio enseignant dans la table users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS presentation_video_url TEXT,
ADD COLUMN IF NOT EXISTS course_examples JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;

-- Commentaires pour documentation
COMMENT ON COLUMN users.presentation_video_url IS 'URL de la vidéo de présentation du professeur (stockée dans Supabase Storage)';
COMMENT ON COLUMN users.course_examples IS 'Exemples de cours du professeur - Array de {title, description, thumbnail, duration}';
COMMENT ON COLUMN users.achievements IS 'Réalisations et certifications du professeur - Array de {title, description, icon, date}';

-- Créer un index pour les recherches JSON
CREATE INDEX IF NOT EXISTS idx_users_portfolio ON users USING gin (course_examples, achievements);

-- Fonction helper pour ajouter un exemple de cours
CREATE OR REPLACE FUNCTION add_course_example(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_thumbnail TEXT DEFAULT NULL,
  p_duration TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET course_examples = course_examples || jsonb_build_object(
    'title', p_title,
    'description', p_description,
    'thumbnail', p_thumbnail,
    'duration', p_duration
  )
  WHERE id = p_user_id AND role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper pour ajouter une réalisation
CREATE OR REPLACE FUNCTION add_achievement(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_icon TEXT DEFAULT '🎖️',
  p_date TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET achievements = achievements || jsonb_build_object(
    'title', p_title,
    'description', p_description,
    'icon', p_icon,
    'date', p_date
  )
  WHERE id = p_user_id AND role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour supprimer un exemple de cours par index
CREATE OR REPLACE FUNCTION remove_course_example(
  p_user_id UUID,
  p_index INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET course_examples = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(course_examples) WITH ORDINALITY arr(elem, idx)
    WHERE idx != p_index + 1
  )
  WHERE id = p_user_id AND role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour supprimer une réalisation par index
CREATE OR REPLACE FUNCTION remove_achievement(
  p_user_id UUID,
  p_index INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET achievements = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(achievements) WITH ORDINALITY arr(elem, idx)
    WHERE idx != p_index + 1
  )
  WHERE id = p_user_id AND role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le bucket Supabase Storage pour les vidéos de présentation
-- NOTE: À exécuter dans la console Supabase Storage ou via l'API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('teacher-presentations', 'teacher-presentations', false);

-- Politique de sécurité pour le bucket teacher-presentations
-- Permettre aux enseignants d'uploader leurs propres vidéos
-- CREATE POLICY "Teachers can upload presentation videos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'teacher-presentations'
--   AND auth.role() = 'authenticated'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Permettre à tous de voir les vidéos de présentation via signed URLs
-- CREATE POLICY "Anyone can view presentation videos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'teacher-presentations');

-- Permettre aux enseignants de supprimer leurs propres vidéos
-- CREATE POLICY "Teachers can delete own presentation videos"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'teacher-presentations'
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- =====================================================
-- Exemples de données de test (optionnel)
-- =====================================================

-- Exemple 1: Ajouter une vidéo de présentation
-- UPDATE users
-- SET presentation_video_url = 'https://your-supabase-url.com/storage/v1/object/public/teacher-presentations/user-id/presentation.mp4'
-- WHERE id = 'teacher-user-id';

-- Exemple 2: Ajouter un exemple de cours
-- SELECT add_course_example(
--   'teacher-user-id',
--   'Introduction aux Mathématiques',
--   'Cours complet sur les bases des mathématiques pour le niveau 6ème',
--   'https://example.com/thumbnail.jpg',
--   '45 minutes'
-- );

-- Exemple 3: Ajouter une réalisation
-- SELECT add_achievement(
--   'teacher-user-id',
--   'Certification Professeur Agrégé',
--   'Diplôme obtenu avec mention très bien',
--   '🎓',
--   'Juin 2020'
-- );

-- =====================================================
-- Vérification
-- =====================================================

-- Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('presentation_video_url', 'course_examples', 'achievements');

-- Vérifier les fonctions créées
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('add_course_example', 'add_achievement', 'remove_course_example', 'remove_achievement')
AND routine_schema = 'public';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Prochaines étapes :
-- 1. Exécuter ce script dans Supabase SQL Editor
-- 2. Créer le bucket 'teacher-presentations' dans Supabase Storage (PRIVATE)
-- 3. Appliquer les storage policies (commentées ci-dessus)
-- 4. Créer l'interface d'upload dans le dashboard enseignant
-- =====================================================
