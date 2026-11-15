# 🔧 Fix: Erreur SQL "column progression_id does not exist"

## 🔴 Problème

Lors de l'exécution du script de création des templates, vous obtenez :
```
ERROR: 42703: column "progression_id" does not exist
ERROR: column "progression_id" referenced in foreign key constraint does not exist
```

## ✅ Solution en 2 Étapes

Le problème vient du fait que les tables existent déjà avec une structure différente ou incomplète. La solution est de **nettoyer puis recréer** les tables.

### Étape 1: Nettoyer les Tables Existantes

**Fichier:** `supabase-course-template-cleanup.sql`

1. **Ouvrir** Supabase Dashboard → SQL Editor
2. **Copier** le contenu de `supabase-course-template-cleanup.sql`
3. **Coller** dans l'éditeur
4. **Exécuter** (Run ou Ctrl+Enter)

⚠️ **ATTENTION:** Ce script supprime toutes les données existantes dans les tables de templates !

Ce script:
- ✅ Désactive les politiques RLS
- ✅ Supprime toutes les politiques existantes
- ✅ Supprime toutes les tables dans le bon ordre
- ✅ Affiche un message de confirmation

### Étape 2: Créer les Tables Proprement

**Fichier:** `supabase-course-template-create.sql`

1. **Dans le même SQL Editor**
2. **Copier** le contenu de `supabase-course-template-create.sql`
3. **Coller** dans l'éditeur (remplacer le script précédent)
4. **Exécuter** (Run ou Ctrl+Enter)

Ce script:
- ✅ Vérifie que la table `users` existe
- ✅ Crée toutes les tables avec les foreign keys correctes
- ✅ Crée tous les indexes pour les performances
- ✅ Active RLS sur toutes les tables
- ✅ Configure toutes les politiques de sécurité
- ✅ Crée les fonctions utilitaires
- ✅ Affiche un message de succès

### Ordre Correct d'Exécution

```bash
# 1. Nettoyer
Execute: supabase-course-template-cleanup.sql

# 2. Créer
Execute: supabase-course-template-create.sql
```

---

## 🔍 Vérification

Après l'exécution, vérifiez que toutes les tables sont créées :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%template%'
OR table_name LIKE '%progression%'
OR table_name LIKE '%exercise%';
```

Vous devriez voir :
- ✅ `course_templates`
- ✅ `pedagogical_progressions`
- ✅ `lesson_contents`
- ✅ `course_summaries`
- ✅ `revision_sheets`
- ✅ `exercises`
- ✅ `qcm_questions`
- ✅ `quizzes`
- ✅ `homeworks`
- ✅ `homework_exercises`

---

## 📋 Vérifier les Foreign Keys

```sql
SELECT
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
AND tc.table_name IN (
  'course_templates',
  'pedagogical_progressions',
  'lesson_contents',
  'course_summaries',
  'revision_sheets',
  'exercises',
  'qcm_questions',
  'quizzes',
  'homeworks',
  'homework_exercises'
);
```

---

## 🛡️ Vérifier les Politiques RLS

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename LIKE '%template%'
   OR tablename LIKE '%progression%'
   OR tablename LIKE '%exercise%'
   OR tablename LIKE '%homework%'
   OR tablename LIKE '%quiz%'
ORDER BY tablename, policyname;
```

Vous devriez voir des politiques comme :
- `Teachers create templates`
- `Teachers view own templates`
- `Teachers manage progressions`
- etc.

---

## 🧪 Test Complet

### 1. Tester la Création de Template

```sql
-- Remplacez YOUR_USER_ID par votre auth.uid()
INSERT INTO course_templates (
  title,
  subject,
  level,
  duration_weeks,
  created_by
)
VALUES (
  'Test - Mathématiques',
  'Mathématiques',
  'Terminale',
  12,
  'YOUR_USER_ID'
)
RETURNING *;
```

### 2. Tester l'Ajout de Progression

```sql
-- Remplacez TEMPLATE_ID par l'ID du template créé ci-dessus
INSERT INTO pedagogical_progressions (
  course_template_id,
  week_number,
  title,
  objectives,
  competences
)
VALUES (
  'TEMPLATE_ID',
  1,
  'Introduction aux Fonctions',
  ARRAY['Comprendre la notion de fonction', 'Savoir lire un graphique'],
  ARRAY['Représenter', 'Calculer']
)
RETURNING *;
```

### 3. Vérifier dans l'Application

1. Aller sur http://localhost:3001
2. Se connecter en tant que professeur
3. Aller dans **Teacher Dashboard** → **Templates de Cours**
4. Le template créé doit apparaître dans la liste
5. Cliquer dessus pour l'éditer

---

## 🚨 Si Ça Ne Fonctionne Toujours Pas

### Vérifier que la Table `users` Existe

```sql
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_name = 'users'
);
```

Si `false`, vous devez d'abord créer la table `users` :

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Nettoyer les Tables Existantes

Si vous avez des tables partiellement créées, supprimez-les d'abord :

```sql
-- ATTENTION: Cela supprime toutes les données !
DROP TABLE IF EXISTS homework_exercises CASCADE;
DROP TABLE IF EXISTS homeworks CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS qcm_questions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS revision_sheets CASCADE;
DROP TABLE IF EXISTS course_summaries CASCADE;
DROP TABLE IF EXISTS lesson_contents CASCADE;
DROP TABLE IF EXISTS pedagogical_progressions CASCADE;
DROP TABLE IF EXISTS course_templates CASCADE;
```

Puis réexécutez le script `supabase-course-template-setup-fixed.sql`.

---

## 📞 Support

Si l'erreur persiste :
1. Vérifier que vous êtes bien connecté à Supabase
2. Vérifier que vous avez les permissions d'administration
3. Consulter les logs Supabase (Dashboard → Logs)
4. Copier l'erreur exacte complète

---

## ✅ Une Fois Résolu

Après avoir exécuté le script avec succès, vous pouvez :

1. **Créer votre premier template** via l'interface
2. **Ajouter des progressions** semaine par semaine
3. **Publier le template** pour le rendre visible aux étudiants

Le système est maintenant prêt à être utilisé ! 🎉
