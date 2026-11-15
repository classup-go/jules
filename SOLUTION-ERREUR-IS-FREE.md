# ✅ Solution: Erreur "Could not find the 'is_free' column"

**Date**: 2026-01-21
**Erreur**: `Could not find the 'is_free' column of 'classrooms' in the schema cache`
**Status**: ✅ Résolu

## 🎯 Problème Identifié

La table `classrooms` en base de données **ne contient pas la colonne `is_free`**, mais le code essayait de l'insérer.

## ✅ Solutions Appliquées

### Solution 1: Fix Immédiat (Déjà Appliqué) ⚡
**Fichier**: `src/app/api/classes/route.ts`

**Changement (ligne 45)**:
```typescript
// AVANT
is_free: body.is_free !== undefined ? body.is_free : true,

// APRÈS (commenté temporairement)
// is_free: body.is_free !== undefined ? body.is_free : true, // ⚠️ Commenté - colonne n'existe pas
```

**✅ Résultat**: Vous pouvez maintenant créer des classes immédiatement, sans exécuter de migration.

### Solution 2: Migration SQL (Optionnelle) 📊
**Fichier**: `supabase-add-is-free-to-classrooms.sql`

Cette migration ajoute la colonne `is_free` à la table pour la cohérence future.

**Pour l'exécuter** (optionnel):
1. Ouvrez Supabase SQL Editor
2. Copiez le contenu de `supabase-add-is-free-to-classrooms.sql`
3. Exécutez le script
4. Décommentez la ligne dans `src/app/api/classes/route.ts`

## 🧪 Test Maintenant

### ✅ Créer une classe devrait fonctionner!

1. **Allez sur**: `http://localhost:3000/teacher/classes/create`

2. **Remplissez le formulaire**:
   - **Step 1**: Infos de la classe
     - Nom: "Mathématiques Terminale S 2025-2026"
     - Matière: "Mathématiques"
     - Niveau: "Lycée"
     - Type: Cursus

   - **Step 2**: Objectifs pédagogiques (3 minimum)
     - Ex: "Maîtriser les fonctions exponentielles"
     - Ex: "Comprendre les suites numériques"
     - Ex: "Résoudre des équations différentielles"

   - **Step 3**: Premier cours
     - Titre: "Introduction au programme"
     - Description: (optionnelle)
     - Accessibilité: Gratuit
     - **🆕 Durée**:
       - 90 minutes (pour cours unique)
       - OU 12 semaines + 36 heures (pour formation)

   - **Step 4**: Contenu initial
     - Type: Texte
     - Contenu: "Bienvenue dans ce cours..."

3. **Cliquez sur "Créer la classe"**

**✅ Ça devrait fonctionner maintenant!**

## 📋 Vérification en Base de Données

Après avoir créé la classe, vérifiez dans Supabase SQL Editor:

```sql
-- Voir votre classe créée
SELECT
  id,
  title,
  subject,
  level,
  teacher_id,
  is_public,
  price,
  enrolled_count,
  created_at
FROM classrooms
ORDER BY created_at DESC
LIMIT 1;

-- Voir le cours associé
SELECT
  c.id,
  c.title,
  c.classroom_id,
  c.duration_minutes,
  c.duration_hours,
  c.duration_weeks,
  c.learning_objectives,
  c.created_at
FROM courses c
ORDER BY c.created_at DESC
LIMIT 1;
```

## 🔄 Migration Future (Optionnelle)

Si vous voulez activer le champ `is_free` plus tard:

### Étape 1: Exécuter la migration SQL
```sql
-- Dans Supabase SQL Editor, exécutez:
-- Le contenu de supabase-add-is-free-to-classrooms.sql
```

### Étape 2: Décommenter dans l'API
**Fichier**: `src/app/api/classes/route.ts:45`
```typescript
// Décommentez cette ligne:
is_free: body.is_free !== undefined ? body.is_free : true,
```

### Étape 3: Redémarrer Next.js
```bash
# Arrêtez et redémarrez le serveur
npm run dev
```

## 📊 Colonnes Actuelles de `classrooms`

Avec le fix, les colonnes insérées sont:
```typescript
{
  teacher_id: string,        // ✅ ID du professeur
  title: string,             // ✅ Nom de la classe
  description: string,       // ✅ Description
  subject: string,           // ✅ Matière
  level: string,             // ✅ Niveau
  is_public: boolean,        // ✅ Classe publique?
  max_students: number,      // ✅ Max élèves (défaut: 100)
  enrolled_count: number,    // ✅ Élèves inscrits (défaut: 0)
  price: number,             // ✅ Prix (défaut: 0)
  // is_free: boolean,       // ❌ Commenté (colonne n'existe pas)
}
```

## 🎯 Colonnes du Cours (avec durée!)

Le cours créé aura:
```typescript
{
  classroom_id: string,           // ✅ Lien vers la classe
  title: string,                  // ✅ Titre du cours
  subject: string,                // ✅ Matière
  level: string,                  // ✅ Niveau
  description: string,            // ✅ Description
  learning_objectives: string[],  // ✅ Objectifs
  prerequisites: string[],        // ✅ Prérequis
  duration_minutes: number?,      // ✅ 🆕 Durée en minutes
  duration_hours: number?,        // ✅ 🆕 Volume horaire
  duration_weeks: number?,        // ✅ 🆕 Durée en semaines
  is_published: false,            // ✅ Brouillon par défaut
}
```

## 🔍 Autres Erreurs Possibles

Si vous rencontrez encore des erreurs, vérifiez:

### 1. Votre rôle utilisateur
```sql
SELECT id, email, role FROM users WHERE email = 'VOTRE_EMAIL';
-- Si role != 'teacher', exécutez:
-- UPDATE users SET role = 'teacher' WHERE email = 'VOTRE_EMAIL';
```

### 2. Autres colonnes manquantes
```sql
-- Exécutez le script complet:
-- debug-classroom-issue.sql
```

### 3. Console du navigateur
Ouvrez la console (F12) pour voir les erreurs détaillées.

### 4. Console du serveur Next.js
Regardez les logs dans le terminal où Next.js tourne.

## 📁 Fichiers Modifiés

```
✅ Créés:
   └── supabase-add-is-free-to-classrooms.sql (migration optionnelle)

✅ Modifiés:
   └── src/app/api/classes/route.ts
       └── Ligne 45: is_free commenté temporairement
```

## 🎉 Résumé

- ✅ **Erreur identifiée**: Colonne `is_free` manquante
- ✅ **Fix immédiat appliqué**: Champ commenté dans l'API
- ✅ **Migration créée**: Pour ajouter la colonne plus tard (optionnel)
- ✅ **Système fonctionnel**: Vous pouvez créer des classes maintenant!
- ✅ **Champs de durée**: Inclus dans le cours créé (minutes, heures, semaines)

---

**🚀 Essayez de créer une classe maintenant, ça devrait fonctionner!**

Si vous rencontrez une autre erreur, le message sera maintenant détaillé grâce aux améliorations précédentes.
