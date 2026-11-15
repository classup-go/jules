import { z } from 'zod'

// Lesson content schemas (discriminated union by type)
const videoLessonContentSchema = z.object({
  type: z.literal('video'),
  video_url: z.string().url().optional(),
  video_file: z.string().optional(),
  duration: z.number().positive('La durée doit être positive'),
  description: z.string().min(10, 'Minimum 10 caractères pour la description')
})

const pdfLessonContentSchema = z.object({
  type: z.literal('pdf'),
  pdf_file: z.string().min(1, 'PDF requis'),
  description: z.string().min(10, 'Minimum 10 caractères pour la description')
})

const quizQuestionSchema = z.object({
  question: z.string().min(5, 'Minimum 5 caractères pour la question'),
  options: z.array(z.string().min(1, 'Option ne peut pas être vide')).min(2, 'Minimum 2 options').max(6, 'Maximum 6 options'),
  correct_answer: z.number().min(0, 'Réponse correcte invalide'),
  explanation: z.string().optional()
})

const quizLessonContentSchema = z.object({
  type: z.literal('quiz'),
  questions: z.array(quizQuestionSchema).min(3, 'Minimum 3 questions pour un quiz')
})

const exerciseLessonContentSchema = z.object({
  type: z.literal('exercise'),
  statement: z.string().min(10, 'Minimum 10 caractères pour l\'énoncé'),
  solution: z.string().min(10, 'Minimum 10 caractères pour la solution'),
  hints: z.array(z.string()).optional()
})

const liveLessonContentSchema = z.object({
  type: z.literal('live'),
  scheduled_at: z.date({ required_error: 'Date de planification requise' }),
  duration: z.number().positive('La durée doit être positive'),
  max_participants: z.number().positive().default(50)
})

// Discriminated union for lesson content
const lessonContentSchema = z.discriminatedUnion('type', [
  videoLessonContentSchema,
  pdfLessonContentSchema,
  quizLessonContentSchema,
  exerciseLessonContentSchema,
  liveLessonContentSchema
])

// Lesson schema
export const lessonSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'Minimum 3 caractères').max(100, 'Maximum 100 caractères'),
  type: z.enum(['video', 'pdf', 'quiz', 'exercise', 'live'], {
    required_error: 'Type de leçon requis'
  }),
  is_free: z.boolean().default(false),
  order_index: z.number().min(0),
  content: lessonContentSchema.optional()
})

// Chapter schema
export const chapterSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'Minimum 3 caractères').max(100, 'Maximum 100 caractères'),
  order_index: z.number().min(0),
  lessons: z.array(lessonSchema).min(1, 'Un chapitre doit contenir au moins 1 leçon')
})

// Completion criteria schema
const completionCriteriaSchema = z.object({
  min_lessons_completed: z.number().min(1, 'Au moins 1 leçon doit être requise'),
  require_all_quizzes: z.boolean().default(false),
  min_quiz_score: z.number().min(0).max(100).optional()
})

// Main course wizard schema
export const courseWizardSchema = z.object({
  // Step 0: Classroom Selection
  classroom_id: z.string().uuid('ID de classe invalide').optional(),

  // Step 1: General Information
  title: z.string().min(5, 'Minimum 5 caractères').max(100, 'Maximum 100 caractères'),
  subject: z.string().min(1, 'Matière requise'),
  level: z.enum(['primaire', 'college', 'lycee', 'superieur'], {
    required_error: 'Niveau requis'
  }),
  exam_prep: z.string().optional(),
  language: z.enum(['fr', 'ar', 'en'], {
    required_error: 'Langue requise'
  }).default('fr'),
  difficulty: z.enum(['debutant', 'intermediaire', 'avance'], {
    required_error: 'Difficulté requise'
  }),
  description: z.string().min(20, 'Minimum 20 caractères pour la description').optional(),

  // Step 1: Duration (flexible - all optional)
  duration_minutes: z.number()
    .int('Doit être un nombre entier')
    .min(1, 'Minimum 1 minute')
    .max(600, 'Maximum 600 minutes (10 heures)')
    .optional(),
  duration_hours: z.number()
    .int('Doit être un nombre entier')
    .min(1, 'Minimum 1 heure')
    .max(500, 'Maximum 500 heures')
    .optional(),
  duration_weeks: z.number()
    .int('Doit être un nombre entier')
    .min(1, 'Minimum 1 semaine')
    .max(52, 'Maximum 52 semaines (1 an)')
    .optional(),

  // Step 2: Objectives & Prerequisites
  learning_objectives: z.array(z.string().min(10, 'Minimum 10 caractères par objectif'))
    .min(3, 'Minimum 3 objectifs d\'apprentissage')
    .max(5, 'Maximum 5 objectifs d\'apprentissage'),
  prerequisites: z.array(z.string().min(5, 'Minimum 5 caractères par prérequis'))
    .max(5, 'Maximum 5 prérequis')
    .optional(),

  // Step 3 & 4: Structure & Content
  chapters: z.array(chapterSchema).min(1, 'Le cours doit contenir au moins 1 chapitre'),

  // Step 5: Evaluation
  completion_criteria: completionCriteriaSchema,

  // Step 6: Access & Monetization
  access_type: z.enum(['free', 'premium', 'freemium'], {
    required_error: 'Type d\'accès requis'
  }),
  price: z.number().min(0, 'Le prix ne peut pas être négatif').optional(),

  // Meta
  status: z.enum(['draft', 'published']).default('draft')
}).refine(data => {
  // Business Rule: At least 1 free lesson with content
  const allLessons = data.chapters.flatMap(ch => ch.lessons)
  const freeLessonsWithContent = allLessons.filter(l => l.is_free && l.content !== undefined && l.content !== null)
  return freeLessonsWithContent.length >= 1
}, {
  message: 'Au moins 1 leçon gratuite doit avoir du contenu (vidéo, PDF, quiz, exercice ou live)',
  path: ['chapters']
}).refine(data => {
  // Business Rule: Premium/Freemium courses must have a price
  if ((data.access_type === 'premium' || data.access_type === 'freemium') && !data.price) {
    return false
  }
  return true
}, {
  message: 'Les cours premium/freemium doivent avoir un prix',
  path: ['price']
}).refine(data => {
  // Business Rule: Can't require more lessons than exist
  const totalLessons = data.chapters.flatMap(ch => ch.lessons).length
  return data.completion_criteria.min_lessons_completed <= totalLessons
}, {
  message: 'Le nombre de leçons requises ne peut pas dépasser le nombre total de leçons',
  path: ['completion_criteria', 'min_lessons_completed']
})

// Export types
export type CourseWizardData = z.infer<typeof courseWizardSchema>
export type LessonData = z.infer<typeof lessonSchema>
export type ChapterData = z.infer<typeof chapterSchema>
export type LessonContent = z.infer<typeof lessonContentSchema>
export type CompletionCriteria = z.infer<typeof completionCriteriaSchema>
