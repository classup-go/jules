/**
 * Types TypeScript pour le Modèle Programme Unifié
 * Correspond à la migration 003-unified-programme-model.sql
 */

// =====================================================
// TYPES DE BASE
// =====================================================

export type DurationType = 'court' | 'moyen' | 'long'
export type PacingType = 'libre' | 'guide' | 'live'
export type AccessMode = 'classe_privee' | 'acces_individuel' | 'mixte'

// =====================================================
// CONFIGURATION SETTINGS
// =====================================================

export interface ProgrammeFeatures {
  /** Permettre aperçu gratuit de certaines leçons */
  allow_previews: boolean
  /** Certificat de complétion disponible */
  certificate_enabled: boolean
  /** Accès à la communauté/forum */
  community_enabled: boolean
  /** Devoirs et évaluations activés */
  assignments_enabled: boolean
  /** Sessions live intégrées */
  live_sessions_enabled: boolean
}

export interface ProgrammeRestrictions {
  /** Leçons doivent être complétées dans l'ordre */
  requires_sequential: boolean
  /** Limite de temps pour compléter (en jours) */
  time_limit_days: number | null
  /** Nombre max de tentatives pour les évaluations */
  max_attempts: number | null
}

export interface ProgrammeSchedule {
  /** Sessions live par semaine */
  live_sessions_per_week?: number
  /** Sessions live par mois */
  live_sessions_per_month?: number
  /** Durée totale en semaines */
  duration_weeks?: number
  /** Les sessions live sont-elles obligatoires */
  live_sessions_optional?: boolean
}

export interface ProgrammeMilestones {
  /** Activer les checkpoints de progression */
  checkpoints_enabled: boolean
  /** Score minimum requis pour progresser (0-100) */
  minimum_score?: number
}

/**
 * Configuration complète d'un programme (JSONB)
 */
export interface ProgrammeSettings {
  /** Type de durée du programme */
  duration_type: DurationType
  /** Type de rythme/pacing */
  pacing_type: PacingType
  /** Mode d'accès */
  access_mode: AccessMode
  /** Features activées */
  features: ProgrammeFeatures
  /** Restrictions d'accès */
  restrictions: ProgrammeRestrictions
  /** Planning (optionnel, surtout pour live) */
  schedule?: ProgrammeSchedule
  /** Jalons de progression (optionnel) */
  milestones?: ProgrammeMilestones
}

// =====================================================
// ENTITÉ PROGRAMME
// =====================================================

export interface Programme {
  id: string
  teacher_id: string
  title: string
  description: string | null
  thumbnail: string | null
  price: number
  currency: string

  /** Configuration JSONB du programme */
  settings: ProgrammeSettings

  /** Public cible */
  target_audience: string | null

  /** Statistiques */
  enrolled_count: number
  completion_rate: number
  avg_rating: number

  /** Metadata temporelle */
  created_at: string
  updated_at: string

  /** Relations (chargées séparément) */
  teacher?: any // User type
  chapters?: Chapter[]
  enrollments?: Enrollment[]
}

// =====================================================
// TYPES POUR CRÉATION/ÉDITION
// =====================================================

/**
 * Données pour créer un nouveau programme
 */
export interface CreateProgrammeInput {
  title: string
  description?: string
  thumbnail?: string
  price: number
  currency?: string

  // Configuration
  settings: ProgrammeSettings
  target_audience?: string
}

/**
 * Données pour mettre à jour un programme
 */
export interface UpdateProgrammeInput {
  title?: string
  description?: string
  thumbnail?: string
  price?: number

  settings?: Partial<ProgrammeSettings>
  target_audience?: string
}

// =====================================================
// PRESETS DE CONFIGURATION
// =====================================================

/**
 * Configuration par défaut pour un cours court libre
 */
export const PRESET_COURS_COURT: ProgrammeSettings = {
  duration_type: 'court',
  pacing_type: 'libre',
  access_mode: 'acces_individuel',
  features: {
    allow_previews: true,
    certificate_enabled: false,
    community_enabled: false,
    assignments_enabled: false,
    live_sessions_enabled: false,
  },
  restrictions: {
    requires_sequential: false,
    time_limit_days: null,
    max_attempts: null,
  },
}

/**
 * Configuration par défaut pour une formation intensive
 */
export const PRESET_FORMATION_INTENSIVE: ProgrammeSettings = {
  duration_type: 'court',
  pacing_type: 'live',
  access_mode: 'classe_privee',
  features: {
    allow_previews: false,
    certificate_enabled: true,
    community_enabled: true,
    assignments_enabled: true,
    live_sessions_enabled: true,
  },
  restrictions: {
    requires_sequential: true,
    time_limit_days: 30,
    max_attempts: null,
  },
  schedule: {
    live_sessions_per_week: 3,
    duration_weeks: 4,
    live_sessions_optional: false,
  },
}

/**
 * Configuration par défaut pour un cursus long
 */
export const PRESET_CURSUS_LONG: ProgrammeSettings = {
  duration_type: 'long',
  pacing_type: 'guide',
  access_mode: 'acces_individuel',
  features: {
    allow_previews: true,
    certificate_enabled: true,
    community_enabled: true,
    assignments_enabled: true,
    live_sessions_enabled: false,
  },
  restrictions: {
    requires_sequential: true,
    time_limit_days: 365,
    max_attempts: 3,
  },
  milestones: {
    checkpoints_enabled: true,
    minimum_score: 70,
  },
}

/**
 * Configuration par défaut pour formation hybride
 */
export const PRESET_FORMATION_HYBRIDE: ProgrammeSettings = {
  duration_type: 'moyen',
  pacing_type: 'guide',
  access_mode: 'mixte',
  features: {
    allow_previews: true,
    certificate_enabled: true,
    community_enabled: true,
    assignments_enabled: true,
    live_sessions_enabled: true,
  },
  restrictions: {
    requires_sequential: true,
    time_limit_days: 180,
    max_attempts: null,
  },
  schedule: {
    live_sessions_per_month: 2,
    live_sessions_optional: false,
  },
}

// =====================================================
// HELPERS ET TYPES DÉRIVÉS
// =====================================================

/**
 * Type pour les filtres de recherche
 */
export interface ProgrammeSearchFilters {
  duration_type?: DurationType
  pacing_type?: PacingType
  access_mode?: AccessMode
  min_rating?: number
  teacher_id?: string
  search_text?: string
  limit?: number
  offset?: number
}

/**
 * Résultat de recherche avec pagination
 */
export interface ProgrammeSearchResult {
  programmes: Programme[]
  total: number
  limit: number
  offset: number
}

/**
 * Stats d'un professeur
 */
export interface TeacherProgrammeStats {
  teacher_id: string
  total_programmes: number
  total_students: number
  avg_rating: number
  avg_completion_rate: number
}

// =====================================================
// TYPES POUR CHAPITRES ET LEÇONS
// =====================================================

/**
 * Chapitre/Module d'un programme
 * Note: On garde la structure existante "chapters" pour compatibilité
 */
export interface Chapter {
  id: string
  course_id: string // FK vers programmes (table courses)
  title: string
  description: string | null
  order_index: number
  is_published: boolean
  created_at: string
  updated_at: string

  // Relations
  lessons?: Lesson[]
}

/**
 * Leçon d'un chapitre
 */
export interface Lesson {
  id: string
  chapter_id: string
  title: string
  content: string | null
  video_url: string | null
  duration_minutes: number | null
  order_index: number
  is_free_preview: boolean
  is_published: boolean
  created_at: string
  updated_at: string

  // Optionnel: Support slides
  presentation_id?: string | null

  // Relations
  blocks?: LessonBlock[]
  presentation?: Presentation | null
}

/**
 * Bloc de contenu d'une leçon
 */
export interface LessonBlock {
  id: string
  lesson_id: string
  block_type: 'text' | 'video' | 'image' | 'code' | 'quiz' | 'assignment'
  order_index: number
  content: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Présentation (slides) associée à une leçon
 */
export interface Presentation {
  id: string
  teacher_id: string
  title: string
  description: string | null
  thumbnail: string | null
  total_slides: number
  is_public: boolean
  created_at: string
  updated_at: string

  // Relations
  slides?: Slide[]
}

/**
 * Slide individuelle
 */
export interface Slide {
  id: string
  presentation_id: string
  order_index: number
  section_title: string | null
  title: string | null
  subtitle: string | null
  layout: string
  background_color: string | null
  background_image: string | null
  background_opacity: number
  speaker_notes: string | null
  duration_seconds: number | null
  auto_advance: boolean
  is_interactive: boolean
  requires_completion: boolean
  created_at: string
  updated_at: string

  // Relations
  blocks?: SlideBlock[]
}

/**
 * Bloc de contenu d'une slide
 */
export interface SlideBlock {
  id: string
  slide_id: string
  block_type: string
  order_index: number
  column_index: number
  content: Record<string, any>
  style: Record<string, any>
  animation: string | null
  animation_delay: number
  is_interactive: boolean
  interaction_type: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// TYPES POUR ENROLLMENTS
// =====================================================

export interface Enrollment {
  id: string
  classroom_id: string // FK vers programmes (table courses)
  student_id: string
  status: 'active' | 'completed' | 'cancelled'
  progress: number
  enrolled_at: string
  completed_at: string | null

  // Relations
  programme?: Programme
  student?: any // User type
}

// =====================================================
// TYPES POUR WIZARD
// =====================================================

/**
 * Étape du wizard de création
 */
export type WizardStep = 'info' | 'configuration' | 'content' | 'pricing' | 'review'

/**
 * État du wizard
 */
export interface ProgrammeWizardState {
  currentStep: WizardStep

  // Step 1: Info de base
  title: string
  description: string
  target_audience: string
  thumbnail: string | null

  // Step 2: Configuration (LE PLUS IMPORTANT)
  settings: ProgrammeSettings

  // Step 3: Contenu (chapitres/leçons)
  chapters: Array<{
    title: string
    description: string
    lessons: Array<{
      title: string
      content: string
      duration_minutes: number
      is_free_preview: boolean
    }>
  }>

  // Step 4: Prix
  price: number
  currency: string

  // Step 5: Review (lecture seule)
}

/**
 * Props pour le composant Step2Configuration
 */
export interface Step2ConfigurationProps {
  settings: ProgrammeSettings
  onChange: (settings: ProgrammeSettings) => void
  onNext: () => void
  onBack: () => void
}

// =====================================================
// LABELS UI (Pour affichage sans jargon technique)
// =====================================================

/**
 * Labels pour duration_type
 */
export const DURATION_TYPE_LABELS: Record<DurationType, { label: string; description: string; duration: string }> = {
  court: {
    label: 'Formation courte',
    description: 'Format condensé, idéal pour acquérir rapidement une compétence ciblée',
    duration: '1-3 heures',
  },
  moyen: {
    label: 'Formation complète',
    description: 'Format équilibré pour approfondir un sujet avec exercices pratiques',
    duration: '5-15 heures',
  },
  long: {
    label: 'Parcours de formation',
    description: 'Programme complet pour devenir expert sur un sujet',
    duration: '20+ heures',
  },
}

/**
 * Labels pour pacing_type
 */
export const PACING_TYPE_LABELS: Record<PacingType, { label: string; description: string; icon: string }> = {
  libre: {
    label: 'À votre rythme',
    description: 'Les étudiants progressent librement, quand ils le souhaitent',
    icon: '🕐',
  },
  guide: {
    label: 'Progression guidée',
    description: 'Les leçons se débloquent progressivement, étape par étape',
    icon: '🎯',
  },
  live: {
    label: 'Sessions en direct',
    description: 'Cours en temps réel avec dates et horaires fixes',
    icon: '📹',
  },
}

/**
 * Labels pour access_mode
 */
export const ACCESS_MODE_LABELS: Record<AccessMode, { label: string; description: string; icon: string }> = {
  acces_individuel: {
    label: 'Accès individuel',
    description: 'Chaque étudiant accède au contenu de façon autonome',
    icon: '👤',
  },
  classe_privee: {
    label: 'Classe privée',
    description: 'Groupe fermé d\'étudiants qui progressent ensemble',
    icon: '👥',
  },
  mixte: {
    label: 'Hybride',
    description: 'Combine accès individuel et moments collectifs',
    icon: '🔀',
  },
}

// =====================================================
// HELPERS DE VALIDATION
// =====================================================

/**
 * Valider la cohérence des settings
 */
export function validateProgrammeSettings(settings: ProgrammeSettings): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Si pacing_type = 'live', access_mode ne peut pas être 'acces_individuel'
  if (settings.pacing_type === 'live' && settings.access_mode === 'acces_individuel') {
    errors.push('Les sessions en direct nécessitent un mode "Classe privée" ou "Hybride"')
  }

  // Si pacing_type = 'live', live_sessions_enabled doit être true
  if (settings.pacing_type === 'live' && !settings.features.live_sessions_enabled) {
    errors.push('Les sessions en direct doivent activer la feature "live_sessions_enabled"')
  }

  // Si access_mode = 'classe_privee', ne peut pas être totalement libre
  if (settings.access_mode === 'classe_privee' && settings.pacing_type === 'libre') {
    errors.push('Une classe privée nécessite un rythme "guidé" ou "en direct"')
  }

  // Si requires_sequential = true et pacing_type = 'libre', warning
  if (settings.restrictions.requires_sequential && settings.pacing_type === 'libre') {
    // Ce n'est pas une erreur, mais pourrait être contre-intuitif
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Helper pour obtenir un preset selon le use case
 */
export function getPresetForUseCase(useCase: 'masterclass' | 'bootcamp' | 'cursus' | 'formation-pro'): ProgrammeSettings {
  switch (useCase) {
    case 'masterclass':
      return PRESET_COURS_COURT
    case 'bootcamp':
      return PRESET_FORMATION_INTENSIVE
    case 'cursus':
      return PRESET_CURSUS_LONG
    case 'formation-pro':
      return PRESET_FORMATION_HYBRIDE
    default:
      return PRESET_COURS_COURT
  }
}

// =====================================================
// EXPORT ALL
// =====================================================

export type {
  // Settings
  ProgrammeFeatures,
  ProgrammeRestrictions,
  ProgrammeSchedule,
  ProgrammeMilestones,
  ProgrammeSettings,

  // Core
  Programme,
  CreateProgrammeInput,
  UpdateProgrammeInput,

  // Search
  ProgrammeSearchFilters,
  ProgrammeSearchResult,
  TeacherProgrammeStats,

  // Structure
  Chapter,
  Lesson,
  LessonBlock,
  Presentation,
  Slide,
  SlideBlock,
  Enrollment,

  // Wizard
  WizardStep,
  ProgrammeWizardState,
  Step2ConfigurationProps,
}
