-- =====================================================
-- MIGRATION 003: MODÈLE PROGRAMME UNIFIÉ
-- =====================================================
-- Objectif: Remplacer 3 types de cours par 1 modèle unifié Programme
-- Approche: Settings-based configuration (JSONB)
-- Date: 2026-01-22
-- =====================================================

-- =====================================================
-- ÉTAPE 1: BACKUP ET PRÉPARATION
-- =====================================================

-- Créer une table de backup
CREATE TABLE IF NOT EXISTS courses_backup AS SELECT * FROM courses;

COMMENT ON TABLE courses_backup IS 'Backup automatique avant migration Programme - 2026-01-22';

-- =====================================================
-- ÉTAPE 2: AJOUT DE LA COLONNE SETTINGS
-- =====================================================

-- Ajouter settings JSONB à la table courses
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Créer un index GIN pour recherche efficace dans settings
CREATE INDEX IF NOT EXISTS idx_courses_settings_gin ON courses USING gin (settings);

-- Créer des index pour les champs settings fréquemment utilisés
CREATE INDEX IF NOT EXISTS idx_courses_duration_type
ON courses ((settings->>'duration_type'));

CREATE INDEX IF NOT EXISTS idx_courses_pacing_type
ON courses ((settings->>'pacing_type'));

CREATE INDEX IF NOT EXISTS idx_courses_access_mode
ON courses ((settings->>'access_mode'));

-- =====================================================
-- ÉTAPE 3: AJOUT NOUVELLES COLONNES METADATA
-- =====================================================

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;

-- Index pour recherche par audience cible
CREATE INDEX IF NOT EXISTS idx_courses_target_audience
ON courses (target_audience)
WHERE target_audience IS NOT NULL;

-- Index composite pour statistiques
CREATE INDEX IF NOT EXISTS idx_courses_stats
ON courses (enrolled_count DESC, avg_rating DESC, completion_rate DESC);

-- =====================================================
-- ÉTAPE 4: MIGRATION DES DONNÉES EXISTANTES
-- =====================================================

-- Fonction helper pour détecter le type de cours basé sur les données existantes
CREATE OR REPLACE FUNCTION detect_course_type(
  p_duration_minutes INTEGER,
  p_total_lessons INTEGER,
  p_is_intensive BOOLEAN
) RETURNS TEXT AS $$
BEGIN
  -- Cours intensif
  IF p_is_intensive = true THEN
    RETURN 'intensif';
  END IF;

  -- Cursus long (plus de 10 leçons ou plus de 600 minutes = 10h)
  IF p_total_lessons > 10 OR p_duration_minutes > 600 THEN
    RETURN 'cursus_long';
  END IF;

  -- Cours structuré (par défaut)
  RETURN 'cours_structure';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour mapper ancien type vers nouveaux settings
CREATE OR REPLACE FUNCTION map_to_programme_settings(
  p_course_type TEXT,
  p_duration_minutes INTEGER,
  p_is_intensive BOOLEAN,
  p_requires_sequential BOOLEAN
) RETURNS JSONB AS $$
DECLARE
  v_settings JSONB;
BEGIN
  -- Initialiser settings par défaut
  v_settings := '{
    "duration_type": "moyen",
    "pacing_type": "libre",
    "access_mode": "acces_individuel",
    "features": {
      "allow_previews": true,
      "certificate_enabled": false,
      "community_enabled": false,
      "assignments_enabled": false,
      "live_sessions_enabled": false
    },
    "restrictions": {
      "requires_sequential": false,
      "time_limit_days": null,
      "max_attempts": null
    }
  }'::jsonb;

  -- Mapper duration_type
  IF p_course_type = 'intensif' OR (p_duration_minutes > 0 AND p_duration_minutes <= 120) THEN
    v_settings := jsonb_set(v_settings, '{duration_type}', '"court"'::jsonb);
  ELSIF p_duration_minutes > 600 THEN
    v_settings := jsonb_set(v_settings, '{duration_type}', '"long"'::jsonb);
  END IF;

  -- Mapper pacing_type
  IF p_is_intensive THEN
    v_settings := jsonb_set(v_settings, '{pacing_type}', '"live"'::jsonb);
    v_settings := jsonb_set(v_settings, '{features,live_sessions_enabled}', 'true'::jsonb);
  ELSIF p_requires_sequential THEN
    v_settings := jsonb_set(v_settings, '{pacing_type}', '"guide"'::jsonb);
    v_settings := jsonb_set(v_settings, '{restrictions,requires_sequential}', 'true'::jsonb);
  END IF;

  -- Features supplémentaires pour cursus longs
  IF p_course_type = 'cursus_long' THEN
    v_settings := jsonb_set(v_settings, '{features,certificate_enabled}', 'true'::jsonb);
    v_settings := jsonb_set(v_settings, '{features,community_enabled}', 'true'::jsonb);
    v_settings := jsonb_set(v_settings, '{features,assignments_enabled}', 'true'::jsonb);
  END IF;

  RETURN v_settings;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Appliquer la migration des données existantes
UPDATE courses
SET settings = map_to_programme_settings(
  detect_course_type(duration_minutes, 5, false), -- Assume 5 lessons en moyenne si pas de données
  COALESCE(duration_minutes, 60),
  false, -- is_intensive (ajouter cette colonne si existe)
  false  -- requires_sequential (ajouter cette colonne si existe)
)
WHERE settings = '{}'::jsonb OR settings IS NULL;

-- =====================================================
-- ÉTAPE 5: RENOMMER FOREIGN KEYS
-- =====================================================

-- Note: On garde le nom "courses" pour la table pour compatibilité
-- Mais on met à jour les commentaires pour refléter Programme

COMMENT ON TABLE courses IS 'Programmes de formation unifiés - Remplace les anciens concepts de cours, cursus, et formations intensives';
COMMENT ON COLUMN courses.settings IS 'Configuration JSONB du programme: duration_type, pacing_type, access_mode, features, restrictions';
COMMENT ON COLUMN courses.target_audience IS 'Public cible du programme (ex: "Débutants", "Professionnels", "Étudiants universitaires")';
COMMENT ON COLUMN courses.enrolled_count IS 'Nombre total d''inscrits au programme';
COMMENT ON COLUMN courses.completion_rate IS 'Taux de complétion moyen (0-100)';
COMMENT ON COLUMN courses.avg_rating IS 'Note moyenne (0-5)';

-- =====================================================
-- ÉTAPE 6: CRÉER FONCTIONS HELPER
-- =====================================================

-- Fonction pour obtenir duration_type
CREATE OR REPLACE FUNCTION get_programme_duration_type(p_course_id UUID)
RETURNS TEXT AS $$
  SELECT settings->>'duration_type' FROM courses WHERE id = p_course_id;
$$ LANGUAGE sql STABLE;

-- Fonction pour obtenir pacing_type
CREATE OR REPLACE FUNCTION get_programme_pacing_type(p_course_id UUID)
RETURNS TEXT AS $$
  SELECT settings->>'pacing_type' FROM courses WHERE id = p_course_id;
$$ LANGUAGE sql STABLE;

-- Fonction pour obtenir access_mode
CREATE OR REPLACE FUNCTION get_programme_access_mode(p_course_id UUID)
RETURNS TEXT AS $$
  SELECT settings->>'access_mode' FROM courses WHERE id = p_course_id;
$$ LANGUAGE sql STABLE;

-- Fonction pour checker si feature est activée
CREATE OR REPLACE FUNCTION is_programme_feature_enabled(
  p_course_id UUID,
  p_feature_name TEXT
) RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (settings->'features'->p_feature_name)::boolean,
    false
  )
  FROM courses
  WHERE id = p_course_id;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- ÉTAPE 7: CONTRAINTES DE VALIDATION
-- =====================================================

-- Contrainte: settings doit contenir les clés requises
ALTER TABLE courses
ADD CONSTRAINT check_settings_required_keys
CHECK (
  settings ? 'duration_type' AND
  settings ? 'pacing_type' AND
  settings ? 'access_mode'
);

-- Contrainte: duration_type valide
ALTER TABLE courses
ADD CONSTRAINT check_duration_type_valid
CHECK (
  settings->>'duration_type' IN ('court', 'moyen', 'long')
);

-- Contrainte: pacing_type valide
ALTER TABLE courses
ADD CONSTRAINT check_pacing_type_valid
CHECK (
  settings->>'pacing_type' IN ('libre', 'guide', 'live')
);

-- Contrainte: access_mode valide
ALTER TABLE courses
ADD CONSTRAINT check_access_mode_valid
CHECK (
  settings->>'access_mode' IN ('classe_privee', 'acces_individuel', 'mixte')
);

-- Contrainte: completion_rate entre 0 et 100
ALTER TABLE courses
ADD CONSTRAINT check_completion_rate_range
CHECK (completion_rate >= 0 AND completion_rate <= 100);

-- Contrainte: avg_rating entre 0 et 5
ALTER TABLE courses
ADD CONSTRAINT check_avg_rating_range
CHECK (avg_rating >= 0 AND avg_rating <= 5);

-- =====================================================
-- ÉTAPE 8: TRIGGERS POUR STATISTIQUES
-- =====================================================

-- Fonction trigger pour mettre à jour enrolled_count
CREATE OR REPLACE FUNCTION update_programme_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE courses
    SET enrolled_count = enrolled_count + 1
    WHERE id = NEW.classroom_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE courses
    SET enrolled_count = GREATEST(enrolled_count - 1, 0)
    WHERE id = OLD.classroom_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur enrollments
DROP TRIGGER IF EXISTS trigger_update_enrolled_count ON enrollments;
CREATE TRIGGER trigger_update_enrolled_count
AFTER INSERT OR DELETE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_programme_enrolled_count();

-- Fonction pour recalculer les statistiques d'un programme
CREATE OR REPLACE FUNCTION recalculate_programme_stats(p_course_id UUID)
RETURNS VOID AS $$
DECLARE
  v_enrolled_count INTEGER;
  v_completion_rate NUMERIC;
  v_avg_rating NUMERIC;
BEGIN
  -- Compter les inscrits actifs
  SELECT COUNT(*)
  INTO v_enrolled_count
  FROM enrollments
  WHERE classroom_id = p_course_id
    AND status = 'active';

  -- Calculer taux de complétion
  SELECT COALESCE(AVG(progress), 0)
  INTO v_completion_rate
  FROM enrollments
  WHERE classroom_id = p_course_id
    AND status = 'active';

  -- Calculer note moyenne (si table reviews existe)
  -- SELECT COALESCE(AVG(rating), 0)
  -- INTO v_avg_rating
  -- FROM reviews
  -- WHERE course_id = p_course_id;

  -- Mettre à jour
  UPDATE courses
  SET
    enrolled_count = v_enrolled_count,
    completion_rate = v_completion_rate
    -- avg_rating = v_avg_rating
  WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÉTAPE 9: VUES UTILITAIRES
-- =====================================================

-- Vue pour lister les programmes par type
CREATE OR REPLACE VIEW programmes_by_duration AS
SELECT
  id,
  title,
  settings->>'duration_type' as duration_type,
  settings->>'pacing_type' as pacing_type,
  settings->>'access_mode' as access_mode,
  enrolled_count,
  completion_rate,
  avg_rating,
  created_at
FROM courses
ORDER BY created_at DESC;

-- Vue pour programmes populaires
CREATE OR REPLACE VIEW programmes_populaires AS
SELECT
  id,
  title,
  description,
  thumbnail,
  enrolled_count,
  avg_rating,
  settings->>'duration_type' as duration_type,
  teacher_id
FROM courses
WHERE enrolled_count > 0
ORDER BY enrolled_count DESC, avg_rating DESC
LIMIT 50;

-- Vue pour programmes par professeur avec stats
CREATE OR REPLACE VIEW teacher_programmes_stats AS
SELECT
  c.teacher_id,
  COUNT(*) as total_programmes,
  SUM(c.enrolled_count) as total_students,
  AVG(c.avg_rating) as avg_rating,
  AVG(c.completion_rate) as avg_completion_rate
FROM courses c
GROUP BY c.teacher_id;

-- =====================================================
-- ÉTAPE 10: GRANTS ET PERMISSIONS RLS
-- =====================================================

-- RLS déjà activé sur courses, on ajoute policies pour nouveaux champs

-- Policy: Les étudiants peuvent voir les stats publiques
CREATE POLICY "Students can view programme stats"
ON courses
FOR SELECT
USING (
  auth.role() = 'authenticated'
);

-- Policy: Les teachers peuvent mettre à jour leurs programmes
CREATE POLICY "Teachers can update their programmes"
ON courses
FOR UPDATE
USING (
  auth.uid() = teacher_id
);

-- =====================================================
-- ÉTAPE 11: DOCUMENTATION ET EXEMPLES
-- =====================================================

-- Créer une table d'exemples pour documentation
CREATE TABLE IF NOT EXISTS programme_settings_examples (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemple 1: Cours court en ligne (Masterclass)
INSERT INTO programme_settings_examples (name, description, settings) VALUES
(
  'Masterclass Express',
  'Cours court (1-2h), accès libre, individuel',
  '{
    "duration_type": "court",
    "pacing_type": "libre",
    "access_mode": "acces_individuel",
    "features": {
      "allow_previews": true,
      "certificate_enabled": false,
      "community_enabled": false,
      "assignments_enabled": false,
      "live_sessions_enabled": false
    },
    "restrictions": {
      "requires_sequential": false,
      "time_limit_days": null,
      "max_attempts": null
    }
  }'::jsonb
);

-- Exemple 2: Formation intensive avec classes
INSERT INTO programme_settings_examples (name, description, settings) VALUES
(
  'Bootcamp Intensif',
  'Formation courte, live obligatoire, classe privée',
  '{
    "duration_type": "court",
    "pacing_type": "live",
    "access_mode": "classe_privee",
    "features": {
      "allow_previews": false,
      "certificate_enabled": true,
      "community_enabled": true,
      "assignments_enabled": true,
      "live_sessions_enabled": true
    },
    "restrictions": {
      "requires_sequential": true,
      "time_limit_days": 30,
      "max_attempts": null
    },
    "schedule": {
      "live_sessions_per_week": 3,
      "duration_weeks": 4
    }
  }'::jsonb
);

-- Exemple 3: Cursus long en autonomie
INSERT INTO programme_settings_examples (name, description, settings) VALUES
(
  'Parcours Complet',
  'Cursus long, guidé, accès individuel avec communauté',
  '{
    "duration_type": "long",
    "pacing_type": "guide",
    "access_mode": "acces_individuel",
    "features": {
      "allow_previews": true,
      "certificate_enabled": true,
      "community_enabled": true,
      "assignments_enabled": true,
      "live_sessions_enabled": false
    },
    "restrictions": {
      "requires_sequential": true,
      "time_limit_days": 365,
      "max_attempts": 3
    },
    "milestones": {
      "checkpoints_enabled": true,
      "minimum_score": 70
    }
  }'::jsonb
);

-- Exemple 4: Cursus mixte (individuel + classes)
INSERT INTO programme_settings_examples (name, description, settings) VALUES
(
  'Formation Premium Hybride',
  'Long cursus, mode mixte avec sessions lives mensuelles',
  '{
    "duration_type": "long",
    "pacing_type": "guide",
    "access_mode": "mixte",
    "features": {
      "allow_previews": true,
      "certificate_enabled": true,
      "community_enabled": true,
      "assignments_enabled": true,
      "live_sessions_enabled": true
    },
    "restrictions": {
      "requires_sequential": true,
      "time_limit_days": 180,
      "max_attempts": null
    },
    "schedule": {
      "live_sessions_per_month": 2,
      "live_sessions_optional": false
    }
  }'::jsonb
);

-- =====================================================
-- ÉTAPE 12: FONCTIONS DE RECHERCHE
-- =====================================================

-- Fonction pour rechercher programmes par critères
CREATE OR REPLACE FUNCTION search_programmes(
  p_duration_type TEXT DEFAULT NULL,
  p_pacing_type TEXT DEFAULT NULL,
  p_access_mode TEXT DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_teacher_id UUID DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  thumbnail TEXT,
  teacher_id UUID,
  price NUMERIC,
  enrolled_count INTEGER,
  avg_rating NUMERIC,
  completion_rate NUMERIC,
  settings JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    c.thumbnail,
    c.teacher_id,
    c.price,
    c.enrolled_count,
    c.avg_rating,
    c.completion_rate,
    c.settings,
    c.created_at
  FROM courses c
  WHERE
    (p_duration_type IS NULL OR c.settings->>'duration_type' = p_duration_type)
    AND (p_pacing_type IS NULL OR c.settings->>'pacing_type' = p_pacing_type)
    AND (p_access_mode IS NULL OR c.settings->>'access_mode' = p_access_mode)
    AND (p_min_rating IS NULL OR c.avg_rating >= p_min_rating)
    AND (p_teacher_id IS NULL OR c.teacher_id = p_teacher_id)
    AND (p_search_text IS NULL OR
         c.title ILIKE '%' || p_search_text || '%' OR
         c.description ILIKE '%' || p_search_text || '%')
  ORDER BY c.enrolled_count DESC, c.avg_rating DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- ÉTAPE 13: VALIDATION POST-MIGRATION
-- =====================================================

-- Compter les cours migrés
DO $$
DECLARE
  v_total_courses INTEGER;
  v_with_settings INTEGER;
  v_missing_settings INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_courses FROM courses;
  SELECT COUNT(*) INTO v_with_settings FROM courses WHERE settings != '{}'::jsonb;
  v_missing_settings := v_total_courses - v_with_settings;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'VALIDATION MIGRATION PROGRAMME';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total programmes: %', v_total_courses;
  RAISE NOTICE 'Avec settings: %', v_with_settings;
  RAISE NOTICE 'Sans settings: %', v_missing_settings;
  RAISE NOTICE '';

  IF v_missing_settings > 0 THEN
    RAISE WARNING 'ATTENTION: % programmes sans settings!', v_missing_settings;
  ELSE
    RAISE NOTICE '✅ Tous les programmes ont des settings valides';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- =====================================================
-- ÉTAPE 14: NETTOYAGE (COMMENTÉ - À EXÉCUTER MANUELLEMENT)
-- =====================================================

/*
-- Une fois la migration validée (après plusieurs jours/semaines):

-- 1. Supprimer les colonnes devenues obsolètes (si existantes)
-- ALTER TABLE courses DROP COLUMN IF EXISTS course_type;
-- ALTER TABLE courses DROP COLUMN IF EXISTS is_intensive;

-- 2. Supprimer la table de backup
-- DROP TABLE IF EXISTS courses_backup;

-- 3. Supprimer les anciennes vues
-- DROP VIEW IF EXISTS cours_structures;
-- DROP VIEW IF EXISTS cursus_longs;
-- DROP VIEW IF EXISTS formations_intensives;

-- 4. Supprimer les fonctions temporaires de migration
-- DROP FUNCTION IF EXISTS detect_course_type(INTEGER, INTEGER, BOOLEAN);
-- DROP FUNCTION IF EXISTS map_to_programme_settings(TEXT, INTEGER, BOOLEAN, BOOLEAN);
*/

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

COMMENT ON COLUMN courses.settings IS 'Configuration JSONB - Structure:
{
  "duration_type": "court" | "moyen" | "long",
  "pacing_type": "libre" | "guide" | "live",
  "access_mode": "classe_privee" | "acces_individuel" | "mixte",
  "features": {
    "allow_previews": boolean,
    "certificate_enabled": boolean,
    "community_enabled": boolean,
    "assignments_enabled": boolean,
    "live_sessions_enabled": boolean
  },
  "restrictions": {
    "requires_sequential": boolean,
    "time_limit_days": number | null,
    "max_attempts": number | null
  }
}';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 MIGRATION 003 TERMINÉE AVEC SUCCÈS!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Colonne settings ajoutée avec index GIN';
  RAISE NOTICE '✅ Nouvelles colonnes metadata ajoutées';
  RAISE NOTICE '✅ Données existantes migrées';
  RAISE NOTICE '✅ Contraintes de validation créées';
  RAISE NOTICE '✅ Fonctions helper et triggers créés';
  RAISE NOTICE '✅ Vues utilitaires créées';
  RAISE NOTICE '✅ 4 exemples de configuration ajoutés';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Prochaines étapes:';
  RAISE NOTICE '   1. Tester les fonctions helper';
  RAISE NOTICE '   2. Créer les types TypeScript';
  RAISE NOTICE '   3. Mettre à jour les API routes';
  RAISE NOTICE '   4. Créer le ProgrammeWizard';
  RAISE NOTICE '';
END $$;
