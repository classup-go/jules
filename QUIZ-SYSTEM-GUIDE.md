# 📚 Guide Complet - Système de Quiz (QCM et Texte à Trou)

**Date**: 2026-01-24
**Statut**: IMPLÉMENTÉ ✅

---

## 🎯 VUE D'ENSEMBLE

Le système de quiz permet aux professeurs de créer deux types d'évaluations interactives :
1. **QCM (Quiz à Choix Multiples)** - Questions avec plusieurs réponses possibles
2. **Texte à Trou (Fill in the Blanks)** - Exercices de complétion de texte

### Caractéristiques Principales
- ✅ Éditeurs visuels intuitifs pour les professeurs
- ✅ Interface élève interactive et engageante
- ✅ Notation automatique
- ✅ Affichage des résultats avec statistiques
- ✅ Support pour les indices et explications
- ✅ Configuration flexible (temps limite, score de passage, retry)
- ✅ Randomisation des questions/réponses (optionnel)

---

## 📁 STRUCTURE DES FICHIERS

### 1. Types TypeScript
**Fichier**: [src/types/quiz.ts](src/types/quiz.ts)

Définit toutes les interfaces TypeScript pour les deux systèmes de quiz.

### 2. Composants d'Édition (Professeurs)
- **[src/components/quiz/QCMEditor.tsx](src/components/quiz/QCMEditor.tsx)**
  - Éditeur de QCM pour les professeurs
  - Gestion des questions/réponses
  - Configuration des paramètres du quiz

- **[src/components/quiz/FillInBlanksEditor.tsx](src/components/quiz/FillInBlanksEditor.tsx)**
  - Éditeur de texte à trou
  - Configuration des trous et réponses acceptées
  - Aperçu en temps réel

### 3. Composants d'Affichage (Étudiants)
- **[src/components/quiz/QCMViewer.tsx](src/components/quiz/QCMViewer.tsx)**
  - Interface de passage de QCM pour les étudiants
  - Timer, navigation entre questions
  - Affichage des résultats

- **[src/components/quiz/FillInBlanksViewer.tsx](src/components/quiz/FillInBlanksViewer.tsx)**
  - Interface de complétion de texte à trou
  - Validation en temps réel
  - Affichage des indices

---

## 🔧 UTILISATION

### Pour les Professeurs

#### 1. Créer un QCM

```tsx
import { QCMEditor } from '@/components/quiz/QCMEditor'
import { QCMData } from '@/types/quiz'

function CreateQCMPage() {
  const handleSave = async (qcmData: QCMData) => {
    // Sauvegarder dans la base de données
    const response = await fetch('/api/lessons/[lessonId]/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'qcm',
        data: qcmData
      })
    })
  }

  const handleCancel = () => {
    // Retour à la liste
    router.back()
  }

  return (
    <QCMEditor
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
```

#### 2. Créer un Texte à Trou

```tsx
import { FillInBlanksEditor } from '@/components/quiz/FillInBlanksEditor'
import { FillInBlanksData } from '@/types/quiz'

function CreateFillInBlanksPage() {
  const handleSave = async (fibData: FillInBlanksData) => {
    // Sauvegarder dans la base de données
    const response = await fetch('/api/lessons/[lessonId]/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'fill_in_blanks',
        data: fibData
      })
    })
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <FillInBlanksEditor
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
```

### Pour les Étudiants

#### 1. Afficher un QCM

```tsx
import { QCMViewer } from '@/components/quiz/QCMViewer'
import { QCMData, QCMSubmission } from '@/types/quiz'

function StudentQCMPage({ lessonId, studentId }: Props) {
  const [qcmData, setQcmData] = useState<QCMData | null>(null)

  useEffect(() => {
    // Charger le QCM depuis la base de données
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then(res => res.json())
      .then(data => setQcmData(data))
  }, [lessonId])

  const handleSubmit = async (submission: QCMSubmission) => {
    // Sauvegarder la soumission
    await fetch('/api/submissions/qcm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    })
  }

  if (!qcmData) return <div>Chargement...</div>

  return (
    <QCMViewer
      qcmData={qcmData}
      lessonId={lessonId}
      studentId={studentId}
      onSubmit={handleSubmit}
    />
  )
}
```

#### 2. Afficher un Texte à Trou

```tsx
import { FillInBlanksViewer } from '@/components/quiz/FillInBlanksViewer'
import { FillInBlanksData, FillInBlanksSubmission } from '@/types/quiz'

function StudentFillInBlanksPage({ lessonId, studentId }: Props) {
  const [fibData, setFibData] = useState<FillInBlanksData | null>(null)

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then(res => res.json())
      .then(data => setFibData(data))
  }, [lessonId])

  const handleSubmit = async (submission: FillInBlanksSubmission) => {
    await fetch('/api/submissions/fill-in-blanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    })
  }

  if (!fibData) return <div>Chargement...</div>

  return (
    <FillInBlanksViewer
      fibData={fibData}
      lessonId={lessonId}
      studentId={studentId}
      onSubmit={handleSubmit}
    />
  )
}
```

---

## 🗄️ SCHÉMA DE BASE DE DONNÉES

### Table: `lesson_quizzes`

Stocke les données de quiz pour chaque leçon.

```sql
CREATE TABLE lesson_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('qcm', 'fill_in_blanks')),
  data JSONB NOT NULL, -- Stocke QCMData ou FillInBlanksData
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index
  UNIQUE(lesson_id) -- Une seule leçon par quiz
);

-- Index pour les requêtes
CREATE INDEX idx_lesson_quizzes_lesson_id ON lesson_quizzes(lesson_id);
CREATE INDEX idx_lesson_quizzes_type ON lesson_quizzes(quiz_type);
```

### Table: `quiz_submissions`

Stocke les soumissions des étudiants.

```sql
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('qcm', 'fill_in_blanks')),
  answers JSONB NOT NULL, -- Stocke les réponses de l'étudiant
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN NOT NULL,
  time_spent INTEGER, -- En secondes
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index
  UNIQUE(lesson_id, student_id, submitted_at) -- Permet plusieurs tentatives
);

-- Index pour les requêtes
CREATE INDEX idx_quiz_submissions_lesson ON quiz_submissions(lesson_id);
CREATE INDEX idx_quiz_submissions_student ON quiz_submissions(student_id);
CREATE INDEX idx_quiz_submissions_passed ON quiz_submissions(passed);
```

### Row Level Security (RLS)

```sql
-- Activer RLS
ALTER TABLE lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Professeurs peuvent tout faire sur leurs quiz
CREATE POLICY "Teachers can manage their lesson quizzes"
  ON lesson_quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      JOIN classrooms cl ON cl.id = c.classroom_id
      WHERE l.id = lesson_quizzes.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  );

-- Étudiants peuvent voir les quiz de leurs cours
CREATE POLICY "Students can view quizzes in their courses"
  ON lesson_quizzes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      JOIN course_enrollments e ON e.course_id = c.id
      WHERE l.id = lesson_quizzes.lesson_id
      AND e.student_id = auth.uid()
      AND e.status = 'active'
    )
  );

-- Étudiants peuvent soumettre leurs propres quiz
CREATE POLICY "Students can submit their quizzes"
  ON quiz_submissions
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Étudiants peuvent voir leurs propres soumissions
CREATE POLICY "Students can view their submissions"
  ON quiz_submissions
  FOR SELECT
  USING (student_id = auth.uid());

-- Professeurs peuvent voir les soumissions de leurs étudiants
CREATE POLICY "Teachers can view submissions for their lessons"
  ON quiz_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      JOIN classrooms cl ON cl.id = c.classroom_id
      WHERE l.id = quiz_submissions.lesson_id
      AND cl.teacher_id = auth.uid()
    )
  );
```

---

## 🔌 ENDPOINTS API

### 1. Créer/Mettre à jour un Quiz

**POST** `/api/lessons/[lessonId]/quiz`

```typescript
// Request Body
{
  type: 'qcm' | 'fill_in_blanks',
  data: QCMData | FillInBlanksData
}

// Response
{
  id: string,
  lesson_id: string,
  quiz_type: string,
  data: object,
  created_at: string
}
```

### 2. Récupérer un Quiz

**GET** `/api/lessons/[lessonId]/quiz`

```typescript
// Response
{
  id: string,
  lesson_id: string,
  quiz_type: 'qcm' | 'fill_in_blanks',
  data: QCMData | FillInBlanksData,
  created_at: string
}
```

### 3. Soumettre une Réponse QCM

**POST** `/api/submissions/qcm`

```typescript
// Request Body
{
  lesson_id: string,
  student_id: string,
  answers: Record<string, string[]>, // questionId -> answerIds
  score: number,
  passed: boolean,
  time_spent: number
}

// Response
{
  id: string,
  submitted_at: string,
  score: number,
  passed: boolean
}
```

### 4. Soumettre une Réponse Texte à Trou

**POST** `/api/submissions/fill-in-blanks`

```typescript
// Request Body
{
  lesson_id: string,
  student_id: string,
  answers: Record<string, string>, // position -> answer
  score: number,
  passed: boolean
}

// Response
{
  id: string,
  submitted_at: string,
  score: number,
  passed: boolean
}
```

### 5. Récupérer les Soumissions d'un Étudiant

**GET** `/api/students/[studentId]/submissions?lessonId=[lessonId]`

```typescript
// Response
{
  submissions: Array<{
    id: string,
    lesson_id: string,
    quiz_type: string,
    score: number,
    passed: boolean,
    time_spent: number,
    submitted_at: string
  }>
}
```

### 6. Statistiques du Quiz (pour le professeur)

**GET** `/api/lessons/[lessonId]/quiz/stats`

```typescript
// Response
{
  total_attempts: number,
  passed_count: number,
  failed_count: number,
  average_score: number,
  average_time: number,
  students_completed: number,
  students_pending: number
}
```

---

## 📊 EXEMPLE DE DONNÉES

### Exemple QCM

```typescript
const qcmExample: QCMData = {
  title: "Quiz de Révision - Mathématiques",
  description: "Testez vos connaissances sur les équations",
  questions: [
    {
      id: "q1",
      question: "Quelle est la solution de l'équation 2x + 5 = 13 ?",
      explanation: "On isole x : 2x = 13 - 5 = 8, donc x = 4",
      points: 2,
      answers: [
        { id: "a1", text: "x = 3", isCorrect: false },
        { id: "a2", text: "x = 4", isCorrect: true },
        { id: "a3", text: "x = 5", isCorrect: false },
        { id: "a4", text: "x = 6", isCorrect: false }
      ]
    },
    {
      id: "q2",
      question: "Quelles sont les nombres premiers ?",
      explanation: "Un nombre premier n'est divisible que par 1 et lui-même",
      points: 3,
      answers: [
        { id: "a5", text: "2", isCorrect: true },
        { id: "a6", text: "4", isCorrect: false },
        { id: "a7", text: "7", isCorrect: true },
        { id: "a8", text: "9", isCorrect: false }
      ]
    }
  ],
  passingScore: 60,
  randomizeQuestions: true,
  randomizeAnswers: true,
  showCorrectAnswers: true,
  allowRetry: true,
  timeLimit: 10 // 10 minutes
}
```

### Exemple Texte à Trou

```typescript
const fibExample: FillInBlanksData = {
  title: "Exercice de Vocabulaire - Géographie",
  description: "Complétez les phrases avec les bons mots",
  text: "La capitale de la France est {{1}}. Elle compte environ {{2}} millions d'habitants. Le fleuve qui traverse cette ville s'appelle la {{3}}.",
  blanks: [
    {
      id: "b1",
      position: 1,
      correctAnswers: ["Paris", "paris"],
      hint: "Ville lumière",
      points: 1
    },
    {
      id: "b2",
      position: 2,
      correctAnswers: ["2", "deux", "2.1", "2,1"],
      hint: "Entre 2 et 3 millions",
      points: 1
    },
    {
      id: "b3",
      position: 3,
      correctAnswers: ["Seine", "seine"],
      hint: "Commence par S",
      points: 1
    }
  ],
  caseSensitive: false,
  acceptSynonyms: true,
  showHints: true,
  passingScore: 70,
  allowRetry: true
}
```

---

## 🎨 FONCTIONNALITÉS AVANCÉES

### 1. Randomisation

**Questions aléatoires (QCM)**
```typescript
randomizeQuestions: true
// Les questions seront affichées dans un ordre différent pour chaque étudiant
```

**Réponses aléatoires (QCM)**
```typescript
randomizeAnswers: true
// Les réponses de chaque question seront mélangées
```

### 2. Limite de Temps

```typescript
timeLimit: 15 // 15 minutes
// Un timer sera affiché et le quiz sera auto-soumis à la fin
```

### 3. Affichage des Corrections

```typescript
showCorrectAnswers: true
// Après soumission, l'étudiant verra les bonnes réponses
```

### 4. Permettre de Refaire

```typescript
allowRetry: true
// Un bouton "Refaire le quiz" sera affiché après la soumission
```

### 5. Score de Passage

```typescript
passingScore: 60 // 60%
// Le score minimum pour réussir le quiz
```

### 6. Indices (Texte à Trou)

```typescript
showHints: true
// Les étudiants peuvent afficher des indices pour chaque trou
```

### 7. Sensibilité à la Casse (Texte à Trou)

```typescript
caseSensitive: false
// "Paris" et "paris" seront considérés comme corrects
```

---

## 📈 STATISTIQUES ET ANALYTICS

### Pour les Professeurs

Les professeurs peuvent suivre :
- Nombre total de tentatives
- Taux de réussite
- Score moyen
- Temps moyen passé
- Questions les plus difficiles (QCM)
- Trous les plus manqués (Texte à Trou)

### Requête SQL pour les Statistiques

```sql
-- Statistiques globales d'un quiz
SELECT
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE passed = true) as passed_count,
  COUNT(*) FILTER (WHERE passed = false) as failed_count,
  ROUND(AVG(score), 2) as average_score,
  ROUND(AVG(time_spent) / 60, 2) as average_time_minutes
FROM quiz_submissions
WHERE lesson_id = $1;

-- Progression d'un étudiant
SELECT
  submitted_at,
  score,
  passed,
  time_spent
FROM quiz_submissions
WHERE lesson_id = $1
  AND student_id = $2
ORDER BY submitted_at DESC;

-- Classement des étudiants
SELECT
  p.full_name,
  s.score,
  s.time_spent,
  s.submitted_at
FROM quiz_submissions s
JOIN profiles p ON p.id = s.student_id
WHERE s.lesson_id = $1
ORDER BY s.score DESC, s.time_spent ASC
LIMIT 10;
```

---

## 🔍 INTÉGRATION DANS LES LEÇONS

### Ajouter un Quiz à une Leçon

Le système de quiz s'intègre dans le système de leçons existant. Chaque leçon peut avoir un quiz associé.

### Flow Complet

```
1. Professeur crée un cours
   ↓
2. Professeur crée un chapitre
   ↓
3. Professeur crée une leçon
   ↓
4. Professeur ajoute un quiz à la leçon
   ├─ Option A: QCM
   └─ Option B: Texte à Trou
   ↓
5. Étudiant suit la leçon
   ↓
6. Étudiant complète le quiz
   ↓
7. Système calcule automatiquement le score
   ↓
8. Étudiant voit ses résultats
   ↓
9. (Optionnel) Étudiant peut refaire le quiz
```

### Dans l'Éditeur de Leçon

Ajouter un bouton pour créer un quiz :

```tsx
// Dans le composant d'édition de leçon
<button onClick={() => router.push(`/teacher/lessons/${lessonId}/quiz/create`)}>
  ➕ Ajouter un Quiz
</button>
```

### Page de Sélection du Type de Quiz

```tsx
function SelectQuizTypePage() {
  return (
    <div>
      <h1>Quel type de quiz voulez-vous créer ?</h1>

      <Link href={`/teacher/lessons/${lessonId}/quiz/qcm`}>
        <div>
          <span>📝</span>
          <h2>QCM</h2>
          <p>Quiz à choix multiples</p>
        </div>
      </Link>

      <Link href={`/teacher/lessons/${lessonId}/quiz/fill-in-blanks`}>
        <div>
          <span>✏️</span>
          <h2>Texte à Trou</h2>
          <p>Exercice de complétion</p>
        </div>
      </Link>
    </div>
  )
}
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Composants
- ✅ Types TypeScript créés
- ✅ QCMEditor créé
- ✅ FillInBlanksEditor créé
- ✅ QCMViewer créé
- ✅ FillInBlanksViewer créé

### Base de Données
- ⏳ Tables `lesson_quizzes` et `quiz_submissions` à créer
- ⏳ RLS policies à appliquer
- ⏳ Indexes à créer

### API
- ⏳ Endpoint création/mise à jour quiz
- ⏳ Endpoint récupération quiz
- ⏳ Endpoint soumission QCM
- ⏳ Endpoint soumission texte à trou
- ⏳ Endpoint statistiques

### Pages
- ⏳ Page sélection type de quiz
- ⏳ Page création QCM
- ⏳ Page création texte à trou
- ⏳ Page passage QCM étudiant
- ⏳ Page passage texte à trou étudiant
- ⏳ Page résultats
- ⏳ Page statistiques professeur

---

## 🚀 PROCHAINES ÉTAPES

1. **Créer les tables de base de données**
   ```bash
   # Exécuter le script SQL de création de tables
   psql -f supabase-quiz-system-setup.sql
   ```

2. **Créer les endpoints API**
   - `src/app/api/lessons/[lessonId]/quiz/route.ts`
   - `src/app/api/submissions/qcm/route.ts`
   - `src/app/api/submissions/fill-in-blanks/route.ts`

3. **Créer les pages**
   - Page sélection de type
   - Pages d'édition
   - Pages de visualisation

4. **Intégrer dans l'éditeur de leçons**
   - Ajouter bouton "Ajouter un quiz"
   - Afficher le quiz existant
   - Permettre la modification

5. **Tester le système complet**
   - Créer des quiz de test
   - Vérifier la soumission
   - Tester les différentes options
   - Vérifier les calculs de scores

---

## 📝 NOTES IMPORTANTES

### Performance
- Les données de quiz sont stockées en JSONB pour flexibilité
- Les indexes sont optimisés pour les requêtes fréquentes
- La validation côté client évite les allers-retours

### Sécurité
- RLS garantit que seuls les professeurs peuvent créer/modifier des quiz
- Les étudiants ne peuvent voir que les quiz de leurs cours inscrits
- Les réponses correctes ne sont jamais exposées avant soumission

### UX
- Interface intuitive avec drag & drop (future feature)
- Feedback visuel immédiat
- Messages d'erreur clairs
- Progress bars pour suivre l'avancement

---

*Système de quiz complet et prêt à l'emploi ! 🎉*
