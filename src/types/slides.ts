// ═══════════════════════════════════════════════════════════════════════════
// Types pour le système de Slides - Jules Class Go
// ═══════════════════════════════════════════════════════════════════════════

// Types de blocs disponibles
export type SlideBlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'math'
  | 'graph'
  | 'diagram'
  | 'table'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'embed'
  | 'exercise'
  | 'solution'
  | 'definition'
  | 'theorem'
  | 'proof'
  | 'example'
  | 'note'
  | 'timeline'
  | 'flashcard'
  | 'matching'
  | 'fill_blank'
  | 'mcq'
  | 'columns'

// Layouts de slides
export type SlideLayout = 
  | 'default'
  | 'title'
  | 'two-column'
  | 'three-column'
  | 'image-left'
  | 'image-right'
  | 'full-image'
  | 'blank'

// Thèmes de présentation
export type PresentationTheme = 
  | 'default'
  | 'dark'
  | 'scientific'
  | 'modern'
  | 'minimal'
  | 'colorful'
  | 'academic'

// Transitions
export type SlideTransition = 
  | 'slide'
  | 'fade'
  | 'zoom'
  | 'flip'
  | 'none'

// Types de callout
export type CalloutType = 
  | 'info'
  | 'warning'
  | 'tip'
  | 'danger'
  | 'question'
  | 'success'
  | 'note'

// ═══════════════════════════════════════════════════════════════════════════
// Contenu des différents types de blocs
// ═══════════════════════════════════════════════════════════════════════════

export interface TextBlockContent {
  text: string
  format?: 'plain' | 'markdown' | 'html'
}

export interface HeadingBlockContent {
  text: string
  level: 1 | 2 | 3 | 4
  align?: 'left' | 'center' | 'right'
}

export interface ImageBlockContent {
  url: string
  alt: string
  caption?: string
  width?: string
  height?: string
  fit?: 'cover' | 'contain' | 'fill'
  annotations?: Array<{
    id: string
    x: number
    y: number
    text: string
    color?: string
  }>
}

export interface VideoBlockContent {
  url: string
  type: 'youtube' | 'vimeo' | 'upload' | 'embed'
  thumbnail?: string
  startTime?: number
  endTime?: number
  autoplay?: boolean
  controls?: boolean
}

export interface AudioBlockContent {
  url: string
  title?: string
  transcript?: string
}

export interface CodeBlockContent {
  code: string
  language: string
  filename?: string
  highlightLines?: number[]
  showLineNumbers?: boolean
  runnable?: boolean
}

export interface MathBlockContent {
  latex: string
  displayMode?: boolean // inline vs block
  description?: string
}

export interface GraphBlockContent {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'radar'
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      color?: string
    }>
  }
  options?: {
    title?: string
    xAxis?: string
    yAxis?: string
    legend?: boolean
  }
}

export interface DiagramBlockContent {
  type: 'mermaid' | 'svg'
  code: string
  caption?: string
}

export interface TableBlockContent {
  headers: string[]
  rows: string[][]
  caption?: string
  striped?: boolean
  bordered?: boolean
  highlightRows?: number[]
}

export interface QuoteBlockContent {
  text: string
  author?: string
  source?: string
}

export interface CalloutBlockContent {
  type: CalloutType
  title?: string
  text: string
  collapsible?: boolean
  defaultOpen?: boolean
}

export interface DividerBlockContent {
  style?: 'solid' | 'dashed' | 'dotted'
  spacing?: 'small' | 'medium' | 'large'
}

export interface EmbedBlockContent {
  url: string
  type?: 'iframe' | 'oembed'
  width?: string
  height?: string
}

export interface ExerciseBlockContent {
  question: string
  questionType: 'text' | 'math' | 'code'
  hints?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
  points?: number
  timeLimit?: number // en secondes
}

export interface SolutionBlockContent {
  steps: Array<{
    text: string
    math?: string
    explanation?: string
  }>
  finalAnswer?: string
  hidden?: boolean
}

export interface DefinitionBlockContent {
  term: string
  definition: string
  examples?: string[]
  related?: string[]
}

export interface TheoremBlockContent {
  type: 'theorem' | 'property' | 'lemma' | 'corollary' | 'axiom'
  name?: string
  statement: string
  conditions?: string[]
}

export interface ProofBlockContent {
  type: 'direct' | 'contradiction' | 'induction' | 'other'
  steps: Array<{
    text: string
    math?: string
    justification?: string
  }>
  qed?: boolean
}

export interface ExampleBlockContent {
  title?: string
  context?: string
  steps: Array<{
    text: string
    math?: string
  }>
  result?: string
}

export interface NoteBlockContent {
  type: 'note' | 'important' | 'remember'
  text: string
}

export interface TimelineBlockContent {
  events: Array<{
    date: string
    title: string
    description?: string
    image?: string
  }>
  orientation?: 'horizontal' | 'vertical'
}

export interface FlashcardBlockContent {
  front: {
    text: string
    image?: string
  }
  back: {
    text: string
    image?: string
  }
}

export interface MatchingBlockContent {
  pairs: Array<{
    left: string
    right: string
  }>
  shuffled?: boolean
}

export interface FillBlankBlockContent {
  text: string // Utiliser __BLANK__ pour marquer les trous
  blanks: Array<{
    answer: string
    alternatives?: string[]
  }>
}

export interface MCQBlockContent {
  question: string
  options: Array<{
    text: string
    isCorrect: boolean
    feedback?: string
  }>
  multiSelect?: boolean
  randomize?: boolean
}

export interface ColumnsBlockContent {
  columns: number // 2 ou 3
  gap?: string
  // Les blocs enfants gèrent leur colonne via column_index
}

// Type union pour tout contenu de bloc
export type SlideBlockContent =
  | { type: 'text'; data: TextBlockContent }
  | { type: 'heading'; data: HeadingBlockContent }
  | { type: 'image'; data: ImageBlockContent }
  | { type: 'video'; data: VideoBlockContent }
  | { type: 'audio'; data: AudioBlockContent }
  | { type: 'code'; data: CodeBlockContent }
  | { type: 'math'; data: MathBlockContent }
  | { type: 'graph'; data: GraphBlockContent }
  | { type: 'diagram'; data: DiagramBlockContent }
  | { type: 'table'; data: TableBlockContent }
  | { type: 'quote'; data: QuoteBlockContent }
  | { type: 'callout'; data: CalloutBlockContent }
  | { type: 'divider'; data: DividerBlockContent }
  | { type: 'embed'; data: EmbedBlockContent }
  | { type: 'exercise'; data: ExerciseBlockContent }
  | { type: 'solution'; data: SolutionBlockContent }
  | { type: 'definition'; data: DefinitionBlockContent }
  | { type: 'theorem'; data: TheoremBlockContent }
  | { type: 'proof'; data: ProofBlockContent }
  | { type: 'example'; data: ExampleBlockContent }
  | { type: 'note'; data: NoteBlockContent }
  | { type: 'timeline'; data: TimelineBlockContent }
  | { type: 'flashcard'; data: FlashcardBlockContent }
  | { type: 'matching'; data: MatchingBlockContent }
  | { type: 'fill_blank'; data: FillBlankBlockContent }
  | { type: 'mcq'; data: MCQBlockContent }
  | { type: 'columns'; data: ColumnsBlockContent }

// ═══════════════════════════════════════════════════════════════════════════
// Entités principales
// ═══════════════════════════════════════════════════════════════════════════

export interface SlideBlock {
  id: string
  slide_id: string
  block_type: SlideBlockType
  order_index: number
  column_index: number
  content: Record<string, any>
  style?: {
    padding?: string
    margin?: string
    backgroundColor?: string
    borderRadius?: string
    textAlign?: string
    [key: string]: any
  }
  animation?: string
  animation_delay?: number
  is_interactive?: boolean
  interaction_type?: string
  created_at?: string
  updated_at?: string
}

export interface Slide {
  id: string
  presentation_id: string
  order_index: number
  section_title?: string
  title?: string
  subtitle?: string
  speaker_notes?: string
  layout: SlideLayout
  background_color?: string
  background_image?: string
  background_opacity?: number
  duration_seconds?: number
  auto_advance?: boolean
  is_interactive?: boolean
  requires_completion?: boolean
  blocks?: SlideBlock[]
  created_at?: string
  updated_at?: string
}

export interface Presentation {
  id: string
  lesson_id?: string
  course_id?: string
  teacher_id: string
  title: string
  description?: string
  thumbnail_url?: string
  theme: PresentationTheme
  transition: SlideTransition
  aspect_ratio: '16:9' | '4:3' | '1:1'
  total_slides: number
  estimated_duration?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  is_published: boolean
  is_template: boolean
  template_category?: string
  view_count: number
  avg_completion_rate: number
  slides?: Slide[]
  created_at?: string
  updated_at?: string
}

export interface SlideTemplate {
  id: string
  name: string
  description?: string
  thumbnail_url?: string
  category: string
  subcategory?: string
  layout: SlideLayout
  blocks_template: Array<Partial<SlideBlock>>
  style_template?: Record<string, any>
  is_system: boolean
  created_by?: string
  use_count: number
  rating?: number
  tags: string[]
  created_at?: string
  updated_at?: string
}

export interface SlideProgress {
  id: string
  student_id: string
  presentation_id: string
  current_slide_index: number
  completed_slides: number[]
  total_time_seconds: number
  time_per_slide: Record<string, number>
  interactions: Array<{
    slide_id: string
    block_id: string
    type: string
    data: any
    timestamp: string
  }>
  is_completed: boolean
  completion_percentage: number
  completed_at?: string
  created_at?: string
  updated_at?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Types pour l'éditeur
// ═══════════════════════════════════════════════════════════════════════════

export interface EditorState {
  presentation: Presentation
  selectedSlideId: string | null
  selectedBlockId: string | null
  isDragging: boolean
  isPreviewMode: boolean
  zoom: number
  history: {
    past: Presentation[]
    future: Presentation[]
  }
}

export interface BlockToolbarItem {
  type: SlideBlockType
  icon: string
  label: string
  category: 'text' | 'media' | 'science' | 'interactive' | 'layout'
  shortcut?: string
}

// Liste des outils de blocs pour l'éditeur
export const BLOCK_TOOLBAR_ITEMS: BlockToolbarItem[] = [
  // Texte
  { type: 'text', icon: '📝', label: 'Texte', category: 'text' },
  { type: 'heading', icon: 'H', label: 'Titre', category: 'text' },
  { type: 'quote', icon: '❝', label: 'Citation', category: 'text' },
  { type: 'callout', icon: '💡', label: 'Encadré', category: 'text' },
  { type: 'note', icon: '📌', label: 'Note', category: 'text' },
  
  // Média
  { type: 'image', icon: '🖼️', label: 'Image', category: 'media' },
  { type: 'video', icon: '🎬', label: 'Vidéo', category: 'media' },
  { type: 'audio', icon: '🔊', label: 'Audio', category: 'media' },
  { type: 'embed', icon: '🔗', label: 'Intégration', category: 'media' },
  
  // Sciences
  { type: 'math', icon: '∑', label: 'Formule', category: 'science', shortcut: 'Ctrl+M' },
  { type: 'code', icon: '💻', label: 'Code', category: 'science' },
  { type: 'graph', icon: '📊', label: 'Graphique', category: 'science' },
  { type: 'diagram', icon: '📐', label: 'Diagramme', category: 'science' },
  { type: 'table', icon: '📋', label: 'Tableau', category: 'science' },
  { type: 'theorem', icon: '📜', label: 'Théorème', category: 'science' },
  { type: 'proof', icon: '✓', label: 'Démonstration', category: 'science' },
  { type: 'definition', icon: '📖', label: 'Définition', category: 'science' },
  { type: 'example', icon: '💡', label: 'Exemple', category: 'science' },
  { type: 'timeline', icon: '📅', label: 'Chronologie', category: 'science' },
  
  // Interactif
  { type: 'exercise', icon: '✏️', label: 'Exercice', category: 'interactive' },
  { type: 'solution', icon: '🔓', label: 'Solution', category: 'interactive' },
  { type: 'mcq', icon: '☑️', label: 'QCM', category: 'interactive' },
  { type: 'fill_blank', icon: '___', label: 'Texte à trous', category: 'interactive' },
  { type: 'matching', icon: '🔗', label: 'Association', category: 'interactive' },
  { type: 'flashcard', icon: '🃏', label: 'Flashcard', category: 'interactive' },
  
  // Layout
  { type: 'columns', icon: '▥', label: 'Colonnes', category: 'layout' },
  { type: 'divider', icon: '—', label: 'Séparateur', category: 'layout' },
]

// Catégories de templates
export const TEMPLATE_CATEGORIES = [
  { id: 'math', label: 'Mathématiques', icon: '🔢', color: '#3b82f6' },
  { id: 'science', label: 'Sciences', icon: '🔬', color: '#10b981' },
  { id: 'language', label: 'Langues', icon: '🌍', color: '#f59e0b' },
  { id: 'history', label: 'Histoire', icon: '📜', color: '#8b5cf6' },
  { id: 'geography', label: 'Géographie', icon: '🗺️', color: '#06b6d4' },
  { id: 'general', label: 'Général', icon: '📚', color: '#6b7280' },
]

// Thèmes disponibles
export const PRESENTATION_THEMES: Array<{
  id: PresentationTheme
  name: string
  preview: string
  colors: { primary: string; background: string; text: string }
}> = [
  { 
    id: 'default', 
    name: 'Classique', 
    preview: '/themes/default.png',
    colors: { primary: '#8b5cf6', background: '#ffffff', text: '#1f2937' }
  },
  { 
    id: 'dark', 
    name: 'Sombre', 
    preview: '/themes/dark.png',
    colors: { primary: '#a78bfa', background: '#1f2937', text: '#f9fafb' }
  },
  { 
    id: 'scientific', 
    name: 'Scientifique', 
    preview: '/themes/scientific.png',
    colors: { primary: '#3b82f6', background: '#f8fafc', text: '#0f172a' }
  },
  { 
    id: 'modern', 
    name: 'Moderne', 
    preview: '/themes/modern.png',
    colors: { primary: '#ec4899', background: '#fdf2f8', text: '#831843' }
  },
  { 
    id: 'minimal', 
    name: 'Minimaliste', 
    preview: '/themes/minimal.png',
    colors: { primary: '#000000', background: '#ffffff', text: '#000000' }
  },
  { 
    id: 'colorful', 
    name: 'Coloré', 
    preview: '/themes/colorful.png',
    colors: { primary: '#f97316', background: '#fffbeb', text: '#78350f' }
  },
  { 
    id: 'academic', 
    name: 'Académique', 
    preview: '/themes/academic.png',
    colors: { primary: '#059669', background: '#f0fdf4', text: '#14532d' }
  },
]