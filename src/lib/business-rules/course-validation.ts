import { CourseWizardData } from '../validations/course-wizard'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export function validateCourseBusinessRules(course: Partial<CourseWizardData>): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Rule 1: At least 1 free lesson with content (CRITICAL)
  if (course.chapters && course.chapters.length > 0) {
    const allLessons = course.chapters.flatMap(ch => ch.lessons)
    const freeLessons = allLessons.filter(l => l.is_free)
    const freeLessonsWithContent = freeLessons.filter(l => l.content !== undefined && l.content !== null)

    if (freeLessons.length === 0) {
      warnings.push({
        field: 'chapters',
        message: 'Aucune leçon gratuite n\'a été définie. Il est recommandé d\'avoir au moins 1 leçon gratuite.',
        severity: 'warning'
      })
    }

    if (freeLessonsWithContent.length === 0 && freeLessons.length > 0) {
      errors.push({
        field: 'chapters',
        message: 'Au moins 1 leçon gratuite doit avoir du contenu (vidéo, PDF, quiz, exercice ou live)',
        severity: 'error'
      })
    }
  }

  // Rule 2: Premium/Freemium courses must have a price
  if (course.access_type && (course.access_type === 'premium' || course.access_type === 'freemium')) {
    if (!course.price || course.price <= 0) {
      errors.push({
        field: 'price',
        message: 'Les cours premium/freemium doivent avoir un prix supérieur à 0',
        severity: 'error'
      })
    }
  }

  // Rule 3: Can't require more lessons than exist
  if (course.chapters && course.completion_criteria) {
    const totalLessons = course.chapters.flatMap(ch => ch.lessons).length
    if (course.completion_criteria.min_lessons_completed > totalLessons) {
      errors.push({
        field: 'completion_criteria.min_lessons_completed',
        message: `Impossible de requérir ${course.completion_criteria.min_lessons_completed} leçons alors qu'il n'y en a que ${totalLessons}`,
        severity: 'error'
      })
    }
  }

  // Rule 4: Quiz score requirement only valid if quizzes are required
  if (course.completion_criteria?.min_quiz_score !== undefined && !course.completion_criteria?.require_all_quizzes) {
    warnings.push({
      field: 'completion_criteria.min_quiz_score',
      message: 'Le score minimum de quiz n\'est pris en compte que si "Tous les quiz requis" est activé',
      severity: 'warning'
    })
  }

  // Rule 5: Warn if no chapters or lessons
  if (!course.chapters || course.chapters.length === 0) {
    warnings.push({
      field: 'chapters',
      message: 'Le cours doit contenir au moins 1 chapitre avec des leçons',
      severity: 'warning'
    })
  }

  // Rule 6: Warn if free course has a price
  if (course.access_type === 'free' && course.price && course.price > 0) {
    warnings.push({
      field: 'price',
      message: 'Un cours gratuit ne devrait pas avoir de prix',
      severity: 'warning'
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Helper to check if course is ready for publication
export function canPublishCourse(course: Partial<CourseWizardData>): { canPublish: boolean; blockers: string[] } {
  const validation = validateCourseBusinessRules(course)
  const blockers: string[] = []

  // Check all required fields
  if (!course.title || course.title.length < 5) {
    blockers.push('Le titre du cours est requis (minimum 5 caractères)')
  }

  if (!course.subject) {
    blockers.push('La matière est requise')
  }

  if (!course.level) {
    blockers.push('Le niveau est requis')
  }

  if (!course.difficulty) {
    blockers.push('La difficulté est requise')
  }

  if (!course.learning_objectives || course.learning_objectives.length < 3) {
    blockers.push('Au moins 3 objectifs d\'apprentissage sont requis')
  }

  if (!course.chapters || course.chapters.length === 0) {
    blockers.push('Le cours doit contenir au moins 1 chapitre')
  }

  if (!course.access_type) {
    blockers.push('Le type d\'accès est requis')
  }

  if (!course.completion_criteria) {
    blockers.push('Les critères de complétion sont requis')
  }

  // Add business rule errors as blockers
  validation.errors.forEach(error => {
    blockers.push(error.message)
  })

  return {
    canPublish: blockers.length === 0,
    blockers
  }
}
