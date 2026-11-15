# 📝 Guide Complet: Système de Quiz (QCM et Texte à Trou)

**Date**: 2026-01-24
**Version**: 1.0

---

## 🎯 FONCTIONNALITÉS

### Pour les Professeurs
- ✅ Créer des **QCM** (Quiz à Choix Multiples)
- ✅ Créer des **Textes à Trou** (Fill in the Blanks)
- ✅ Configurer le score de passage
- ✅ Mélanger les questions et réponses (QCM)
- ✅ Autoriser ou interdire les tentatives multiples
- ✅ Afficher ou cacher les corrections
- ✅ Voir les statistiques des soumissions

### Pour les Étudiants
- ✅ Passer les quiz avec une interface intuitive
- ✅ Voir leur score et leur classement
- ✅ Consulter la correction détaillée
- ✅ Refaire le quiz si autorisé
- ✅ Progression automatique vers le cours suivant

---

## 📦 INSTALLATION

### Étape 1: Exécuter le Script SQL

Exécutez le script SQL suivant dans votre console Supabase:

```bash
psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase-quiz-system-setup.sql
```

**Ou** copiez le contenu de [supabase-quiz-system-setup.sql](supabase-quiz-system-setup.sql) directement dans l'éditeur SQL de Supabase.

### Ce que le script crée:
- ✅ Table `lesson_quizzes` pour stocker les quiz
- ✅ Table `quiz_submissions` pour stocker les soumissions
- ✅ Indexes pour optimiser les performances
- ✅ RLS Policies pour la sécurité
- ✅ Fonctions utilitaires (stats, classement, historique)
- ✅ Vues pour les requêtes courantes

### Étape 2: Vérifier l'Installation

```sql
-- Vérifier que les tables existent
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('lesson_quizzes', 'quiz_submissions');

-- Résultat attendu:
-- lesson_quizzes
-- quiz_submissions
```

---

## 🧑‍🏫 GUIDE PROFESSEUR: Créer un Quiz

### A. Créer un QCM

#### 1. Accéder à l'Édition de Leçon

1. Aller dans votre classroom
2. Cliquer sur une leçon ou créer une nouvelle leçon
3. Cliquer sur "Modifier"

#### 2. Sélectionner le Type "QCM"

Dans la section "Type de contenu", cliquez sur **✅ QCM**.

#### 3. Remplir les Informations de Base

- **Titre**: Nom du quiz (ex: "Quiz Chapitre 1 - Les Bases")
- **Description**: Brève description (optionnel)

#### 4. Ajouter des Questions

Cliquez sur **"+ Ajouter une question"**.

Pour chaque question:
- Écrivez la **question**
- Définissez les **points** (par défaut: 1)
- Ajoutez au moins **2 réponses**
- **Cliquez sur le cercle** pour marquer la bonne réponse ✓
- Ajoutez des réponses supplémentaires si besoin (jusqu'à 6)

**Exemple**:
```
Question: Quelle est la capitale de la France?
Points: 1

○ Lyon
● Paris        ← Bonne réponse
○ Marseille
○ Toulouse
```

#### 5. Configurer les Paramètres

Dans la section "Paramètres":

- **Score de passage**: Note minimum pour réussir (ex: 60%)
- **Autoriser les tentatives multiples**: ✓ ou ✗
- **Afficher les corrections**: ✓ ou ✗
- **Mélanger les questions**: ✓ ou ✗ (randomize)
- **Mélanger les réponses**: ✓ ou ✗

#### 6. Enregistrer

Cliquez sur **"✓ Enregistrer le quiz"** puis **"Enregistrer la leçon"**.

---

### B. Créer un Texte à Trou

#### 1. Sélectionner le Type "Texte à trou"

Dans la section "Type de contenu", cliquez sur **📋 Texte à trou**.

#### 2. Écrire le Texte avec des Trous

Utilisez la syntaxe `{{1}}`, `{{2}}`, etc. pour marquer les trous:

**Exemple**:
```
La capitale de la France est {{1}}. Elle compte environ {{2}} millions d'habitants.
Le fleuve qui traverse Paris s'appelle {{3}}.
```

Le système détecte automatiquement les trous et crée les champs de configuration.

#### 3. Configurer Chaque Trou

Pour chaque trou détecté:

**Trou #1**:
- Réponses correctes: `Paris`, `paris` (plusieurs variantes possibles)
- Indice: "Ville lumière" (optionnel)
- Points: 1

**Trou #2**:
- Réponses correctes: `2`, `2.2`, `deux`
- Indice: "Entre 2 et 3 millions"
- Points: 1

**Trou #3**:
- Réponses correctes: `Seine`, `La Seine`, `la seine`
- Indice: "Commence par S"
- Points: 1

#### 4. Configurer les Paramètres

- **Score de passage**: 60%
- **Sensible à la casse**: ✗ (recommandé)
- **Afficher les indices**: ✓
- **Autoriser les tentatives multiples**: ✓

#### 5. Enregistrer

Cliquez sur **"✓ Enregistrer le quiz"** puis **"Enregistrer la leçon"**.

---

## 🎓 GUIDE ÉTUDIANT: Passer un Quiz

### 1. Accéder au Quiz

- Depuis votre cours, cliquez sur une leçon de type **QCM** ou **Texte à trou**
- Vous serez automatiquement redirigé vers la page du quiz

### 2. Répondre aux Questions

#### Pour un QCM:
- Lisez chaque question attentivement
- Cliquez sur la réponse que vous pensez correcte (un cercle bleu apparaît)
- Vous pouvez changer votre réponse en cliquant sur une autre option
- Le compteur montre combien de questions vous avez répondues

#### Pour un Texte à trou:
- Lisez le texte complet
- Remplissez chaque trou avec votre réponse
- Les indices (💡) peuvent vous aider si activés
- Attention aux majuscules si la casse est sensible

### 3. Soumettre

- Vérifiez vos réponses
- Cliquez sur **"✓ Soumettre mes réponses"**
- ⚠️ Une fois soumis, vous ne pouvez plus modifier (sauf si le professeur autorise les tentatives multiples)

### 4. Voir les Résultats

Après soumission, vous verrez:

**Si réussi (≥ score de passage)**:
```
🎉
85%
Quiz réussi !
```

**Si échoué**:
```
😔
45%
Quiz échoué
```

### 5. Consulter la Correction

La page de résultats affiche:
- Votre score final
- Le temps passé
- La correction détaillée (si activée par le professeur)
- Pour chaque question:
  - ✓ Bonne réponse en vert
  - ✗ Mauvaise réponse en rouge
  - La correction expliquée

### 6. Actions Disponibles

- **🔄 Refaire le quiz**: Si autorisé par le professeur
- **Continuer le cours →**: Passer à la leçon suivante

---

## 📊 VOIR LES STATISTIQUES (Professeurs)

### Statistiques d'un Quiz

```sql
-- Voir les stats d'un quiz spécifique
SELECT * FROM get_quiz_stats('LESSON_ID_ICI');

-- Résultat:
-- total_attempts: 25
-- passed_count: 18
-- failed_count: 7
-- average_score: 72.5
-- average_time_minutes: 8.3
-- students_completed: 20
-- best_score: 100
-- worst_score: 30
```

### Classement des Étudiants

```sql
-- Top 10 des étudiants pour un quiz
SELECT * FROM get_quiz_leaderboard('LESSON_ID_ICI', 10);

-- Résultat:
-- rank | student_name | best_score | time_spent
-- 1    | Marie Dupont | 100        | 360
-- 2    | Jean Martin  | 95         | 420
-- 3    | Sophie Leroy | 90         | 480
```

### Historique d'un Étudiant

```sql
-- Voir toutes les tentatives d'un étudiant
SELECT * FROM get_student_quiz_history('LESSON_ID_ICI', 'STUDENT_ID_ICI');

-- Résultat:
-- attempt_number | score | passed | time_spent | submitted_at
-- 1              | 60    | true   | 480        | 2026-01-24 10:00
-- 2              | 75    | true   | 420        | 2026-01-24 11:30
-- 3              | 90    | true   | 360        | 2026-01-24 14:00
```

---

## 🧪 PROCÉDURE DE TEST

### Test 1: Créer un QCM Simple

1. **Créer une leçon**:
   - Type: QCM
   - Titre: "Test QCM - Mathématiques"

2. **Ajouter 3 questions**:

   **Question 1**:
   - Question: "Combien font 2 + 2 ?"
   - Réponses: 3 (faux), 4 (vrai), 5 (faux)
   - Points: 1

   **Question 2**:
   - Question: "Quelle est la racine carrée de 16 ?"
   - Réponses: 2 (faux), 4 (vrai), 8 (faux)
   - Points: 1

   **Question 3**:
   - Question: "10 ÷ 2 = ?"
   - Réponses: 5 (vrai), 2 (faux), 20 (faux)
   - Points: 1

3. **Paramètres**:
   - Score de passage: 60%
   - Afficher corrections: ✓
   - Autoriser retry: ✓

4. **Enregistrer**

### Test 2: Passer le QCM (Étudiant)

1. Connectez-vous en tant qu'étudiant
2. Allez sur le cours et cliquez sur la leçon QCM
3. Répondez aux 3 questions
4. Cliquez sur "Soumettre"
5. **Résultat attendu**: Score affiché avec correction

### Test 3: Créer un Texte à Trou

1. **Créer une leçon**:
   - Type: Texte à trou
   - Titre: "Test Géographie"

2. **Écrire le texte**:
   ```
   La capitale de la France est {{1}}.
   La France compte {{2}} régions.
   Le fleuve le plus long de France est {{3}}.
   ```

3. **Configurer les trous**:
   - Trou 1: Paris
   - Trou 2: 13, treize
   - Trou 3: Loire, La Loire

4. **Paramètres**:
   - Score de passage: 60%
   - Sensible à la casse: ✗
   - Afficher indices: ✓

5. **Enregistrer**

### Test 4: Passer le Texte à Trou

1. Connectez-vous en tant qu'étudiant
2. Remplissez les 3 trous
3. Soumettez
4. **Résultat attendu**: Score affiché avec correction

### Test 5: Vérifier la Base de Données

```sql
-- Voir les quiz créés
SELECT * FROM lesson_quizzes ORDER BY created_at DESC LIMIT 5;

-- Voir les soumissions
SELECT * FROM quiz_submissions ORDER BY submitted_at DESC LIMIT 10;

-- Voir les meilleures soumissions
SELECT * FROM best_quiz_submissions LIMIT 10;
```

---

## 🔧 DÉPANNAGE

### Problème 1: "Quiz non trouvé"

**Diagnostic**:
```sql
-- Vérifier que le quiz existe
SELECT * FROM lesson_quizzes WHERE lesson_id = 'LESSON_ID_ICI';
```

**Solution**:
- Le quiz n'a pas été enregistré
- Retournez sur la page d'édition de leçon
- Recréez le quiz et cliquez sur "Enregistrer le quiz"

### Problème 2: Erreur lors de la Soumission

**Erreur**: `RLS policy violation` ou `permission denied`

**Diagnostic**:
```sql
-- Vérifier les policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'quiz_submissions' AND cmd = 'INSERT';
```

**Solution**:
```sql
-- Recréer la policy pour les étudiants
DROP POLICY IF EXISTS "Students can submit their quizzes" ON quiz_submissions;
CREATE POLICY "Students can submit their quizzes"
  ON quiz_submissions
  FOR INSERT
  WITH CHECK (student_id = auth.uid());
```

### Problème 3: Correction ne s'affiche pas

**Cause**: Le paramètre "Afficher les corrections" est désactivé

**Solution**:
1. Éditez la leçon
2. Dans les paramètres du quiz
3. Cochez ✓ "Afficher les corrections après soumission"
4. Enregistrez

### Problème 4: Score toujours 0%

**Diagnostic**:
- Vérifiez qu'au moins une réponse est marquée comme correcte (QCM)
- Vérifiez que les réponses correctes sont renseignées (Texte à trou)

**Solution**:
1. Éditez le quiz
2. Pour chaque question/trou, assurez-vous qu'il y a une réponse correcte définie
3. Enregistrez

---

## 📊 STRUCTURE DES DONNÉES

### Table: lesson_quizzes

```sql
CREATE TABLE lesson_quizzes (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  quiz_type TEXT, -- 'qcm' ou 'fill_in_blanks'
  data JSONB, -- QCMData ou FillInBlanksData
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Exemple de data (QCM)**:
```json
{
  "title": "Quiz Chapitre 1",
  "description": "Test de connaissances",
  "questions": [
    {
      "id": "q1",
      "question": "Combien font 2+2?",
      "points": 1,
      "answers": [
        {"id": "a1", "text": "3", "isCorrect": false},
        {"id": "a2", "text": "4", "isCorrect": true}
      ]
    }
  ],
  "passingScore": 60,
  "showCorrectAnswers": true,
  "allowRetry": true
}
```

**Exemple de data (Texte à trou)**:
```json
{
  "title": "Exercice Géographie",
  "text": "La capitale de la France est {{1}}.",
  "blanks": [
    {
      "id": "b1",
      "position": 1,
      "correctAnswers": ["Paris", "paris"],
      "hint": "Ville lumière",
      "points": 1
    }
  ],
  "caseSensitive": false,
  "showHints": true,
  "passingScore": 60
}
```

### Table: quiz_submissions

```sql
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  student_id UUID REFERENCES users(id),
  quiz_type TEXT,
  answers JSONB, -- Réponses de l'étudiant
  score INTEGER, -- 0-100
  passed BOOLEAN,
  time_spent INTEGER, -- Secondes
  submitted_at TIMESTAMPTZ
);
```

**Exemple de answers (QCM)**:
```json
{
  "q1": "a2",  // questionId -> answerId
  "q2": "a5",
  "q3": "a9"
}
```

**Exemple de answers (Texte à trou)**:
```json
{
  "1": "Paris",    // position -> answer
  "2": "13",
  "3": "Loire"
}
```

---

## 🎯 BONNES PRATIQUES

### Pour les Professeurs

1. **Questions claires**: Évitez les questions ambiguës
2. **Points équilibrés**: Donnez plus de points aux questions difficiles
3. **Score de passage réaliste**: 60-70% est un bon compromis
4. **Afficher les corrections**: Permet aux étudiants d'apprendre de leurs erreurs
5. **Autoriser les tentatives multiples**: Encourage la persévérance

### Pour les QCM

- Au moins **2 réponses** par question
- Maximum **6 réponses** pour éviter la confusion
- Mélangez les réponses pour éviter la triche
- Ajoutez des explications pour les questions complexes

### Pour les Textes à Trou

- Acceptez plusieurs **variantes** (Paris, paris, PARIS)
- Utilisez des **indices** pour guider les étudiants
- Testez vos réponses correctes vous-même
- N'activez la casse que si vraiment nécessaire

---

## 🚀 FONCTIONNALITÉS AVANCÉES (À venir)

- [ ] Limite de temps par quiz
- [ ] Questions à choix multiples (plusieurs bonnes réponses)
- [ ] Export des résultats en CSV/Excel
- [ ] Notifications aux professeurs après chaque soumission
- [ ] Badges et récompenses pour les meilleurs scores
- [ ] Mode "entraînement" sans enregistrement du score

---

## 📝 CHECKLIST DE MISE EN PRODUCTION

### Avant de déployer:

- [ ] Script SQL exécuté en production
- [ ] Tables `lesson_quizzes` et `quiz_submissions` créées
- [ ] RLS policies actives et testées
- [ ] Indexes créés pour optimiser les performances
- [ ] Au moins 1 quiz de test créé et soumis
- [ ] Vérifier que les étudiants peuvent soumettre
- [ ] Vérifier que les résultats s'affichent correctement
- [ ] Tester les tentatives multiples (si activées)
- [ ] Vérifier les statistiques professeur

### Après déploiement:

- [ ] Monitorer les performances des requêtes
- [ ] Vérifier les logs d'erreurs Supabase
- [ ] Recueillir les feedbacks des professeurs
- [ ] Recueillir les feedbacks des étudiants

---

**Système de quiz prêt à l'emploi ! 🎉**

*Besoin d'aide ? Consultez la documentation ou contactez le support technique.*
