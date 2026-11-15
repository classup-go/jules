-- =====================================================
-- Jules Class Go - Migration Classrooms → Courses
-- Convertir les classrooms existantes en structure Classe + Cours
-- =====================================================

-- ATTENTION: Exécuter ce script APRÈS avoir créé la table courses
-- (supabase-courses-system-setup-fixed.sql)

BEGIN;

-- =====================================================
-- ÉTAPE 1: Créer un cours pour chaque classroom existante
-- =====================================================

-- Insérer un cours pour chaque classroom
-- Chaque classroom devient à la fois:
-- 1. Une classe (groupe d'élèves) - reste dans classrooms
-- 2. Un cours (contenu pédagogique) - nouveau dans courses

INSERT INTO courses (
  classroom_id,
  title,
  description,
  learning_objectives,
  prerequisites,
  competences,
  duration_weeks,
  is_published,
  created_at
)
SELECT
  c.id as classroom_id,
  c.title,
  c.description,
  ARRAY[]::TEXT[] as learning_objectives,  -- Vide par défaut
  ARRAY[]::TEXT[] as prerequisites,
  ARRAY[]::TEXT[] as competences,
  12 as duration_weeks,                      -- 12 semaines par défaut
  true as is_published,                      -- Publié si la classroom existe
  c.created_at
FROM classrooms c
WHERE NOT EXISTS (
  -- Ne pas créer de doublon si un cours existe déjà pour cette classroom
  SELECT 1 FROM courses WHERE courses.classroom_id = c.id
);

-- =====================================================
-- ÉTAPE 2: Mettre à jour les chapters pour pointer vers courses
-- =====================================================

-- Créer la colonne course_id si elle n'existe pas (normalement créée par setup script)
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

-- Mettre à jour les chapters existants pour pointer vers le bon cours
-- Pour chaque chapter lié à une classroom, trouver le cours correspondant
UPDATE chapters ch
SET course_id = c.id
FROM courses c
WHERE ch.classroom_id = c.classroom_id
  AND ch.course_id IS NULL;

-- =====================================================
-- ÉTAPE 3: Calculer les stats des cours
-- =====================================================

-- Calculer total_chapters et total_lessons pour chaque cours
UPDATE courses co
SET
  total_chapters = (
    SELECT COUNT(*)
    FROM chapters ch
    WHERE ch.course_id = co.id
  ),
  total_lessons = (
    SELECT COUNT(*)
    FROM lessons l
    WHERE l.chapter_id IN (
      SELECT id FROM chapters WHERE course_id = co.id
    )
  );

-- =====================================================
-- ÉTAPE 4: Vérifications
-- =====================================================

-- Afficher le résumé de la migration
DO $$
DECLARE
  v_total_classrooms INTEGER;
  v_total_courses INTEGER;
  v_chapters_migrated INTEGER;
  v_chapters_orphan INTEGER;
BEGIN
  -- Compter les classrooms
  SELECT COUNT(*) INTO v_total_classrooms FROM classrooms;

  -- Compter les cours créés
  SELECT COUNT(*) INTO v_total_courses FROM courses;

  -- Compter les chapters migrés
  SELECT COUNT(*) INTO v_chapters_migrated FROM chapters WHERE course_id IS NOT NULL;

  -- Compter les chapters orphelins (pas encore migrés)
  SELECT COUNT(*) INTO v_chapters_orphan FROM chapters WHERE course_id IS NULL;

  -- Afficher le résumé
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA MIGRATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Classrooms existantes: %', v_total_classrooms;
  RAISE NOTICE '✅ Cours créés: %', v_total_courses;
  RAISE NOTICE '✅ Chapitres migrés: %', v_chapters_migrated;
  RAISE NOTICE '⚠️  Chapitres orphelins: %', v_chapters_orphan;
  RAISE NOTICE '========================================';

  IF v_chapters_orphan > 0 THEN
    RAISE WARNING 'Il reste % chapitres non migrés!', v_chapters_orphan;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5: Afficher les détails (optionnel)
-- =====================================================

-- Afficher la liste des cours créés avec leurs stats
SELECT
  cl.title as "Classe",
  cl.subject as "Matière",
  cl.level as "Niveau",
  co.title as "Cours",
  co.total_chapters as "Chapitres",
  co.total_lessons as "Leçons",
  co.is_published as "Publié"
FROM courses co
JOIN classrooms cl ON cl.id = co.classroom_id
ORDER BY cl.title;

-- =====================================================
-- ÉTAPE 6: Optionnel - Nettoyer les anciennes colonnes
-- =====================================================

-- Une fois la migration vérifiée, vous pouvez supprimer classroom_id des chapters
-- ATTENTION: Ne pas exécuter immédiatement, attendre validation complète!
--
-- ALTER TABLE chapters DROP COLUMN classroom_id;

COMMIT;

-- =====================================================
-- ROLLBACK EN CAS D'ERREUR
-- =====================================================

-- Si quelque chose se passe mal, la transaction sera annulée automatiquement
-- Vous pouvez aussi faire un ROLLBACK manuel:
-- ROLLBACK;

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================

-- 1. Ce script est IDEMPOTENT: vous pouvez l'exécuter plusieurs fois sans risque
--    Il ne créera pas de doublons grâce au check "WHERE NOT EXISTS"

-- 2. Les données originales dans 'classrooms' ne sont PAS modifiées
--    Elles restent intactes pour référence

-- 3. Les chapters gardent leur classroom_id pour compatibilité
--    Mais utilisent maintenant course_id comme référence principale

-- 4. Après migration réussie, vous pouvez:
--    - Supprimer la colonne classroom_id des chapters
--    - Mettre à jour les APIs qui utilisent encore classroom_id
--    - Former les utilisateurs au nouveau système

-- =====================================================
-- VÉRIFICATION POST-MIGRATION
-- =====================================================

-- Vérifier qu'aucun chapitre n'est orphelin
SELECT
  ch.id,
  ch.title,
  ch.classroom_id,
  ch.course_id
FROM chapters ch
WHERE ch.course_id IS NULL
LIMIT 10;

-- Si la requête ci-dessus retourne des résultats, il y a un problème!
