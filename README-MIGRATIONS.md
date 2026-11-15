# GUIDE MIGRATIONS - PROGRAMME UNIFIÉ

## 🎯 Vue d'ensemble

Ce guide explique comment exécuter les migrations pour implémenter le système Programme Unifié dans Jules Platform.

---

## 📁 Fichiers de migration

### 000-verify-schema.sql
**Diagnostic de votre schéma actuel**

Exécutez ce script AVANT toute migration pour identifier ce qui manque.

```bash
psql -d jules_db -f migrations/000-verify-schema.sql
```

**Ce script affiche:**
- ✅ Tables existantes
- ✅ Colonnes par table
- ✅ Diagnostic des colonnes manquantes
- ✅ Recommandations de migrations à exécuter

---

### 002-add-missing-columns.sql ⭐ PRÉREQUIS
**Ajout de toutes les colonnes nécessaires**

**À exécuter EN PREMIER** avant les migrations 003 et 004.

**Colonnes ajoutées:**

**Table `courses`:**
- `teacher_id` UUID (FK vers profiles)
- `title` TEXT
- `thumbnail` TEXT
- `description` TEXT
- `price` NUMERIC
- `currency` TEXT
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Table `lessons`:**
- `content` TEXT
- `video_url` TEXT
- `is_free_preview` BOOLEAN
- `duration_minutes` INTEGER
- `order_index` INTEGER
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Table `chapters`:**
- `description` TEXT
- `is_published` BOOLEAN
- `updated_at` TIMESTAMPTZ

**Bonus:**
- Triggers auto-update `updated_at` sur les 3 tables

```bash
psql -d jules_db -f migrations/002-add-missing-columns.sql
```

---

### 003-unified-programme-model.sql
**Modèle Programme Unifié**

**Dépend de:** Migration 002

**Ajoute:**
- Colonne `settings` JSONB (configuration du programme)
- Colonnes metadata: `target_audience`, `enrolled_count`, `completion_rate`, `avg_rating`
- Index GIN sur settings
- Contraintes de validation
- Fonctions helper
- Triggers statistiques
- Vues utilitaires
- Fonction `search_programmes`
- 4 exemples de configuration

```bash
psql -d jules_db -f migrations/003-unified-programme-model.sql
```

---

### 004-integrate-slides-into-lessons.sql
**Intégration Slides dans Lessons**

**Dépend de:** Migrations 002 ET 003

**Ajoute:**
- Colonne `presentation_id` dans lessons (FK vers presentations)
- Vue `lessons_with_content` (détection type: slides/video/text/empty)
- Trigger auto-calcul `duration_minutes` basé sur slides
- Fonction `duplicate_presentation` (copie complète avec slides/blocs)
- Fonction `link_presentation_to_lesson`
- Vue `chapters_with_content_stats`
- RLS policies pour presentations
- Index performance
- Fonction `search_presentations`

```bash
psql -d jules_db -f migrations/004-integrate-slides-into-lessons.sql
```

---

## 🚀 EXÉCUTION PAS À PAS

### Étape 1: Backup ⚠️ OBLIGATOIRE

```bash
# Backup complet de votre base
pg_dump jules_db > backup_avant_migrations_$(date +%Y%m%d_%H%M%S).sql
```

### Étape 2: Diagnostic

```bash
psql -d jules_db -f migrations/000-verify-schema.sql
```

**Lisez attentivement le résultat.** Le script vous dit exactement quelles migrations exécuter.

### Étape 3: Migration 002 (PRÉREQUIS)

```bash
psql -d jules_db -f migrations/002-add-missing-columns.sql
```

**Attendez le message:** `🎉 MIGRATION 002 TERMINÉE AVEC SUCCÈS!`

### Étape 4: Migration 003 (Modèle Programme)

```bash
psql -d jules_db -f migrations/003-unified-programme-model.sql
```

**Attendez le message:** `🎉 MIGRATION 003 TERMINÉE AVEC SUCCÈS!`

### Étape 5: Migration 004 (Intégration Slides)

```bash
psql -d jules_db -f migrations/004-integrate-slides-into-lessons.sql
```

**Attendez le message:** `🎉 MIGRATION 004 TERMINÉE AVEC SUCCÈS!`

### Étape 6: Vérification finale

```sql
-- Vérifier que settings est rempli
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE settings IS NOT NULL AND settings != '{}'::jsonb) as avec_settings
FROM courses;

-- Vérifier la vue lessons_with_content
SELECT content_type, COUNT(*)
FROM lessons_with_content
GROUP BY content_type;

-- Vérifier les index
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('courses', 'lessons')
  AND indexname LIKE '%settings%' OR indexname LIKE '%presentation%';
```

---

## 🤖 SCRIPT AUTOMATIQUE

Créez un fichier `run-migrations.sh`:

```bash
#!/bin/bash

DB_NAME="jules_db"

echo "🚀 Migrations Jules Platform - Programme Unifié"
echo "================================================"
echo ""

# Backup
echo "💾 Création du backup..."
BACKUP_FILE="backup_avant_migrations_$(date +%Y%m%d_%H%M%S).sql"
pg_dump $DB_NAME > $BACKUP_FILE
echo "✅ Backup créé: $BACKUP_FILE"
echo ""

# Diagnostic
echo "🔍 Diagnostic du schéma actuel..."
psql -d $DB_NAME -f migrations/000-verify-schema.sql
echo ""

read -p "⚠️  Continuer avec les migrations? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Annulé par l'utilisateur"
    exit 1
fi
echo ""

# Migration 002
echo "📝 [1/3] Migration 002: Colonnes manquantes..."
psql -d $DB_NAME -f migrations/002-add-missing-columns.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 002 - ARRÊT"
  exit 1
fi
echo "✅ Migration 002 OK"
echo ""

# Migration 003
echo "📝 [2/3] Migration 003: Modèle Programme Unifié..."
psql -d $DB_NAME -f migrations/003-unified-programme-model.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 003 - ARRÊT"
  echo "💡 Pour restaurer: psql -d $DB_NAME < $BACKUP_FILE"
  exit 1
fi
echo "✅ Migration 003 OK"
echo ""

# Migration 004
echo "📝 [3/3] Migration 004: Intégration Slides..."
psql -d $DB_NAME -f migrations/004-integrate-slides-into-lessons.sql
if [ $? -ne 0 ]; then
  echo "❌ Erreur migration 004 - ARRÊT"
  echo "💡 Pour restaurer: psql -d $DB_NAME < $BACKUP_FILE"
  exit 1
fi
echo "✅ Migration 004 OK"
echo ""

echo "🎉 TOUTES LES MIGRATIONS ONT RÉUSSI!"
echo ""
echo "📊 Vérification..."
psql -d $DB_NAME -c "SELECT COUNT(*) as nb_programmes, COUNT(*) FILTER (WHERE settings IS NOT NULL) as avec_settings FROM courses;"
echo ""
echo "✅ Migration complète - Backup conservé: $BACKUP_FILE"
```

Rendre exécutable et lancer:

```bash
chmod +x run-migrations.sh
./run-migrations.sh
```

---

## ❌ EN CAS D'ERREUR

### Erreur: "column X does not exist"

**Cause:** Migrations exécutées dans le mauvais ordre

**Solution:**
1. Vérifier l'ordre: `000 (diagnostic)` → `002` → `003` → `004`
2. Restaurer le backup si nécessaire
3. Recommencer depuis la migration 002

### Erreur: "table X does not exist"

**Cause:** Schéma de base manquant

**Solution:**
Votre base n'a pas les tables de base. Vous devez d'abord créer le schéma initial avec les tables `courses`, `lessons`, `chapters`, `presentations`, `slides`.

### Erreur: "relation profiles does not exist"

**Cause:** Table `profiles` manquante (référencée par `courses.teacher_id`)

**Solution:**
```sql
-- Créer la table profiles si elle n'existe pas
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Erreur: Permission denied

**Cause:** Droits insuffisants

**Solution:**
```bash
# Se connecter en tant que propriétaire de la BDD
psql -U postgres -d jules_db

# Ou donner les droits
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

---

## 🔄 ROLLBACK

### Rollback complet (restaurer backup)

```bash
# Restaurer depuis le backup
psql -d jules_db < backup_avant_migrations_YYYYMMDD_HHMMSS.sql
```

### Rollback partiel (supprimer uniquement les nouvelles colonnes)

**Voir le document:** [`ORDRE-EXECUTION-MIGRATIONS.md`](ORDRE-EXECUTION-MIGRATIONS.md) section "Rollback"

---

## ✅ CHECKLIST FINALE

Après avoir exécuté toutes les migrations:

- [ ] Backup créé et conservé
- [ ] Migration 002 exécutée avec succès
- [ ] Migration 003 exécutée avec succès
- [ ] Migration 004 exécutée avec succès
- [ ] Vérification: `courses.settings` existe et est rempli
- [ ] Vérification: `lessons.presentation_id` existe
- [ ] Vérification: Vue `lessons_with_content` fonctionne
- [ ] Vérification: Index `idx_courses_settings_gin` existe
- [ ] Pas d'erreurs dans les logs PostgreSQL
- [ ] Application frontend peut se connecter à la BDD

---

## 📚 DOCUMENTATION COMPLÈTE

### Documents de référence

1. **[ORDRE-EXECUTION-MIGRATIONS.md](ORDRE-EXECUTION-MIGRATIONS.md)**
   - Ordre détaillé
   - Commandes
   - Rollback

2. **[FIX-ERREURS-MIGRATIONS.md](FIX-ERREURS-MIGRATIONS.md)**
   - Erreurs communes
   - Solutions
   - Diagnostic

3. **[IMPLEMENTATION-COMPLETE-2026-01-22.md](IMPLEMENTATION-COMPLETE-2026-01-22.md)**
   - Vue d'ensemble du projet
   - Fonctionnalités
   - Architecture

4. **[REFONTE-MODELE-PROGRAMME-2026-01-22.md](REFONTE-MODELE-PROGRAMME-2026-01-22.md)**
   - Spécification du modèle Programme
   - Types TypeScript
   - UI/UX

### Fichiers de migration

- `migrations/000-verify-schema.sql` - Diagnostic
- `migrations/002-add-missing-columns.sql` - Prérequis ⭐
- `migrations/003-unified-programme-model.sql` - Modèle Programme
- `migrations/004-integrate-slides-into-lessons.sql` - Intégration Slides

---

## 🎯 APRÈS LES MIGRATIONS

### Prochaines étapes

1. **Déployer le code frontend**
   - ProgrammeWizard (5 steps)
   - Types TypeScript
   - API routes

2. **Tester la création d'un programme**
   ```
   http://localhost:3000/teacher/programmes/new
   ```

3. **Créer les 4 types de programmes**
   - Masterclass (court, libre, individuel)
   - Bootcamp (court, live, classe)
   - Cursus (long, guidé, individuel)
   - Hybride (moyen, guidé, mixte)

4. **Tester l'intégration slides**
   - Créer une présentation
   - La lier à une leçon
   - Vérifier l'affichage étudiant

---

## 📞 SUPPORT

En cas de problème non résolu:

1. Vérifier les logs PostgreSQL
2. Consulter [`FIX-ERREURS-MIGRATIONS.md`](FIX-ERREURS-MIGRATIONS.md)
3. Exécuter le diagnostic: `000-verify-schema.sql`
4. Vérifier que le backup existe et est récent

---

**Document créé le:** 22 janvier 2026
**Version:** 1.0
**Status:** ✅ Guide complet prêt à l'emploi
