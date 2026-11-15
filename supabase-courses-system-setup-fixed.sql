-- =====================================================
-- Jules Class Go - Système de Cours (VERSION CORRIGÉE)
-- Séparer CLASSES (groupes d'élèves) et COURS (contenus pédagogiques)
-- =====================================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Teachers can view their classroom's courses" ON courses;
DROP POLICY IF EXISTS "Teachers can create courses for their classrooms" ON courses;
DROP POLICY IF EXISTS "Teachers can update their classroom's courses" ON courses;
DROP POLICY IF EXISTS "Teachers can delete their classroom's courses" ON courses;
DROP POLICY IF EXISTS "Students can view published courses" ON courses;

-- Supprimer les anciens triggers si ils existent
DROP TRIGGER IF EXISTS courses_updated_at ON courses;
DROP TRIGGER IF EXISTS update_course_stats_on_chapter_insert ON chapters;
DROP TRIGGER IF EXISTS update_course_stats_on_chapter_update ON chapters;
DROP TRIGGER IF EXISTS update_course_stats_on_chapter_delete ON chapters;

-- Supprimer les anciennes fonctions si elles existent
DROP FUNCTION IF EXISTS update_courses_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_course_stats() CASCADE;

-- Supprimer la table courses si elle existe (attention: perte de données!)
-- Commentez cette ligne si vous voulez garder les données existantes
DROP TABLE IF EXISTS courses CASCADE;

-- =====================================================
-- CRÉATION DE LA TABLE COURSES
-- =====================================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation avec la classe (groupe d'élèves)
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,

  -- Informations de base
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Informations pédagogiques
  learning_objectives TEXT[] DEFAULT '{}', -- Objectifs d'apprentissage
  prerequisites TEXT[] DEFAULT '{}',        -- Prérequis
  competences TEXT[] DEFAULT '{}',          -- Compétences acquises

  -- Durée et organisation
  duration_weeks INTEGER DEFAULT 12,
  duration_hours INTEGER,                   -- Durée totale en heures

  -- Structure
  total_chapters INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,

  -- Métadonnées
  order_index INTEGER DEFAULT 0,           -- Ordre dans la classe
  is_published BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================
CREATE INDEX idx_courses_classroom ON courses(classroom_id);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

-- Contrainte unique pour l'ordre dans une classe
CREATE UNIQUE INDEX unique_course_order ON courses(classroom_id, order_index);

-- =====================================================
-- MODIFIER LA TABLE CHAPTERS
-- =====================================================
-- Ajouter la colonne course_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE chapters ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    CREATE INDEX idx_chapters_course ON chapters(course_id);
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view their classroom's courses
CREATE POLICY "Teachers can view their classroom's courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = courses.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can create courses for their classrooms
CREATE POLICY "Teachers can create courses for their classrooms"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = courses.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can update their classroom's courses
CREATE POLICY "Teachers can update their classroom's courses"
  ON courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = courses.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can delete their classroom's courses
CREATE POLICY "Teachers can delete their classroom's courses"
  ON courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = courses.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
  );

-- Policy: Students can view published courses of their enrolled classrooms
CREATE POLICY "Students can view published courses"
  ON courses FOR SELECT
  USING (
    courses.is_published = true
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.classroom_id = courses.classroom_id
      AND enrollments.student_id = auth.uid()
    )
  );

-- =====================================================
-- FONCTIONS ET TRIGGERS
-- =====================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();

-- Fonction pour calculer automatiquement total_chapters et total_lessons
CREATE OR REPLACE FUNCTION update_course_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id UUID;
BEGIN
  -- Déterminer le course_id selon le type d'opération
  IF TG_OP = 'DELETE' THEN
    v_course_id := OLD.course_id;
  ELSE
    v_course_id := NEW.course_id;
  END IF;

  -- Mettre à jour les stats si course_id existe
  IF v_course_id IS NOT NULL THEN
    UPDATE courses
    SET
      total_chapters = (
        SELECT COUNT(*)
        FROM chapters
        WHERE course_id = v_course_id
      ),
      total_lessons = (
        SELECT COUNT(*)
        FROM lessons
        WHERE chapter_id IN (
          SELECT id FROM chapters WHERE course_id = v_course_id
        )
      )
    WHERE id = v_course_id;
  END IF;

  -- Retourner la bonne valeur selon l'opération
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers sur chapters pour mettre à jour les stats
CREATE TRIGGER update_course_stats_on_chapter_insert
  AFTER INSERT ON chapters
  FOR EACH ROW
  WHEN (NEW.course_id IS NOT NULL)
  EXECUTE FUNCTION update_course_stats();

CREATE TRIGGER update_course_stats_on_chapter_update
  AFTER UPDATE ON chapters
  FOR EACH ROW
  WHEN (NEW.course_id IS NOT NULL OR OLD.course_id IS NOT NULL)
  EXECUTE FUNCTION update_course_stats();

CREATE TRIGGER update_course_stats_on_chapter_delete
  AFTER DELETE ON chapters
  FOR EACH ROW
  WHEN (OLD.course_id IS NOT NULL)
  EXECUTE FUNCTION update_course_stats();

-- =====================================================
-- COMMENTAIRES
-- =====================================================
COMMENT ON TABLE courses IS 'Cours (contenus pédagogiques) attribués à des classes (groupes d''élèves)';
COMMENT ON COLUMN courses.classroom_id IS 'La classe (groupe d''élèves) à laquelle ce cours est attribué';
COMMENT ON COLUMN courses.learning_objectives IS 'Objectifs d''apprentissage du cours';
COMMENT ON COLUMN courses.prerequisites IS 'Prérequis nécessaires pour suivre ce cours';
COMMENT ON COLUMN courses.competences IS 'Compétences acquises à la fin du cours';
COMMENT ON COLUMN courses.duration_weeks IS 'Durée du cours en semaines';
COMMENT ON COLUMN courses.duration_hours IS 'Durée totale du cours en heures';
COMMENT ON COLUMN courses.total_chapters IS 'Nombre total de chapitres (calculé automatiquement)';
COMMENT ON COLUMN courses.total_lessons IS 'Nombre total de leçons (calculé automatiquement)';
COMMENT ON COLUMN courses.is_published IS 'Cours publié et visible par les élèves';
COMMENT ON COLUMN courses.order_index IS 'Ordre d''affichage du cours dans la classe';

-- =====================================================
-- VÉRIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Table courses créée avec succès';
  RAISE NOTICE '✅ % policies créées', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'courses');
  RAISE NOTICE '✅ % triggers créés', (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'courses'::regclass);
END $$;

-- Afficher un exemple de structure
SELECT
  'courses' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;
