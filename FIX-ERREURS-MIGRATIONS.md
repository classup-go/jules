# CORRECTION ERREURS MIGRATIONS

## 🚨 PROBLÈME DÉTECTÉ

Vous avez rencontré ces erreurs lors de l'exécution des migrations:

```
004: Error: Failed to run sql query: ERROR: 42703: column l.content does not exist
003: Error: Failed to run sql query: ERROR: 42703: column "thumbnail" does not exist
004: Error: Failed to run sql query: ERROR: 42703: column "is_public" does not exist
```

### Cause

Les migrations 003 et 004 dépendent de colonnes qui n'existent pas encore dans votre schéma actuel:
- `courses.thumbnail` (utilisé dans migration 003)
- `lessons.content` (utilisé dans migration 004)
- `lessons.video_url` (utilisé dans migration 004)
- `presentations.is_public` (utilisé dans migration 004 pour RLS policies)

---

## ✅ SOLUTION

J'ai créé une **migration 002 préalable** qui ajoute toutes les colonnes manquantes.

### Ordre d'exécution correct

```
002-add-missing-columns.sql        (NOUVEAU - PRÉREQUIS)
   ↓
003-unified-programme-model.sql    (Modèle Programme)
   ↓
004-integrate-slides-into-lessons.sql (Intégration Slides)
```

---

## 📋 ÉTAPES À SUIVRE

### Étape 1: Vérifier l'état actuel de votre BDD

```bash
psql -d jules_db -f migrations/000-verify-schema.sql
```

Ce script va:
- ✅ Lister toutes vos tables
- ✅ Montrer les colonnes existantes
- ✅ Identifier les colonnes manquantes
- ✅ Vous dire quelles migrations exécuter

### Étape 2: Exécuter la migration 002 (PRÉREQUIS)

```bash
psql -d jules_db -f migrations/002-add-missing-columns.sql
```

**Cette migration ajoute:**

**Table `courses`:**
- `thumbnail` TEXT
- `description` TEXT (probablement existe déjà)
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Table `lessons`:**
- `content` TEXT ⭐ (requis pour migration 004)
- `video_url` TEXT ⭐ (requis pour migration 004)
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Table `chapters`:**
- `description` TEXT
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Bonus:**
- Triggers auto-update `updated_at` sur les 3 tables
- Index pour recherche texte (si extension pg_trgm disponible)

### Étape 3: Exécuter la migration 003

```bash
psql -d jules_db -f migrations/003-unified-programme-model.sql
```

**Maintenant cette migration fonctionnera** car `courses.thumbnail` existe.

### Étape 4: Exécuter la migration 004

```bash
psql -d jules_db -f migrations/004-integrate-slides-into-lessons.sql
```

**Maintenant cette migration fonctionnera** car `lessons.content` et `lessons.video_url` existent.

---

## 🔧 SCRIPT AUTOMATIQUE

Pour exécuter toutes les migrations d'un coup:

```bash
#!/bin/bash
# run-all-migrations.sh

DB_NAME="jules_db"

echo "🚀 Exécution des migrations Jules Platform..."
echo ""

# Vérification préalable
echo "📋 Vérification de l'état actuel..."
psql -d $DB_NAME -f migrations/000-verify-schema.sql
echo ""
read -p "Continuer avec les migrations? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# Migration 002
echo "📝 [1/3] Migration 002: Ajout colonnes manquantes..."
psql -d $DB_NAME -f migrations/002-add-missing-columns.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 002"
  exit 1
fi
echo "✅ Migration 002 OK"
echo ""

# Migration 003
echo "📝 [2/3] Migration 003: Modèle Programme Unifié..."
psql -d $DB_NAME -f migrations/003-unified-programme-model.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 003"
  exit 1
fi
echo "✅ Migration 003 OK"
echo ""

# Migration 004
echo "📝 [3/3] Migration 004: Intégration Slides..."
psql -d $DB_NAME -f migrations/004-integrate-slides-into-lessons.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 004"
  exit 1
fi
echo "✅ Migration 004 OK"
echo ""

echo "🎉 Toutes les migrations ont réussi!"
echo ""
echo "📊 Vérification finale..."
psql -d $DB_NAME -c "SELECT COUNT(*) as nb_courses FROM courses WHERE settings IS NOT NULL AND settings != '{}'::jsonb;"
echo ""
```

Rendre exécutable:
```bash
chmod +x run-all-migrations.sh
./run-all-migrations.sh
```

---

## 🔍 VÉRIFICATIONS POST-MIGRATION

Après avoir exécuté toutes les migrations avec succès:

### Vérification 1: Colonnes ajoutées

```sql
-- Vérifier courses
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'courses'
  AND column_name IN ('thumbnail', 'settings', 'target_audience', 'enrolled_count');

-- Devrait retourner 4 lignes
```

### Vérification 2: Lessons avec types de contenu

```sql
-- Vérifier que la vue fonctionne
SELECT content_type, COUNT(*)
FROM lessons_with_content
GROUP BY content_type;

-- Devrait retourner: empty, text, video, slides (selon vos données)
```

### Vérification 3: Settings dans courses

```sql
-- Vérifier que settings a été rempli
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE settings != '{}'::jsonb) as avec_settings
FROM courses;

-- avec_settings devrait être > 0 si vous aviez déjà des cours
```

### Vérification 4: Index créés

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'courses'
  AND indexname LIKE '%settings%';

-- Devrait retourner:
-- idx_courses_settings_gin
-- idx_courses_duration_type
-- idx_courses_pacing_type
-- idx_courses_access_mode
```

---

## 📁 FICHIERS CRÉÉS

### Nouveaux fichiers de migration

1. **[`migrations/000-verify-schema.sql`](migrations/000-verify-schema.sql)**
   - Script de diagnostic
   - À exécuter AVANT les migrations
   - Identifie les colonnes manquantes

2. **[`migrations/002-add-missing-columns.sql`](migrations/002-add-missing-columns.sql)** ⭐
   - **NOUVEAU PRÉREQUIS**
   - Ajoute toutes les colonnes manquantes
   - À exécuter EN PREMIER

3. **[`migrations/003-unified-programme-model.sql`](migrations/003-unified-programme-model.sql)**
   - Modèle Programme Unifié
   - Dépend de la migration 002

4. **[`migrations/004-integrate-slides-into-lessons.sql`](migrations/004-integrate-slides-into-lessons.sql)**
   - Intégration Slides
   - Dépend des migrations 002 et 003

### Documentation

1. **[`ORDRE-EXECUTION-MIGRATIONS.md`](ORDRE-EXECUTION-MIGRATIONS.md)**
   - Ordre détaillé d'exécution
   - Commandes complètes
   - Procédures de rollback

2. **[`FIX-ERREURS-MIGRATIONS.md`](FIX-ERREURS-MIGRATIONS.md)** (CE DOCUMENT)
   - Explication des erreurs
   - Solution pas à pas
   - Vérifications post-migration

---

## ⚠️ IMPORTANT: BACKUP

**AVANT d'exécuter les migrations en production:**

```bash
# Backup complet
pg_dump jules_db > backup_avant_migrations_$(date +%Y%m%d_%H%M%S).sql

# Ou backup ciblé
pg_dump jules_db -t courses -t lessons -t chapters > backup_tables_$(date +%Y%m%d).sql
```

**Pour restaurer en cas de problème:**

```bash
psql jules_db < backup_avant_migrations_YYYYMMDD_HHMMSS.sql
```

---

## 🎯 RÉSUMÉ RAPIDE

### Si vous voyez des erreurs de colonnes manquantes:

```bash
# 1. Diagnostiquer
psql -d jules_db -f migrations/000-verify-schema.sql

# 2. Exécuter migration 002 (PRÉREQUIS)
psql -d jules_db -f migrations/002-add-missing-columns.sql

# 3. Exécuter migration 003
psql -d jules_db -f migrations/003-unified-programme-model.sql

# 4. Exécuter migration 004
psql -d jules_db -f migrations/004-integrate-slides-into-lessons.sql

# 5. Vérifier
psql -d jules_db -c "SELECT COUNT(*) FROM courses WHERE settings IS NOT NULL;"
```

### Tout fonctionne ? ✅

Vous êtes prêt à utiliser le nouveau système Programme Unifié !

**Prochaines étapes:**
1. Déployer le code frontend (ProgrammeWizard, etc.)
2. Tester la création d'un programme
3. Vérifier l'intégration slides dans les leçons

---

## 📞 EN CAS DE PROBLÈME

### Erreur persistante "column X does not exist"

**Diagnostic:**
```sql
-- Lister TOUTES les colonnes de la table concernée
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lessons'  -- ou 'courses', 'chapters'
ORDER BY ordinal_position;
```

**Si la colonne manque vraiment:**
```sql
-- L'ajouter manuellement
ALTER TABLE lessons ADD COLUMN content TEXT;
ALTER TABLE lessons ADD COLUMN video_url TEXT;
```

### Erreur "table X does not exist"

Votre schéma de base n'existe pas encore. Vous devez d'abord créer les tables de base avant d'exécuter ces migrations.

### Erreur de permissions

```sql
-- Vérifier vos droits
SELECT current_user;

-- Si besoin, se connecter en tant que propriétaire de la BDD
psql -U postgres -d jules_db
```

---

**Document créé le:** 22 janvier 2026
**Version:** 1.0
**Status:** ✅ Solution complète aux erreurs de migration
