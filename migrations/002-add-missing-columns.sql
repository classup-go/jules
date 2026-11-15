-- =====================================================
-- MIGRATION 002: AJOUT COLONNES MANQUANTES
-- =====================================================
-- Objectif: Ajouter les colonnes nécessaires avant migrations 003 et 004
-- Date: 2026-01-22
-- =====================================================
-- IMPORTANT: Exécuter AVANT les migrations 003 et 004
-- =====================================================

-- =====================================================
-- ÉTAPE 0: CRÉER TABLE PROFILES SI N'EXISTE PAS
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Profils utilisateurs (professeurs et étudiants)';

-- =====================================================
-- ÉTAPE 1: COLONNES MANQUANTES DANS COURSES
-- =====================================================

-- Ajouter teacher_id si n'existe pas (sans FK pour l'instant)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS teacher_id UUID;

-- Ajouter la FK seulement si la table profiles existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE courses
    ADD CONSTRAINT fk_courses_teacher_id
    FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

    RAISE NOTICE '✅ FK courses.teacher_id → profiles.id créée';
  ELSE
    RAISE NOTICE '⚠️  Table profiles n''existe pas - FK non créée';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ FK courses.teacher_id → profiles.id déjà existante';
END $$;

-- Ajouter thumbnail si n'existe pas
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- Ajouter description si n'existe pas (probablement existe déjà)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ajouter title si n'existe pas
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS title TEXT;

-- Ajouter price et currency si n'existent pas
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Commentaires
COMMENT ON COLUMN courses.teacher_id IS 'ID du professeur propriétaire du programme';
COMMENT ON COLUMN courses.thumbnail IS 'URL de l''image de couverture du programme';
COMMENT ON COLUMN courses.description IS 'Description détaillée du programme';
COMMENT ON COLUMN courses.title IS 'Titre du programme';
COMMENT ON COLUMN courses.price IS 'Prix du programme';
COMMENT ON COLUMN courses.currency IS 'Devise du prix (EUR, TND, XOF, USD, CAD)';

-- =====================================================
-- ÉTAPE 2: COLONNES MANQUANTES DANS LESSONS
-- =====================================================

-- Ajouter content si n'existe pas
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS content TEXT;

-- Ajouter video_url si n'existe pas
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Ajouter is_free_preview si n'existe pas
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN DEFAULT false;

-- Ajouter duration_minutes si n'existe pas
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Ajouter order_index si n'existe pas
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Commentaires
COMMENT ON COLUMN lessons.content IS 'Contenu texte de la leçon (Markdown)';
COMMENT ON COLUMN lessons.video_url IS 'URL de la vidéo de la leçon (YouTube, Vimeo, etc.)';
COMMENT ON COLUMN lessons.is_free_preview IS 'Leçon accessible gratuitement en aperçu';
COMMENT ON COLUMN lessons.duration_minutes IS 'Durée estimée de la leçon en minutes';
COMMENT ON COLUMN lessons.order_index IS 'Position de la leçon dans le chapitre';

-- =====================================================
-- ÉTAPE 3: COLONNES MANQUANTES DANS CHAPTERS
-- =====================================================

-- Vérifier et ajouter description si n'existe pas
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN chapters.description IS 'Description du chapitre';

-- =====================================================
-- ÉTAPE 4: VÉRIFICATION DES COLONNES EXISTANTES
-- =====================================================

DO $$
DECLARE
  v_courses_has_thumbnail BOOLEAN;
  v_courses_has_description BOOLEAN;
  v_lessons_has_content BOOLEAN;
  v_lessons_has_video_url BOOLEAN;
  v_chapters_has_description BOOLEAN;
BEGIN
  -- Vérifier courses
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'thumbnail'
  ) INTO v_courses_has_thumbnail;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'description'
  ) INTO v_courses_has_description;

  -- Vérifier lessons
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'content'
  ) INTO v_lessons_has_content;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'video_url'
  ) INTO v_lessons_has_video_url;

  -- Vérifier chapters
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'description'
  ) INTO v_chapters_has_description;

  -- Afficher le résultat
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VÉRIFICATION DES COLONNES';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLE: courses';
  RAISE NOTICE '  - thumbnail: %', CASE WHEN v_courses_has_thumbnail THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  - description: %', CASE WHEN v_courses_has_description THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE 'TABLE: lessons';
  RAISE NOTICE '  - content: %', CASE WHEN v_lessons_has_content THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  - video_url: %', CASE WHEN v_lessons_has_video_url THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE 'TABLE: chapters';
  RAISE NOTICE '  - description: %', CASE WHEN v_chapters_has_description THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;

-- =====================================================
-- ÉTAPE 5: INDEX POUR PERFORMANCE
-- =====================================================

-- Index pour recherche par titre/description dans courses
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm
ON courses USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_description_trgm
ON courses USING gin (description gin_trgm_ops)
WHERE description IS NOT NULL;

-- Note: Ces index nécessitent l'extension pg_trgm
-- Si l'extension n'existe pas, ces commandes échoueront silencieusement
-- Vous pouvez activer l'extension avec: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- ÉTAPE 6: COLONNES ADDITIONNELLES UTILES
-- =====================================================

-- Ajouter is_published si n'existe pas (pour courses)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Ajouter is_published pour lessons si n'existe pas
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Ajouter is_published pour chapters si n'existe pas
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Commentaires
COMMENT ON COLUMN courses.is_published IS 'Programme publié et visible par les étudiants';
COMMENT ON COLUMN lessons.is_published IS 'Leçon publiée et accessible';
COMMENT ON COLUMN chapters.is_published IS 'Chapitre publié et accessible';

-- =====================================================
-- ÉTAPE 7: COLONNES TIMESTAMPS
-- =====================================================

-- Ajouter updated_at si n'existe pas
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger pour auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur courses
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Appliquer le trigger sur lessons
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Appliquer le trigger sur chapters
DROP TRIGGER IF EXISTS update_chapters_updated_at ON chapters;
CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON chapters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÉTAPE 8: VALIDATION FINALE
-- =====================================================

DO $$
DECLARE
  v_courses_count INTEGER;
  v_lessons_count INTEGER;
  v_chapters_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_courses_count FROM courses;
  SELECT COUNT(*) INTO v_lessons_count FROM lessons;
  SELECT COUNT(*) INTO v_chapters_count FROM chapters;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 MIGRATION 002 TERMINÉE AVEC SUCCÈS!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Colonnes ajoutées:';
  RAISE NOTICE '   - courses: thumbnail, description, is_published, updated_at';
  RAISE NOTICE '   - lessons: content, video_url, is_published, updated_at';
  RAISE NOTICE '   - chapters: description, is_published, updated_at';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Triggers créés pour auto-update updated_at';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Données existantes:';
  RAISE NOTICE '   - % cours', v_courses_count;
  RAISE NOTICE '   - % leçons', v_lessons_count;
  RAISE NOTICE '   - % chapitres', v_chapters_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Prochaine étape:';
  RAISE NOTICE '   Exécuter migration 003-unified-programme-model.sql';
  RAISE NOTICE '';
END $$;
