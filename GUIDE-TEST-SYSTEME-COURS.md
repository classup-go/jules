# 🧪 Guide de Test - Système de Cours Jules Class Go

**Date**: 2026-01-20
**Version**: 1.0
**Objectif**: Tester le flow complet Wizard → Builder → Aperçu

---

## 📋 Prérequis

### 1. Exécuter les migrations SQL

```bash
# Dans Supabase SQL Editor, exécuter dans l'ordre:

# 1. Créer la table courses et migrations
psql -d jules_db < supabase-courses-system-setup-fixed.sql

# 2. Migrer les données existantes (optionnel si déjà des classrooms)
psql -d jules_db < supabase-migrate-classrooms-to-courses.sql
```

### 2. Vérifier que les tables existent

```sql
-- Vérifier table courses
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'courses';

-- Vérifier que chapters a la colonne course_id
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'chapters' AND column_name = 'course_id';
```

---

## 🧪 SCÉNARIO 1: Créer un cours complet via le Wizard

### Étape 1: Accéder au wizard
```
URL: http://localhost:3000/teacher/courses/new
```

**Attendu:**
- ✅ Loading "Création du brouillon..."
- ✅ Affichage du wizard Step 1

### Étape 2: Sélection de la classe (Step 1)

**Actions:**
1. Vérifier que le select "Classe" est affiché
2. Vérifier que les classes du professeur sont listées
3. Tester "Créer une nouvelle classe"
   - Remplir: "Terminale S 2024-2025"
   - Matière: "Mathématiques"
   - Niveau: "Lycée"
   - Cliquer "Créer"

**Attendu:**
- ✅ La nouvelle classe apparaît dans le select
- ✅ Elle est automatiquement sélectionnée
- ✅ Le formulaire inline se ferme

**Tests négatifs:**
- ❌ Essayer de créer sans remplir tous les champs → Erreur

### Étape 3: Informations générales (Step 1 suite)

**Actions:**
1. Titre: "Mathématiques - Fonctions et dérivées"
2. Matière: "Mathématiques"
3. Niveau: "Lycée"
4. Langue: "Français"
5. Difficulté: "Intermédiaire"
6. Description: "Cours complet sur les fonctions et leurs dérivées..."
7. Cliquer "Continuer"

**Attendu:**
- ✅ Validation réussie
- ✅ Passage à Step 2

**Tests négatifs:**
- ❌ Titre < 5 caractères → Erreur "Minimum 5 caractères"
- ❌ Pas de classe sélectionnée → Erreur

### Étape 4: Objectifs pédagogiques (Step 2)

**Actions:**
1. Objectif 1: "Maîtriser les fonctions polynômes du second degré"
2. Objectif 2: "Comprendre le concept de dérivée"
3. Objectif 3: "Savoir calculer une dérivée"
4. Prérequis 1: "Connaître les équations du premier degré"
5. Prérequis 2: "Maîtriser les fractions"
6. Cliquer "Continuer"

**Attendu:**
- ✅ Validation réussie
- ✅ Autosave déclenché (indicateur visible)
- ✅ Passage à Step 3

### Étape 5: Structure du cours (Step 3)

**Actions:**
1. Créer Chapitre 1: "Introduction aux fonctions"
   - Ajouter Leçon 1: "Qu'est-ce qu'une fonction ?"
   - Ajouter Leçon 2: "Représentation graphique"
2. Créer Chapitre 2: "Les dérivées"
   - Ajouter Leçon 1: "Définition de la dérivée"
3. Cliquer "Continuer"

**Attendu:**
- ✅ Structure sauvegardée
- ✅ Passage à Step 4

### Étape 6-7: Contenu et évaluation

**Actions:**
1. Step 4: Ajouter du contenu aux leçons (vidéo, texte, etc.)
2. Step 5: Configurer les critères de validation
3. Cliquer "Continuer" à chaque fois

**Attendu:**
- ✅ Autosave fonctionne
- ✅ Progression jusqu'à Step 8

### Étape 8: Publication (Step 8)

**Attendu:**
- ✅ Affichage de la checklist de validation
- ✅ Stats affichées:
  - Nombre de chapitres: 2
  - Nombre de leçons: 3
  - Leçons gratuites: X
  - Quiz: X
- ✅ **NOUVEAU**: Bouton "🎨 Organiser visuellement (Drag & Drop)"

**Actions:**
1. Cliquer sur "🎨 Organiser visuellement"

**Attendu:**
- ✅ Redirection vers `/teacher/courses/{courseId}/builder`

---

## 🧪 SCÉNARIO 2: Utiliser le Builder (Drag & Drop)

### Étape 1: Accéder au builder
```
URL: http://localhost:3000/teacher/courses/{courseId}/builder
```

**Attendu:**
- ✅ Loading "Chargement du cours..."
- ✅ Affichage du titre du cours
- ✅ Affichage de la classe (Terminale S 2024-2025)
- ✅ Badge "Publié" si le cours est publié
- ✅ Liste des chapitres avec leurs leçons

### Étape 2: Réorganiser les chapitres

**Actions:**
1. Drag Chapitre 2 au-dessus de Chapitre 1
2. Vérifier l'indicateur "Non sauvegardé"
3. Cliquer "💾 Sauvegarder"

**Attendu:**
- ✅ Badge "Non sauvegardé" apparaît immédiatement
- ✅ Drag preview visible pendant le mouvement
- ✅ Chapitre 2 maintenant en position 1
- ✅ Sauvegarde réussie "✅ Structure du cours sauvegardée"
- ✅ Badge "Non sauvegardé" disparaît

**Vérification DB:**
```sql
SELECT id, title, order_index
FROM chapters
WHERE course_id = 'course-uuid'
ORDER BY order_index;
```

### Étape 3: Réorganiser les leçons

**Actions:**
1. Drag Leçon 2 au-dessus de Leçon 1 dans le même chapitre
2. Sauvegarder

**Attendu:**
- ✅ Leçons réorganisées
- ✅ Sauvegarde réussie

### Étape 4: Déplacer une leçon entre chapitres

**Actions:**
1. Drag Leçon du Chapitre 1 vers Chapitre 2
2. Vérifier que la leçon change de chapitre
3. Sauvegarder

**Attendu:**
- ✅ Leçon déplacée vers le nouveau chapitre
- ✅ `chapter_id` mis à jour dans la DB

**Vérification DB:**
```sql
SELECT l.id, l.title, l.chapter_id, ch.title as chapter_title
FROM lessons l
JOIN chapters ch ON ch.id = l.chapter_id
WHERE ch.course_id = 'course-uuid';
```

### Étape 5: Ajouter un chapitre

**Actions:**
1. Cliquer "➕ Ajouter un chapitre"

**Attendu:**
- ✅ Redirection vers `/teacher/courses/{courseId}/chapters/new`

### Étape 6: Ajouter une leçon

**Actions:**
1. Cliquer "➕ Ajouter une leçon" dans un chapitre

**Attendu:**
- ✅ Redirection vers `/teacher/lessons/new?chapter={chapterId}&course={courseId}`

### Étape 7: Retour au cours

**Actions:**
1. Cliquer "← Retour au cours"

**Attendu:**
- ✅ Redirection vers `/teacher/courses/{courseId}`

---

## 🧪 SCÉNARIO 3: Tester les stats automatiques

### Test 1: Total chapters et lessons

**Actions:**
1. Dans le Builder, ajouter 2 nouveaux chapitres
2. Ajouter 3 leçons au total
3. Sauvegarder

**Vérification DB:**
```sql
SELECT
  co.id,
  co.title,
  co.total_chapters,
  co.total_lessons,
  (SELECT COUNT(*) FROM chapters WHERE course_id = co.id) as actual_chapters,
  (SELECT COUNT(*) FROM lessons l
   JOIN chapters ch ON ch.id = l.chapter_id
   WHERE ch.course_id = co.id) as actual_lessons
FROM courses co
WHERE co.id = 'course-uuid';
```

**Attendu:**
- ✅ `total_chapters` = nombre réel de chapitres
- ✅ `total_lessons` = nombre réel de leçons

---

## 🧪 SCÉNARIO 4: Compatibilité rétroactive

### Test 1: Ancien code utilisant classroom_id

**Actions:**
1. Créer un cours via le nouveau wizard
2. Appeler l'ancienne API:

```typescript
fetch('/api/chapters/reorder', {
  method: 'PUT',
  body: JSON.stringify({
    classroomId: 'old-classroom-id',  // Ancien format
    chapters: [...]
  })
})
```

**Attendu:**
- ✅ API accepte les deux formats (courseId et classroomId)
- ✅ Réorganisation réussie

### Test 2: Nouveau code utilisant course_id

```typescript
fetch('/api/chapters/reorder', {
  method: 'PUT',
  body: JSON.stringify({
    courseId: 'new-course-id',  // Nouveau format
    chapters: [...]
  })
})
```

**Attendu:**
- ✅ Réorganisation réussie

---

## 🧪 SCÉNARIO 5: Vérifier la sécurité (RLS)

### Test 1: Accéder au cours d'un autre prof

**Actions:**
1. Se connecter comme Professeur A
2. Noter l'ID d'un cours du Professeur B
3. Essayer d'accéder à `/teacher/courses/{courseIdB}/builder`

**Attendu:**
- ✅ Alert "Accès non autorisé"
- ✅ Redirection vers `/teacher/courses`

### Test 2: Modifier les chapitres d'un autre prof

**Actions:**
1. Appeler l'API avec l'ID d'un cours d'un autre prof

**Attendu:**
- ✅ Erreur 403 "Accès refusé"

---

## ✅ Checklist finale

### Base de données
- [ ] Table `courses` créée
- [ ] Colonne `chapters.course_id` créée
- [ ] Index créés
- [ ] RLS policies actives
- [ ] Triggers de stats fonctionnels

### APIs
- [ ] `/api/courses` crée dans table `courses`
- [ ] `/api/chapters/reorder` accepte `courseId`
- [ ] `/api/lessons/reorder` fonctionne
- [ ] Validation des permissions

### Interface Wizard
- [ ] Step 1: Sélection classe fonctionne
- [ ] Step 2-7: Création guidée fonctionne
- [ ] Step 8: Bouton "Organiser visuellement" visible
- [ ] Autosave fonctionne
- [ ] Redirection vers Builder fonctionne

### Interface Builder
- [ ] Affichage des cours depuis table `courses`
- [ ] Drag & drop chapitres fonctionne
- [ ] Drag & drop leçons fonctionne
- [ ] Déplacement entre chapitres fonctionne
- [ ] Sauvegarde met à jour les stats
- [ ] Retour au cours fonctionne

### Sécurité
- [ ] Professeur ne peut voir que ses cours
- [ ] RLS bloque l'accès non autorisé
- [ ] Validation des permissions dans les APIs

---

## 🐛 Bugs connus et solutions

### Problème 1: Chapitres orphelins après migration

**Symptôme:**
```sql
SELECT * FROM chapters WHERE course_id IS NULL;
-- Retourne des résultats
```

**Solution:**
```sql
-- Associer les chapitres orphelins au cours correspondant
UPDATE chapters ch
SET course_id = c.id
FROM courses c
WHERE ch.classroom_id = c.classroom_id
  AND ch.course_id IS NULL;
```

### Problème 2: Stats incorrectes

**Symptôme:** `total_chapters` et `total_lessons` ne correspondent pas

**Solution:**
```sql
-- Recalculer les stats
UPDATE courses co
SET
  total_chapters = (SELECT COUNT(*) FROM chapters WHERE course_id = co.id),
  total_lessons = (SELECT COUNT(*) FROM lessons l
                   JOIN chapters ch ON ch.id = l.chapter_id
                   WHERE ch.course_id = co.id);
```

### Problème 3: Drag & drop ne fonctionne pas

**Vérifications:**
1. Console navigateur pour erreurs JS
2. Vérifier que `@dnd-kit` est installé:
```bash
npm list @dnd-kit/core
```
3. Vérifier que les IDs sont uniques

---

## 📊 Métriques de succès

Après les tests, vous devriez avoir:

- ✅ **0 erreurs** dans la console navigateur
- ✅ **0 erreurs** dans les logs Supabase
- ✅ **100% des chapitres** ont un `course_id`
- ✅ **Stats correctes** dans la table `courses`
- ✅ **Drag & drop fluide** (< 100ms de lag)

---

## 🔍 Logs à surveiller

### Supabase Dashboard
```
Table Editor > courses → Vérifier les données
Table Editor > chapters → Vérifier course_id
Logs > Vérifier les erreurs RLS
```

### Console Navigateur
```javascript
// Activer les logs détaillés
localStorage.setItem('debug', 'course-wizard:*')
```

---

## 📝 Rapport de test

Utilisez ce template pour documenter vos tests:

```markdown
## Test exécuté le: [DATE]
Par: [NOM]

### Scénarios testés
- [ ] Scénario 1: Wizard complet
- [ ] Scénario 2: Builder drag & drop
- [ ] Scénario 3: Stats automatiques
- [ ] Scénario 4: Compatibilité
- [ ] Scénario 5: Sécurité

### Bugs trouvés
1. [Description]
   - Sévérité: Critique/Majeure/Mineure
   - Steps to reproduce: ...
   - Solution proposée: ...

### Résultat final
✅ PASS / ❌ FAIL

### Notes
...
```

---

**Bon test! 🚀**
