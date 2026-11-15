// Types pour les systèmes de quiz (QCM et texte à trou)

// ==================== QCM (Quiz à Choix Multiples) ====================

export interface QCMQuestion {
  id: string
  question: string
  explanation?: string // Explication de la réponse
  points: number // Points attribués pour cette question
  answers: QCMAnswer[]
}

export interface QCMAnswer {
  id: string
  text: string
  isCorrect: boolean
}

export interface QCMData {
  title: string
  description?: string
  questions: QCMQuestion[]
  passingScore: number // Score minimum pour réussir (en pourcentage)
  randomizeQuestions?: boolean // Mélanger l'ordre des questions
  randomizeAnswers?: boolean // Mélanger l'ordre des réponses
  showCorrectAnswers?: boolean // Montrer les bonnes réponses après soumission
  allowRetry?: boolean // Permettre de refaire le QCM
  timeLimit?: number // Limite de temps en minutes (optionnel)
}

// Résultat de soumission QCM
export interface QCMSubmission {
  id: string
  lesson_id: string
  student_id: string
  answers: Record<string, string[]> // questionId -> selectedAnswerIds[]
  score: number // Score obtenu (0-100)
  passed: boolean // A réussi ou non
  time_spent: number // Temps passé en secondes
  submitted_at: string
}

// ==================== Texte à Trou (Fill in the Blanks) ====================

export interface FillInBlanksData {
  title: string
  description?: string
  text: string // Texte avec placeholders comme {{1}}, {{2}}, etc.
  blanks: FillInBlank[]
  caseSensitive?: boolean // Sensible à la casse
  acceptSynonyms?: boolean // Accepter les synonymes
  showHints?: boolean // Afficher des indices
  passingScore: number // Score minimum pour réussir (en pourcentage)
  allowRetry?: boolean // Permettre de refaire l'exercice
}

export interface FillInBlank {
  id: string
  position: number // Position du trou (1, 2, 3, etc.)
  correctAnswers: string[] // Réponses correctes possibles
  hint?: string // Indice pour aider l'étudiant
  points: number // Points attribués pour ce trou
}

// Résultat de soumission Texte à Trou
export interface FillInBlanksSubmission {
  id: string
  lesson_id: string
  student_id: string
  answers: Record<string, string> // position -> answer
  score: number // Score obtenu (0-100)
  passed: boolean // A réussi ou non
  submitted_at: string
}

// ==================== Types Génériques ====================

export type QuizType = 'qcm' | 'fill_in_blanks'

export interface QuizResult {
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  timeSpent?: number
}
