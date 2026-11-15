# ORDRE D'EXÉCUTION DES MIGRATIONS

## 🚨 IMPORTANT

Les migrations doivent être exécutées **dans cet ordre précis** pour éviter les erreurs.

---

## 📋 ORDRE D'EXÉCUTION

### Migration 002 : Colonnes Manquantes (PRÉREQUIS)
**Fichier:** [`migrations/002-add-missing-columns.sql`](migrations/002-add-missing-columns.sql)

**Quand:** AVANT toutes les autres migrations

**Raison:**
- Les migrations 003 et 004 dépendent de colonnes qui peuvent ne pas exister dans votre schéma actuel
- Cette migration ajoute toutes les colonnes nécessaires

**Colonnes ajoutées:**

**Table `courses`:**
- `thumbnail` TEXT
- `description` TEXT (probablement existe déjà)
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Table `lessons`:**
- `content` TEXT
- `video_url` TEXT
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Table `chapters`:**
- `description` TEXT
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Commande:**
```bash
psql -d votre_base -f migrations/002-add-missing-columns.sql
```

---

### Migration 003 : Modèle Programme Unifié
**Fichier:** [`migrations/003-unified-programme-model.sql`](migrations/003-unified-programme-model.sql)

**Quand:** APRÈS la migration 002

**Raison:**
- Dépend de la colonne `thumbnail` dans courses
- Ajoute la colonne `settings` JSONB
- Ajoute les colonnes metadata

**Colonnes ajoutées:**
- `settings` JSONB
- `target_audience` TEXT
- `enrolled_count` INTEGER
- `completion_rate` NUMERIC
- `avg_rating` NUMERIC

**Fonctionnalités:**
- Index GIN sur settings
- Contraintes de validation
- Fonctions helper
- Triggers statistiques
- Vues utilitaires

**Commande:**
```bash
psql -d votre_base -f migrations/003-unified-programme-model.sql
```

---

### Migration 004 : Intégration Slides
**Fichier:** [`migrations/004-integrate-slides-into-lessons.sql`](migrations/004-integrate-slides-into-lessons.sql)

**Quand:** APRÈS les migrations 002 ET 003

**Raison:**
- Dépend de la colonne `content` dans lessons (ajoutée en 002)
- Ajoute la colonne `presentation_id` dans lessons
- Crée des vues qui utilisent `content` et `video_url`

**Colonnes ajoutées:**
- `presentation_id` UUID (FK vers presentations)

**Fonctionnalités:**
- Vue `lessons_with_content` (détecte type: slides/video/text/empty)
- Trigger auto-calcul duration
- Fonction `duplicate_presentation`
- RLS policies
- Index performance

**Commande:**
```bash
psql -d votre_base -f migrations/004-integrate-slides-into-lessons.sql
```

---

## ✅ COMMANDES COMPLÈTES

### Option 1: Exécution séquentielle (recommandé)

```bash
# Connexion à votre base
psql -d jules_db

# Migration 002 (PRÉREQUIS)
\i migrations/002-add-missing-columns.sql

# Migration 003 (Modèle Programme)
\i migrations/003-unified-programme-model.sql

# Migration 004 (Intégration Slides)
\i migrations/004-integrate-slides-into-lessons.sql

# Quitter
\q
```

### Option 2: Script bash automatique

Créer un fichier `run-migrations.sh`:

```bash
#!/bin/bash

DB_NAME="jules_db"

echo "🚀 Début des migrations..."
echo ""

echo "📝 Migration 002: Ajout colonnes manquantes..."
psql -d $DB_NAME -f migrations/002-add-missing-columns.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 002"
  exit 1
fi
echo "✅ Migration 002 terminée"
echo ""

echo "📝 Migration 003: Modèle Programme Unifié..."
psql -d $DB_NAME -f migrations/003-unified-programme-model.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 003"
  exit 1
fi
echo "✅ Migration 003 terminée"
echo ""

echo "📝 Migration 004: Intégration Slides..."
psql -d $DB_NAME -f migrations/004-integrate-slides-into-lessons.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 004"
  exit 1
fi
echo "✅ Migration 004 terminée"
echo ""

echo "🎉 Toutes les migrations ont réussi!"
```

Rendre exécutable et lancer:
```bash
chmod +x run-migrations.sh
./run-migrations.sh
```

---

## 🔍 VÉRIFICATIONS POST-MIGRATION

Après avoir exécuté toutes les migrations, vérifiez que tout fonctionne:

```sql
-- Vérifier que settings est rempli
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE settings IS NOT NULL AND settings != '{}'::jsonb) as avec_settings
FROM courses;

-- Vérifier les types de contenu des leçons
SELECT content_type, COUNT(*)
FROM lessons_with_content
GROUP BY content_type;

-- Vérifier les stats des chapitres
SELECT COUNT(*) FROM chapters_with_content_stats;

-- Vérifier les index
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'lessons', 'chapters', 'presentations')
ORDER BY tablename, indexname;
```

---

## ⚠️ EN CAS D'ERREUR

### Erreur: "column X does not exist"

**Cause:** Migrations exécutées dans le mauvais ordre

**Solution:**
1. Rollback des migrations déjà exécutées (voir section Rollback)
2. Exécuter dans le bon ordre: 002 → 003 → 004

### Erreur: "relation X does not exist"

**Cause:** Table manquante dans votre schéma

**Solution:**
1. Vérifier que les tables `courses`, `lessons`, `chapters`, `presentations`, `slides` existent
2. Si manquantes, exécuter d'abord les migrations de création de schéma de base

### Erreur: "constraint X already exists"

**Cause:** Migration déjà partiellement exécutée

**Solution:**
- Les migrations utilisent `IF NOT EXISTS` et `DROP ... IF EXISTS`
- Vous pouvez réexécuter sans problème
- Si erreur persiste, vérifier manuellement la contrainte:
  ```sql
  SELECT conname FROM pg_constraint WHERE conname = 'nom_contrainte';
  ```

---

## 🔄 ROLLBACK (Si nécessaire)

### Rollback Migration 004

```sql
-- Supprimer colonne presentation_id
ALTER TABLE lessons DROP COLUMN IF EXISTS presentation_id;

-- Supprimer vues
DROP VIEW IF EXISTS lessons_with_content CASCADE;
DROP VIEW IF EXISTS chapters_with_content_stats CASCADE;

-- Supprimer fonctions
DROP FUNCTION IF EXISTS get_lesson_content_type(UUID);
DROP FUNCTION IF EXISTS auto_calculate_lesson_duration() CASCADE;
DROP FUNCTION IF EXISTS duplicate_presentation(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS link_presentation_to_lesson(UUID, UUID);
DROP FUNCTION IF EXISTS search_presentations(UUID, TEXT, BOOLEAN, INTEGER, INTEGER);

-- Supprimer trigger
DROP TRIGGER IF EXISTS trigger_auto_calculate_lesson_duration ON lessons;
```

### Rollback Migration 003

```sql
-- Supprimer colonnes ajoutées
ALTER TABLE courses DROP COLUMN IF EXISTS settings;
ALTER TABLE courses DROP COLUMN IF EXISTS target_audience;
ALTER TABLE courses DROP COLUMN IF EXISTS enrolled_count;
ALTER TABLE courses DROP COLUMN IF EXISTS completion_rate;
ALTER TABLE courses DROP COLUMN IF EXISTS avg_rating;

-- Supprimer vues
DROP VIEW IF EXISTS programmes_by_duration CASCADE;
DROP VIEW IF EXISTS programmes_populaires CASCADE;
DROP VIEW IF EXISTS teacher_programmes_stats CASCADE;

-- Supprimer fonctions
DROP FUNCTION IF EXISTS detect_course_type(INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS map_to_programme_settings(TEXT, INTEGER, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS get_programme_duration_type(UUID);
DROP FUNCTION IF EXISTS get_programme_pacing_type(UUID);
DROP FUNCTION IF EXISTS get_programme_access_mode(UUID);
DROP FUNCTION IF EXISTS is_programme_feature_enabled(UUID, TEXT);
DROP FUNCTION IF EXISTS recalculate_programme_stats(UUID);
DROP FUNCTION IF EXISTS search_programmes(...);
DROP FUNCTION IF EXISTS update_programme_enrolled_count() CASCADE;

-- Restaurer depuis backup si nécessaire
-- CREATE TABLE courses AS SELECT * FROM courses_backup;
```

### Rollback Migration 002

```sql
-- Supprimer colonnes (ATTENTION: perte de données!)
ALTER TABLE courses DROP COLUMN IF EXISTS thumbnail;
ALTER TABLE courses DROP COLUMN IF EXISTS is_published;
ALTER TABLE courses DROP COLUMN IF EXISTS updated_at;

ALTER TABLE lessons DROP COLUMN IF EXISTS content;
ALTER TABLE lessons DROP COLUMN IF EXISTS video_url;
ALTER TABLE lessons DROP COLUMN IF EXISTS is_published;
ALTER TABLE lessons DROP COLUMN IF EXISTS updated_at;

ALTER TABLE chapters DROP COLUMN IF EXISTS description;
ALTER TABLE chapters DROP COLUMN IF EXISTS is_published;
ALTER TABLE chapters DROP COLUMN IF EXISTS updated_at;

-- Supprimer triggers
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_chapters_updated_at ON chapters;

-- Supprimer fonction
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## 📊 SCHÉMA FINAL

Après les 3 migrations, voici les colonnes finales:

### Table `courses`

```
id                  UUID PRIMARY KEY
teacher_id          UUID REFERENCES profiles(id)
title               TEXT NOT NULL
description         TEXT                          -- Migration 002
thumbnail           TEXT                          -- Migration 002
price               NUMERIC DEFAULT 0
currency            TEXT DEFAULT 'EUR'
is_published        BOOLEAN DEFAULT false         -- Migration 002
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()     -- Migration 002

-- Migration 003
settings            JSONB DEFAULT '{}'::jsonb
target_audience     TEXT
enrolled_count      INTEGER DEFAULT 0
completion_rate     NUMERIC(5,2) DEFAULT 0
avg_rating          NUMERIC(3,2) DEFAULT 0
```

### Table `lessons`

```
id                  UUID PRIMARY KEY
chapter_id          UUID REFERENCES chapters(id)
title               TEXT NOT NULL
content             TEXT                          -- Migration 002
video_url           TEXT                          -- Migration 002
duration_minutes    INTEGER
order_index         INTEGER DEFAULT 0
is_free_preview     BOOLEAN DEFAULT false
is_published        BOOLEAN DEFAULT false         -- Migration 002
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()     -- Migration 002

-- Migration 004
presentation_id     UUID REFERENCES presentations(id)
```

### Table `chapters`

```
id                  UUID PRIMARY KEY
course_id           UUID REFERENCES courses(id)
title               TEXT NOT NULL
description         TEXT                          -- Migration 002
order_index         INTEGER DEFAULT 0
is_published        BOOLEAN DEFAULT false         -- Migration 002
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()     -- Migration 002
```

---

## 📝 NOTES IMPORTANTES

1. **Backup obligatoire** avant toute migration en production
2. **Tester en staging** d'abord
3. Les migrations utilisent `IF NOT EXISTS` pour être **idempotentes**
4. Toutes les migrations incluent des **validations post-exécution**
5. Les **notices** dans les logs indiquent le succès

---

**Document créé le:** 22 janvier 2026
**Version:** 1.0
**Status:** ✅ Prêt pour exécution
