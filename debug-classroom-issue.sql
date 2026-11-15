-- Script de débogage pour l'erreur de création de classe
-- Date: 2026-01-21
-- Usage: Exécutez ces requêtes dans Supabase SQL Editor pour diagnostiquer le problème

-- ============================================
-- 1. Vérifier votre rôle utilisateur
-- ============================================
-- Remplacez 'VOTRE_EMAIL' par votre email
SELECT
  id,
  email,
  role,
  created_at
FROM users
WHERE email = 'VOTRE_EMAIL';

-- Si le rôle n'est pas 'teacher', exécutez cette requête:
-- UPDATE users SET role = 'teacher' WHERE email = 'VOTRE_EMAIL';


-- ============================================
-- 2. Vérifier la structure de la table classrooms
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'classrooms'
ORDER BY ordinal_position;


-- ============================================
-- 3. Vérifier les contraintes NOT NULL
-- ============================================
-- Colonnes qui DOIVENT avoir une valeur (NOT NULL sans défaut)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'classrooms'
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY ordinal_position;


-- ============================================
-- 4. Tester la création d'une classe manuellement
-- ============================================
-- Remplacez 'VOTRE_USER_ID' par votre ID utilisateur (obtenu de la requête #1)
-- Cette requête devrait échouer avec le MÊME message d'erreur que l'API

-- ATTENTION: Ne pas exécuter si vous ne savez pas votre USER_ID
/*
INSERT INTO classrooms (
  teacher_id,
  title,
  description,
  subject,
  level,
  is_public,
  max_students,
  enrolled_count,
  price,
  is_free
)
VALUES (
  'VOTRE_USER_ID',           -- Remplacez par votre ID
  'Test Class',
  'Description test',
  'Mathématiques',
  'Lycée',
  false,
  100,
  0,
  0,
  true
)
RETURNING *;
*/


-- ============================================
-- 5. Vérifier les dernières classes créées
-- ============================================
SELECT
  id,
  title,
  subject,
  level,
  teacher_id,
  enrolled_count,
  is_public,
  created_at
FROM classrooms
ORDER BY created_at DESC
LIMIT 5;


-- ============================================
-- 6. Vérifier s'il y a des colonnes manquantes
-- ============================================
-- Liste des colonnes attendues selon database.ts
DO $$
DECLARE
  expected_columns TEXT[] := ARRAY[
    'id', 'teacher_id', 'title', 'description', 'subject',
    'level', 'cover_image', 'is_public', 'max_students',
    'enrolled_count', 'price', 'is_free', 'created_at', 'updated_at'
  ];
  col TEXT;
  exists_check INTEGER;
BEGIN
  FOREACH col IN ARRAY expected_columns
  LOOP
    SELECT COUNT(*)
    INTO exists_check
    FROM information_schema.columns
    WHERE table_name = 'classrooms'
      AND column_name = col;

    IF exists_check = 0 THEN
      RAISE NOTICE 'COLONNE MANQUANTE: %', col;
    ELSE
      RAISE NOTICE 'Colonne OK: %', col;
    END IF;
  END LOOP;
END $$;


-- ============================================
-- 7. Vérifier les contraintes de clés étrangères
-- ============================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'classrooms';


-- ============================================
-- RÉSULTATS ATTENDUS
-- ============================================

-- Requête #1 (Votre rôle):
-- Devrait retourner: role = 'teacher'
-- Si non, exécutez l'UPDATE ci-dessus

-- Requête #3 (Contraintes NOT NULL):
-- Devrait être VIDE ou avoir des colonnes avec column_default
-- Si enrolled_count est listé SANS défaut → C'EST LE PROBLÈME

-- Requête #6 (Colonnes manquantes):
-- Toutes les colonnes devraient afficher "Colonne OK"
-- Si "COLONNE MANQUANTE" → Il faut créer la colonne

-- ============================================
-- CORRECTIONS POSSIBLES
-- ============================================

-- Si enrolled_count est NOT NULL sans défaut:
/*
ALTER TABLE classrooms
ALTER COLUMN enrolled_count SET DEFAULT 0;
*/

-- Si enrolled_count n'existe pas:
/*
ALTER TABLE classrooms
ADD COLUMN enrolled_count INTEGER DEFAULT 0;
*/

-- Si is_free n'existe pas:
/*
ALTER TABLE classrooms
ADD COLUMN is_free BOOLEAN DEFAULT true;
*/

-- Si une colonne est NOT NULL sans défaut et vous voulez ajouter un défaut:
/*
ALTER TABLE classrooms
ALTER COLUMN nom_colonne SET DEFAULT valeur_par_defaut;
*/
