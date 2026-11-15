// Interfaces TypeScript pour la landing page

export interface SearchQuery {
  subject: string
  level: string
  query: string
}

export interface PricingPlan {
  name: string
  price: number
  period: string
  features: { text: string; included: boolean }[]
  recommended?: boolean
  ctaText: string
  ctaLink: string
  badge?: string
}

export interface TeacherPreview {
  id: string
  name: string
  avatar: string
  subject: string
  level: string
  rating: number
  hourlyRate: number
}

export interface SubjectCard {
  id: string
  name: string
  icon: string
  teacherCount: number
  slug: string
}

export interface FeatureItem {
  icon: string
  title: string
  description: string
  points: string[]
  ctaText: string
  ctaLink: string
  imageSide: 'left' | 'right'
  background: string
}

export interface StatItem {
  value: string
  label: string
  icon: string
}
