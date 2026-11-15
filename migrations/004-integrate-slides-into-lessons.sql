-- =====================================================
-- MIGRATION 004: INTÉGRATION SLIDES DANS LESSONS
-- =====================================================
-- Objectif: Lier le système presentations/slides aux lessons
-- Date: 2026-01-22
-- =====================================================

-- =====================================================
-- ÉTAPE 0: AJOUTER COLONNES MANQUANTES DANS PRESENTATIONS
-- =====================================================

-- Ajouter thumbnail si n'existe pas
ALTER TABLE presentations
ADD COLUMN IF NOT EXISTS thumbnail TEXT;

COMMENT ON COLUMN presentations.thumbnail IS 'URL de l''image de couverture de la présentation';

-- Ajouter is_public si n'existe pas
ALTER TABLE presentations
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

COMMENT ON COLUMN presentations.is_public IS 'Présentation publique visible par tous';

-- =====================================================
-- ÉTAPE 1: AJOUT COLONNE presentation_id DANS LESSONS
-- =====================================================

-- Ajouter la FK vers presentations
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS presentation_id UUID
REFERENCES presentations(id) ON DELETE SET NULL;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_lessons_presentation_id
ON lessons(presentation_id)
WHERE presentation_id IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN lessons.presentation_id IS 'Présentation (slides) associée à cette leçon - optionnel, alternative au contenu texte/vidéo';

-- =====================================================
-- ÉTAPE 2: CRÉER VUE LESSONS_WITH_CONTENT
-- =====================================================

-- Vue enrichie pour identifier le type de contenu de chaque leçon
CREATE OR REPLACE VIEW lessons_with_content AS
SELECT
  l.id,
  l.chapter_id,
  l.title,
  l.content,
  l.video_url,
  l.duration_minutes,
  l.order_index,
  l.is_free_preview,
  l.is_published,
  l.presentation_id,

  -- Détecter le type de contenu principal
  CASE
    WHEN l.presentation_id IS NOT NULL THEN 'slides'
    WHEN l.video_url IS NOT NULL AND l.video_url != '' THEN 'video'
    WHEN l.content IS NOT NULL AND l.content != '' THEN 'text'
    ELSE 'empty'
  END as content_type,

  -- Infos présentation si existe
  p.title as presentation_title,
  p.total_slides,
  p.thumbnail as presentation_thumbnail,

  -- Méta
  l.created_at,
  l.updated_at

FROM lessons l
LEFT JOIN presentations p ON l.presentation_id = p.id;

COMMENT ON VIEW lessons_with_content IS 'Vue enrichie des leçons avec détection automatique du type de contenu (text/video/slides/empty)';

-- =====================================================
-- ÉTAPE 3: FONCTION HELPER - GET LESSON CONTENT TYPE
-- =====================================================

CREATE OR REPLACE FUNCTION get_lesson_content_type(p_lesson_id UUID)
RETURNS TEXT AS $$
  SELECT content_type FROM lessons_with_content WHERE id = p_lesson_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_lesson_content_type IS 'Retourne le type de contenu principal d''une leçon: slides, video, text, ou empty';

-- =====================================================
-- ÉTAPE 4: TRIGGER AUTO-CALCUL duration_minutes
-- =====================================================

-- Si une présentation est liée, calculer duration_minutes basé sur les slides
CREATE OR REPLACE FUNCTION auto_calculate_lesson_duration()
RETURNS TRIGGER AS $$
DECLARE
  v_total_duration INTEGER;
BEGIN
  -- Si presentation_id est défini et duration_minutes NULL
  IF NEW.presentation_id IS NOT NULL AND NEW.duration_minutes IS NULL THEN

    -- Calculer durée totale des slides (si duration_seconds défini)
    SELECT COALESCE(SUM(duration_seconds), 0) / 60
    INTO v_total_duration
    FROM slides
    WHERE presentation_id = NEW.presentation_id;

    -- Si on a une durée calculée, l'utiliser
    IF v_total_duration > 0 THEN
      NEW.duration_minutes := v_total_duration;
    ELSE
      -- Sinon estimer: 1 minute par slide
      SELECT COUNT(*) INTO v_total_duration
      FROM slides
      WHERE presentation_id = NEW.presentation_id;

      NEW.duration_minutes := GREATEST(v_total_duration, 5); -- Min 5 minutes
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_calculate_lesson_duration ON lessons;
CREATE TRIGGER trigger_auto_calculate_lesson_duration
BEFORE INSERT OR UPDATE OF presentation_id ON lessons
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_lesson_duration();

COMMENT ON TRIGGER trigger_auto_calculate_lesson_duration ON lessons IS 'Calcule automatiquement duration_minutes quand une présentation est liée';

-- =====================================================
-- ÉTAPE 5: FONCTION POUR DUPLIQUER UNE PRÉSENTATION
-- =====================================================

-- Utile pour permettre aux profs de réutiliser des présentations
CREATE OR REPLACE FUNCTION duplicate_presentation(
  p_presentation_id UUID,
  p_new_teacher_id UUID DEFAULT NULL,
  p_new_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_presentation_id UUID;
  v_old_slide RECORD;
  v_new_slide_id UUID;
  v_teacher_id UUID;
  v_title TEXT;
BEGIN
  -- Déterminer teacher_id et titre
  SELECT teacher_id, title INTO v_teacher_id, v_title
  FROM presentations
  WHERE id = p_presentation_id;

  IF p_new_teacher_id IS NOT NULL THEN
    v_teacher_id := p_new_teacher_id;
  END IF;

  IF p_new_title IS NOT NULL THEN
    v_title := p_new_title;
  ELSE
    v_title := v_title || ' (Copie)';
  END IF;

  -- Dupliquer la présentation
  INSERT INTO presentations (
    teacher_id,
    title,
    description,
    thumbnail,
    is_public
  )
  SELECT
    v_teacher_id,
    v_title,
    description,
    thumbnail,
    false -- Copie privée par défaut
  FROM presentations
  WHERE id = p_presentation_id
  RETURNING id INTO v_new_presentation_id;

  -- Dupliquer toutes les slides
  FOR v_old_slide IN
    SELECT * FROM slides WHERE presentation_id = p_presentation_id ORDER BY order_index
  LOOP
    INSERT INTO slides (
      presentation_id,
      order_index,
      section_title,
      title,
      subtitle,
      layout,
      background_color,
      background_image,
      background_opacity,
      speaker_notes,
      duration_seconds,
      auto_advance,
      is_interactive,
      requires_completion
    ) VALUES (
      v_new_presentation_id,
      v_old_slide.order_index,
      v_old_slide.section_title,
      v_old_slide.title,
      v_old_slide.subtitle,
      v_old_slide.layout,
      v_old_slide.background_color,
      v_old_slide.background_image,
      v_old_slide.background_opacity,
      v_old_slide.speaker_notes,
      v_old_slide.duration_seconds,
      v_old_slide.auto_advance,
      v_old_slide.is_interactive,
      v_old_slide.requires_completion
    )
    RETURNING id INTO v_new_slide_id;

    -- Dupliquer les blocs de cette slide
    INSERT INTO slide_blocks (
      slide_id,
      block_type,
      order_index,
      column_index,
      content,
      style,
      animation,
      animation_delay,
      is_interactive,
      interaction_type
    )
    SELECT
      v_new_slide_id,
      block_type,
      order_index,
      column_index,
      content,
      style,
      animation,
      animation_delay,
      is_interactive,
      interaction_type
    FROM slide_blocks
    WHERE slide_id = v_old_slide.id;
  END LOOP;

  -- Mettre à jour total_slides
  UPDATE presentations
  SET total_slides = (SELECT COUNT(*) FROM slides WHERE presentation_id = v_new_presentation_id)
  WHERE id = v_new_presentation_id;

  RETURN v_new_presentation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION duplicate_presentation IS 'Duplique une présentation complète avec toutes ses slides et blocs';

-- =====================================================
-- ÉTAPE 6: FONCTION POUR LIER PRÉSENTATION À LEÇON
-- =====================================================

CREATE OR REPLACE FUNCTION link_presentation_to_lesson(
  p_lesson_id UUID,
  p_presentation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_lesson_exists BOOLEAN;
  v_presentation_exists BOOLEAN;
BEGIN
  -- Vérifier que la leçon existe
  SELECT EXISTS(SELECT 1 FROM lessons WHERE id = p_lesson_id)
  INTO v_lesson_exists;

  IF NOT v_lesson_exists THEN
    RAISE EXCEPTION 'Leçon % n''existe pas', p_lesson_id;
  END IF;

  -- Vérifier que la présentation existe
  SELECT EXISTS(SELECT 1 FROM presentations WHERE id = p_presentation_id)
  INTO v_presentation_exists;

  IF NOT v_presentation_exists THEN
    RAISE EXCEPTION 'Présentation % n''existe pas', p_presentation_id;
  END IF;

  -- Lier
  UPDATE lessons
  SET presentation_id = p_presentation_id
  WHERE id = p_lesson_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION link_presentation_to_lesson IS 'Lie une présentation existante à une leçon';

-- =====================================================
-- ÉTAPE 7: VUE POUR CHAPITRES AVEC STATS CONTENU
-- =====================================================

CREATE OR REPLACE VIEW chapters_with_content_stats AS
SELECT
  c.id,
  c.course_id,
  c.title,
  c.description,
  c.order_index,
  c.is_published,

  -- Stats des leçons
  COUNT(l.id) as total_lessons,
  COUNT(l.id) FILTER (WHERE l.is_published) as published_lessons,
  COALESCE(SUM(l.duration_minutes), 0) as total_duration_minutes,

  -- Stats par type de contenu
  COUNT(l.id) FILTER (WHERE l.presentation_id IS NOT NULL) as lessons_with_slides,
  COUNT(l.id) FILTER (WHERE l.video_url IS NOT NULL) as lessons_with_video,
  COUNT(l.id) FILTER (WHERE l.content IS NOT NULL AND l.content != '') as lessons_with_text,
  COUNT(l.id) FILTER (WHERE
    l.presentation_id IS NULL AND
    (l.video_url IS NULL OR l.video_url = '') AND
    (l.content IS NULL OR l.content = '')
  ) as lessons_empty,

  c.created_at,
  c.updated_at

FROM chapters c
LEFT JOIN lessons l ON c.id = l.chapter_id
GROUP BY c.id, c.course_id, c.title, c.description, c.order_index, c.is_published, c.created_at, c.updated_at;

COMMENT ON VIEW chapters_with_content_stats IS 'Chapitres avec statistiques détaillées sur le type de contenu des leçons';

-- =====================================================
-- ÉTAPE 8: POLITIQUE RLS POUR presentations
-- =====================================================

-- Vérifier si RLS est activé sur presentations
DO $$
BEGIN
  -- Activer RLS si pas encore fait
  ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE '✅ RLS activé sur presentations';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ RLS déjà activé sur presentations';
END $$;

-- Policy: Tout le monde peut voir les présentations publiques
DROP POLICY IF EXISTS "Public presentations are viewable by everyone" ON presentations;
CREATE POLICY "Public presentations are viewable by everyone"
ON presentations FOR SELECT
USING (is_public = true);

-- Policy: Teachers peuvent voir leurs propres présentations
DROP POLICY IF EXISTS "Teachers can view own presentations" ON presentations;
CREATE POLICY "Teachers can view own presentations"
ON presentations FOR SELECT
USING (auth.uid() = teacher_id);

-- Policy: Teachers peuvent modifier leurs propres présentations
DROP POLICY IF EXISTS "Teachers can update own presentations" ON presentations;
CREATE POLICY "Teachers can update own presentations"
ON presentations FOR UPDATE
USING (auth.uid() = teacher_id);

-- Policy: Teachers peuvent supprimer leurs propres présentations
DROP POLICY IF EXISTS "Teachers can delete own presentations" ON presentations;
CREATE POLICY "Teachers can delete own presentations"
ON presentations FOR DELETE
USING (auth.uid() = teacher_id);

-- Policy: Teachers peuvent créer des présentations
DROP POLICY IF EXISTS "Teachers can create presentations" ON presentations;
CREATE POLICY "Teachers can create presentations"
ON presentations FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- =====================================================
-- ÉTAPE 9: INDEX PERFORMANCE
-- =====================================================

-- Index composite pour recherche lessons par chapitre + type contenu
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_published
ON lessons(chapter_id, is_published, order_index)
WHERE is_published = true;

-- Index pour lessons avec présentations publiées
CREATE INDEX IF NOT EXISTS idx_lessons_with_presentation
ON lessons(presentation_id, is_published)
WHERE presentation_id IS NOT NULL AND is_published = true;

-- =====================================================
-- ÉTAPE 10: FONCTION RECHERCHE PRESENTATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION search_presentations(
  p_teacher_id UUID DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  title TEXT,
  description TEXT,
  thumbnail TEXT,
  total_slides INTEGER,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  -- Infos supplémentaires
  used_in_lessons_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.teacher_id,
    p.title,
    p.description,
    p.thumbnail,
    p.total_slides,
    p.is_public,
    p.created_at,
    -- Compter combien de leçons utilisent cette présentation
    (SELECT COUNT(*) FROM lessons WHERE presentation_id = p.id) as used_in_lessons_count
  FROM presentations p
  WHERE
    (p_teacher_id IS NULL OR p.teacher_id = p_teacher_id)
    AND (p_is_public IS NULL OR p.is_public = p_is_public)
    AND (p_search_text IS NULL OR
         p.title ILIKE '%' || p_search_text || '%' OR
         p.description ILIKE '%' || p_search_text || '%')
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_presentations IS 'Recherche de présentations avec filtres et compte d''utilisation dans lessons';

-- =====================================================
-- ÉTAPE 11: MIGRATION DONNÉES (Si nécessaire)
-- =====================================================

-- Si vous avez déjà des lessons avec du contenu riche qui devrait être en slides,
-- vous pourriez créer automatiquement des présentations
-- (À adapter selon vos besoins)

/*
-- Exemple: Créer une présentation pour chaque leçon qui a beaucoup de contenu
DO $$
DECLARE
  v_lesson RECORD;
  v_presentation_id UUID;
  v_slide_id UUID;
BEGIN
  FOR v_lesson IN
    SELECT l.*, c.course_id, co.teacher_id
    FROM lessons l
    JOIN chapters c ON l.chapter_id = c.id
    JOIN courses co ON c.course_id = co.id
    WHERE l.presentation_id IS NULL
      AND LENGTH(l.content) > 1000  -- Contenu long
  LOOP
    -- Créer présentation
    INSERT INTO presentations (teacher_id, title, is_public)
    VALUES (v_lesson.teacher_id, v_lesson.title, false)
    RETURNING id INTO v_presentation_id;

    -- Créer une slide avec le contenu
    INSERT INTO slides (presentation_id, order_index, title, layout)
    VALUES (v_presentation_id, 0, v_lesson.title, 'default')
    RETURNING id INTO v_slide_id;

    -- Créer bloc de contenu
    INSERT INTO slide_blocks (
      slide_id,
      block_type,
      order_index,
      content
    ) VALUES (
      v_slide_id,
      'text',
      0,
      jsonb_build_object('text', v_lesson.content)
    );

    -- Mettre à jour total_slides
    UPDATE presentations SET total_slides = 1 WHERE id = v_presentation_id;

    -- Lier la présentation à la leçon
    UPDATE lessons SET presentation_id = v_presentation_id WHERE id = v_lesson.id;

    RAISE NOTICE 'Créé présentation % pour leçon %', v_presentation_id, v_lesson.id;
  END LOOP;
END $$;
*/

-- =====================================================
-- ÉTAPE 12: VALIDATION POST-MIGRATION
-- =====================================================

DO $$
DECLARE
  v_total_lessons INTEGER;
  v_with_presentation INTEGER;
  v_with_video INTEGER;
  v_with_text INTEGER;
  v_empty INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_lessons FROM lessons;
  SELECT COUNT(*) INTO v_with_presentation FROM lessons WHERE presentation_id IS NOT NULL;
  SELECT COUNT(*) INTO v_with_video FROM lessons WHERE video_url IS NOT NULL;
  SELECT COUNT(*) INTO v_with_text FROM lessons WHERE content IS NOT NULL AND content != '';
  SELECT COUNT(*) INTO v_empty FROM lessons
  WHERE presentation_id IS NULL
    AND (video_url IS NULL OR video_url = '')
    AND (content IS NULL OR content = '');

  RAISE NOTICE '============================================';
  RAISE NOTICE 'VALIDATION MIGRATION SLIDES INTEGRATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total leçons: %', v_total_lessons;
  RAISE NOTICE 'Avec slides: %', v_with_presentation;
  RAISE NOTICE 'Avec vidéo: %', v_with_video;
  RAISE NOTICE 'Avec texte: %', v_with_text;
  RAISE NOTICE 'Vides: %', v_empty;
  RAISE NOTICE '';

  IF v_empty > 0 THEN
    RAISE WARNING 'ATTENTION: % leçons sans contenu!', v_empty;
  ELSE
    RAISE NOTICE '✅ Toutes les leçons ont du contenu';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 MIGRATION 004 TERMINÉE AVEC SUCCÈS!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Colonne presentation_id ajoutée aux lessons';
  RAISE NOTICE '✅ Vue lessons_with_content créée';
  RAISE NOTICE '✅ Trigger auto-calcul duration créé';
  RAISE NOTICE '✅ Fonction duplicate_presentation créée';
  RAISE NOTICE '✅ Fonctions helper créées';
  RAISE NOTICE '✅ RLS configuré pour presentations';
  RAISE NOTICE '✅ Index performance créés';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Prochaines étapes:';
  RAISE NOTICE '   1. Créer LessonEditor unifié (text/video/slides)';
  RAISE NOTICE '   2. Mettre à jour UI pour afficher slides dans lessons';
  RAISE NOTICE '   3. Créer API pour lier presentations aux lessons';
  RAISE NOTICE '';
END $$;
