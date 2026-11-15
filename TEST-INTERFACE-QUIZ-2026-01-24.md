# 🧪 TEST: Système de Quiz via l'Interface

**Date**: 2026-01-24
**Objectif**: Tester le système complet de quiz (QCM et texte à trou) via l'interface web

---

## ✅ STATUT ACTUEL

D'après les résultats SQL:
- ✅ Tables `lesson_quizzes` et `quiz_submissions` créées
- ✅ Indexes et RLS policies configurés
- ✅ 0 quiz créés (normal, on va en créer maintenant)
- ✅ 0 soumissions (normal, aucun quiz n'existe encore)

**Le système est prêt à être testé ! 🚀**

---

## 📝 TEST 1: Créer un QCM (Professeur)

### Étape 1: Se connecter en tant que Professeur

1. Ouvrez votre navigateur
2. Allez sur `http://localhost:3000`
3. Connectez-vous avec un compte **professeur**

### Étape 2: Accéder à une Classroom

1. Cliquez sur "Mes classes" ou "Dashboard"
2. Sélectionnez une classroom existante
3. OU créez une nouvelle classroom si besoin

### Étape 3: Créer une Nouvelle Leçon

1. Dans la classroom, cliquez sur **"+ Créer une leçon"** ou **"+ Ajouter une leçon"**
2. Si vous ne voyez pas ce bouton, créez d'abord un **chapitre** (Chapter)

### Étape 4: Configurer la Leçon comme QCM

Dans le formulaire de création de leçon:

1. **Type de contenu**: Cliquez sur **✅ QCM**
   - Le système affichera l'éditeur de quiz

2. **Titre**: `Test QCM - Mathématiques Basiques`

3. **Description**: `Quiz de test pour valider le système`

### Étape 5: Ajouter des Questions

Cliquez sur **"+ Ajouter une question"**

#### Question 1:
- **Question**: `Combien font 2 + 2 ?`
- **Points**: `1`
- **Réponses**:
  - ○ `3`
  - ● `4` ← **Cliquez sur le cercle pour marquer comme correcte**
  - ○ `5`

#### Question 2:
Cliquez encore sur **"+ Ajouter une question"**

- **Question**: `Quelle est la racine carrée de 16 ?`
- **Points**: `1`
- **Réponses**:
  - ○ `2`
  - ● `4` ← **Bonne réponse**
  - ○ `8`

#### Question 3:
Cliquez encore sur **"+ Ajouter une question"**

- **Question**: `10 ÷ 2 = ?`
- **Points**: `1`
- **Réponses**:
  - ● `5` ← **Bonne réponse**
  - ○ `2`
  - ○ `20`

### Étape 6: Configurer les Paramètres

Faites défiler vers le bas jusqu'à la section **"Paramètres"**:

- **Score de passage**: `60` %
- ✅ **Autoriser les étudiants à refaire le quiz**: Coché
- ✅ **Afficher les corrections après soumission**: Coché
- ☐ **Mélanger l'ordre des questions**: Non coché (pour le test)
- ☐ **Mélanger l'ordre des réponses**: Non coché (pour le test)

### Étape 7: Enregistrer

1. Cliquez sur **"✓ Enregistrer le quiz"** (bouton vert en bas)
2. Attendez la confirmation `"Quiz enregistré avec succès!"`
3. Cliquez sur **"Enregistrer la leçon"** (bouton bleu)
4. Vous serez redirigé vers la classroom

### Étape 8: Vérifier

Vous devriez voir votre nouvelle leçon avec l'icône **✅** indiquant que c'est un QCM.

---

## 🎓 TEST 2: Passer le QCM (Étudiant)

### Étape 1: Se connecter en tant qu'Étudiant

1. **Ouvrez un autre navigateur** (ou un onglet privé)
2. Allez sur `http://localhost:3000`
3. Connectez-vous avec un compte **étudiant**
4. **Important**: L'étudiant doit être **inscrit** dans le cours qui contient le quiz

### Étape 2: Accéder au Quiz

1. Allez dans **"Mes cours"**
2. Cliquez sur le cours qui contient votre QCM test
3. Trouvez la leçon **"Test QCM - Mathématiques Basiques"**
4. Cliquez dessus

**Résultat attendu**: Vous êtes redirigé vers `/quiz/{lesson-id}`

### Étape 3: Répondre aux Questions

L'interface du quiz devrait ressembler à ceci:

```
✅ QCM
Test QCM - Mathématiques Basiques
Quiz de test pour valider le système

──────────────────────────────────────

Question 1/3
Combien font 2 + 2 ?
1 point(s)

○ 3
○ 4
○ 5

──────────────────────────────────────

Question 2/3
Quelle est la racine carrée de 16 ?
...
```

**Pour répondre**:
1. Cliquez sur **"4"** pour la question 1
2. Cliquez sur **"4"** pour la question 2
3. Cliquez sur **"5"** pour la question 3

### Étape 4: Soumettre

1. En bas de la page, vous verrez:
   - `Score de passage : 60%`
   - `3/3 questions répondues`
2. Cliquez sur **"✓ Soumettre mes réponses"**

### Étape 5: Voir les Résultats

**Résultat attendu**:

```
🎉
100%
Quiz réussi !

Score de passage : 60% • Temps passé : 1m 23s

──────────────────────────────────────

Correction détaillée

✓ Question 1
  Combien font 2 + 2 ?

  ✓ 4 (Votre réponse)

✓ Question 2
  Quelle est la racine carrée de 16 ?

  ✓ 4 (Votre réponse)

...
```

### Étape 6: Vérifier la BDD

Retournez dans Supabase et exécutez:

```sql
-- Voir la soumission créée
SELECT * FROM quiz_submissions ORDER BY submitted_at DESC LIMIT 1;

-- Devrait montrer:
-- score: 100
-- passed: true
-- quiz_type: 'qcm'
```

---

## 📝 TEST 3: Créer un Texte à Trou (Professeur)

### Étape 1: Créer une Nouvelle Leçon

Comme avant, mais cette fois:

1. **Type de contenu**: Cliquez sur **📋 Texte à trou**
2. **Titre**: `Test Géographie`
3. **Description**: `Exercice de test pour le système de texte à trou`

### Étape 2: Écrire le Texte avec des Trous

Dans la zone **"Texte avec trous"**, écrivez:

```
La capitale de la France est {{1}}.
Elle compte environ {{2}} millions d'habitants.
Le fleuve qui traverse Paris s'appelle {{3}}.
```

**Résultat**: Le système détecte automatiquement 3 trous et affiche 3 sections de configuration.

### Étape 3: Configurer Chaque Trou

#### Trou #1:
- **Réponses correctes**:
  - `Paris`
  - Cliquez sur **"+ Ajouter une variante"**
  - `paris` (minuscule)
- **Indice**: `Ville lumière`
- **Points**: `1`

#### Trou #2:
- **Réponses correctes**:
  - `2`
  - Ajoutez variantes: `2.2`, `deux`
- **Indice**: `Entre 2 et 3 millions`
- **Points**: `1`

#### Trou #3:
- **Réponses correctes**:
  - `Seine`
  - Ajoutez variantes: `La Seine`, `la Seine`
- **Indice**: `Commence par S`
- **Points**: `1`

### Étape 4: Configurer les Paramètres

- **Score de passage**: `60` %
- ✅ **Autoriser les étudiants à refaire le quiz**: Coché
- ☐ **Sensible à la casse**: Non coché (important!)
- ✅ **Afficher les indices**: Coché

### Étape 5: Enregistrer

1. Cliquez sur **"✓ Enregistrer le quiz"**
2. Cliquez sur **"Enregistrer la leçon"**

---

## 🎓 TEST 4: Passer le Texte à Trou (Étudiant)

### Étape 1: Accéder au Quiz

Comme avant, connectez-vous en tant qu'étudiant et accédez à la leçon **"Test Géographie"**.

### Étape 2: Remplir les Trous

L'interface devrait afficher:

```
La capitale de la France est [_______].
💡 Ville lumière

Elle compte environ [_______] millions d'habitants.
💡 Entre 2 et 3 millions

Le fleuve qui traverse Paris s'appelle [_______].
💡 Commence par S
```

**Remplissez**:
- Trou 1: `paris` (minuscule pour tester la non-sensibilité à la casse)
- Trou 2: `2.2`
- Trou 3: `la seine` (minuscule)

### Étape 3: Soumettre

Cliquez sur **"✓ Soumettre mes réponses"**

### Étape 4: Vérifier les Résultats

**Résultat attendu**:

```
🎉
100%
Quiz réussi !

──────────────────────────────────────

Correction détaillée

La capitale de la France est paris.
Elle compte environ 2.2 millions d'habitants.
Le fleuve qui traverse Paris s'appelle la seine.

──────────────────────────────────────

Réponses correctes

✓ Trou #1
  Votre réponse : paris

✓ Trou #2
  Votre réponse : 2.2

✓ Trou #3
  Votre réponse : la seine
```

Tous les trous devraient être **verts** car vous avez fourni des réponses acceptées (grâce aux variantes).

---

## 🔄 TEST 5: Refaire un Quiz

### Étape 1: Cliquer sur "Refaire le quiz"

Sur la page de résultats, cliquez sur **"🔄 Refaire le quiz"**

### Étape 2: Essayer d'Échouer

Répondez **volontairement mal** à toutes les questions:

- QCM: Cliquez sur les mauvaises réponses
- Texte à trou: Écrivez n'importe quoi (`aaa`, `bbb`, etc.)

### Étape 3: Voir l'Échec

**Résultat attendu**:

```
😔
0%
Quiz échoué

Score de passage : 60%
```

### Étape 4: Vérifier l'Historique

Retournez dans Supabase:

```sql
-- Voir toutes les tentatives de cet étudiant
SELECT
  score,
  passed,
  submitted_at
FROM quiz_submissions
WHERE lesson_id = 'VOTRE_LESSON_ID'
ORDER BY submitted_at DESC;

-- Devrait afficher 2 tentatives:
-- 100, true, 2026-01-24 ...
-- 0, false, 2026-01-24 ...
```

---

## 📊 TEST 6: Statistiques Professeur (SQL)

En tant que professeur, vous pouvez voir les stats dans Supabase:

```sql
-- Stats d'un quiz
SELECT * FROM get_quiz_stats('VOTRE_LESSON_ID');

-- Résultat attendu:
-- total_attempts: 2
-- passed_count: 1
-- failed_count: 1
-- average_score: 50.00
-- students_completed: 1

-- Classement
SELECT * FROM get_quiz_leaderboard('VOTRE_LESSON_ID', 10);

-- Historique d'un étudiant
SELECT * FROM get_student_quiz_history('VOTRE_LESSON_ID', 'VOTRE_STUDENT_ID');
```

---

## ✅ CHECKLIST DE VALIDATION

Cochez chaque élément une fois testé:

### Création de Quiz (Professeur)
- [ ] Peut créer une leçon de type QCM
- [ ] Peut ajouter/supprimer des questions
- [ ] Peut ajouter/supprimer des réponses
- [ ] Peut marquer la bonne réponse (cercle devient vert)
- [ ] Peut créer une leçon de type Texte à trou
- [ ] Le système détecte automatiquement les trous `{{1}}`, `{{2}}`
- [ ] Peut ajouter plusieurs variantes de réponses
- [ ] Peut configurer les paramètres (score, retry, etc.)
- [ ] Le quiz est enregistré dans la BDD

### Passage de Quiz (Étudiant)
- [ ] Peut accéder au quiz depuis la leçon
- [ ] Interface QCM s'affiche correctement
- [ ] Peut sélectionner des réponses (cercles s'activent)
- [ ] Interface Texte à trou s'affiche correctement
- [ ] Peut remplir les trous
- [ ] Les indices s'affichent (si activés)
- [ ] Peut soumettre le quiz
- [ ] Redirection vers la page de résultats

### Résultats de Quiz
- [ ] Score affiché correctement (0-100%)
- [ ] Emoji correct (🎉 si réussi, 😔 si échoué)
- [ ] Temps passé affiché
- [ ] Correction détaillée s'affiche (si activée)
- [ ] QCM: Bonnes réponses en vert, mauvaises en rouge
- [ ] Texte à trou: Réponses correctes/incorrectes colorées
- [ ] Bouton "Refaire" s'affiche (si autorisé)
- [ ] Bouton "Continuer" fonctionne

### Base de Données
- [ ] Entrée créée dans `lesson_quizzes`
- [ ] Entrée créée dans `quiz_submissions` après soumission
- [ ] Score calculé correctement
- [ ] Champ `passed` correct (true/false)
- [ ] Plusieurs tentatives enregistrées si autorisées

### Edge Cases
- [ ] Ne pas marquer de bonne réponse → Score 0%
- [ ] Réponses vides → Score 0%
- [ ] Texte à trou: Variantes acceptées (Paris = paris)
- [ ] QCM: Une seule réponse sélectionnable à la fois
- [ ] Bouton "Refaire" absent si `allowRetry = false`

---

## 🐛 PROBLÈMES COURANTS

### Problème 1: "Quiz non trouvé"

**Cause**: La leçon n'a pas le bon type dans la BDD

**Solution**:
```sql
-- Vérifier le type de la leçon
SELECT id, title, type FROM lessons WHERE id = 'LESSON_ID';

-- Si le type n'est pas 'qcm' ou 'fill_in_blanks':
UPDATE lessons SET type = 'qcm' WHERE id = 'LESSON_ID';
```

### Problème 2: Erreur lors de la soumission

**Cause**: RLS policy manquante

**Solution**:
```sql
-- Vérifier les policies
SELECT policyname FROM pg_policies WHERE tablename = 'quiz_submissions';

-- Si manquante, exécuter supabase-quiz-system-setup.sql
```

### Problème 3: Score toujours 0%

**Cause**: Aucune réponse marquée comme correcte

**Solution**: Rééditez le quiz et assurez-vous de cliquer sur le cercle pour marquer la bonne réponse (il doit devenir vert avec ✓).

### Problème 4: Ne peut pas accéder au quiz (étudiant)

**Cause**: Étudiant pas inscrit dans le cours

**Solution**:
```sql
-- Inscrire l'étudiant dans le cours
INSERT INTO enrollments (student_id, course_id, classroom_id, status)
VALUES ('STUDENT_ID', 'COURSE_ID', 'CLASSROOM_ID', 'active');
```

---

## 🎉 SUCCÈS!

Si tous les tests passent, votre système de quiz est **100% fonctionnel**!

### Prochaines Étapes:

1. **Créer des vrais quiz** pour vos cours
2. **Former les professeurs** à utiliser l'éditeur
3. **Recueillir les feedbacks** des étudiants
4. **Monitorer les performances** (temps de réponse des requêtes)

---

**Besoin d'aide ? Consultez [GUIDE-SYSTEME-QUIZ-2026-01-24.md](GUIDE-SYSTEME-QUIZ-2026-01-24.md) pour plus de détails.**
