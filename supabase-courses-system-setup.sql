-- =====================================================
-- Jules Class Go - Système de Cours
-- Séparer CLASSES (groupes d'élèves) et COURS (contenus pédagogiques)
-- =====================================================

-- Table COURSES: Contenus pédagogiques attribués à une classe
CREATE TABLE IF NOT EXISTS courses (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index pour performance
  CONSTRAINT unique_course_order UNIQUE(classroom_id, order_index)
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_courses_classroom ON courses(classroom_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- Mettre à jour les chapters existants pour pointer vers courses au lieu de classrooms
-- Si la colonne course_id n'existe pas encore dans chapters
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

-- RLS Policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own courses
CREATE POLICY "Teachers can view their classroom's courses"
  ON courses FOR SELECT
  USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create courses for their classrooms"
  ON courses FOR INSERT
  WITH CHECK (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their classroom's courses"
  ON courses FOR UPDATE
  USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete their classroom's courses"
  ON courses FOR DELETE
  USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

-- Students can view published courses of their enrolled classrooms
CREATE POLICY "Students can view published courses"
  ON courses FOR SELECT
  USING (
    is_published = true AND
    classroom_id IN (
      SELECT classroom_id FROM enrollments WHERE student_id = auth.uid()
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();

-- Fonction pour calculer total_chapters et total_lessons
CREATE OR REPLACE FUNCTION update_course_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET
    total_chapters = (SELECT COUNT(*) FROM chapters WHERE course_id = NEW.course_id),
    total_lessons = (SELECT COUNT(*) FROM lessons WHERE chapter_id IN (SELECT id FROM chapters WHERE course_id = NEW.course_id))
  WHERE id = NEW.course_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers sur chapters pour mettre à jour les stats
CREATE TRIGGER update_course_stats_on_chapter_insert
  AFTER INSERT ON chapters
  FOR EACH ROW
  WHEN (NEW.course_id IS NOT NULL)
  EXECUTE FUNCTION update_course_stats();

CREATE TRIGGER update_course_stats_on_chapter_delete
  AFTER DELETE ON chapters
  FOR EACH ROW
  WHEN (OLD.course_id IS NOT NULL)
  EXECUTE FUNCTION update_course_stats();

COMMENT ON TABLE courses IS 'Cours (contenus pédagogiques) attribués à des classes (groupes d''élèves)';
COMMENT ON COLUMN courses.classroom_id IS 'La classe (groupe d''élèves) à laquelle ce cours est attribué';
COMMENT ON COLUMN courses.learning_objectives IS 'Objectifs d''apprentissage du cours';
COMMENT ON COLUMN courses.prerequisites IS 'Prérequis nécessaires pour suivre ce cours';
COMMENT ON COLUMN courses.competences IS 'Compétences acquises à la fin du cours';
