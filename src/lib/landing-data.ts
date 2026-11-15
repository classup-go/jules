import { SubjectCard, PricingPlan, TeacherPreview, StatItem } from '@/types/landing'

// Matières populaires
export const popularSubjects: SubjectCard[] = [
  {
    id: '1',
    name: 'Mathématiques',
    icon: '📐',
    teacherCount: 120,
    slug: 'mathematiques'
  },
  {
    id: '2',
    name: 'Physique',
    icon: '🔬',
    teacherCount: 85,
    slug: 'physique'
  },
  {
    id: '3',
    name: 'Chimie',
    icon: '⚗️',
    teacherCount: 72,
    slug: 'chimie'
  },
  {
    id: '4',
    name: 'Français',
    icon: '📖',
    teacherCount: 95,
    slug: 'francais'
  },
  {
    id: '5',
    name: 'Anglais',
    icon: '🇬🇧',
    teacherCount: 110,
    slug: 'anglais'
  },
  {
    id: '6',
    name: 'Arabe',
    icon: '🇹🇳',
    teacherCount: 88,
    slug: 'arabe'
  },
  {
    id: '7',
    name: 'Histoire-Géo',
    icon: '🌍',
    teacherCount: 65,
    slug: 'histoire-geo'
  },
  {
    id: '8',
    name: 'Philosophie',
    icon: '💭',
    teacherCount: 45,
    slug: 'philosophie'
  },
  {
    id: '9',
    name: 'Informatique',
    icon: '💻',
    teacherCount: 78,
    slug: 'informatique'
  },
  {
    id: '10',
    name: 'SVT',
    icon: '🧬',
    teacherCount: 92,
    slug: 'svt'
  }
]

// Plans tarifaires (prix en EUR - devise de base)
export const pricingPlans: PricingPlan[] = [
  {
    name: 'Gratuit',
    price: 0, // EUR
    period: 'Toujours gratuit',
    features: [
      { text: 'Accès aux cours gratuits', included: true },
      { text: 'Recherche de professeurs', included: true },
      { text: 'Profil étudiant', included: true },
      { text: 'Cours en direct', included: false },
      { text: 'Support prioritaire', included: false }
    ],
    ctaText: 'Commencer gratuitement',
    ctaLink: '/register?role=student'
  },
  {
    name: 'Premium',
    price: 9, // 9 EUR/mois (converti selon géolocalisation)
    period: '/mois',
    features: [
      { text: 'Tout du plan Gratuit', included: true },
      { text: 'Cours en direct illimités', included: true },
      { text: 'Accès à tous les cours', included: true },
      { text: 'Support prioritaire', included: true },
      { text: 'Certificats', included: true }
    ],
    recommended: true,
    badge: 'Populaire',
    ctaText: 'Commencer l\'essai gratuit',
    ctaLink: '/register?role=student&plan=premium'
  },
  {
    name: 'Pro',
    price: 15, // 15 EUR/mois (converti selon géolocalisation)
    period: '/mois',
    features: [
      { text: 'Tout du plan Premium', included: true },
      { text: 'Sessions 1-on-1', included: true },
      { text: 'Cours personnalisés', included: true },
      { text: 'Suivi avancé', included: true },
      { text: 'Accès API', included: true }
    ],
    ctaText: 'Contacter l\'équipe',
    ctaLink: '/contact'
  }
]

// Professeurs vedettes (données mock - prix en EUR)
export const featuredTeachers: TeacherPreview[] = [
  {
    id: '1',
    name: 'Ahmed Ben Salah',
    avatar: '/avatars/teacher1.jpg',
    subject: 'Mathématiques',
    level: 'Lycée',
    rating: 4.9,
    hourlyRate: 10 // 10 EUR/heure (converti selon géolocalisation)
  },
  {
    id: '2',
    name: 'Leila Trabelsi',
    avatar: '/avatars/teacher2.jpg',
    subject: 'Physique',
    level: 'Collège & Lycée',
    rating: 4.8,
    hourlyRate: 9 // 9 EUR/heure
  },
  {
    id: '3',
    name: 'Mohamed Khiari',
    avatar: '/avatars/teacher3.jpg',
    subject: 'Français',
    level: 'Tous niveaux',
    rating: 5.0,
    hourlyRate: 12 // 12 EUR/heure
  },
  {
    id: '4',
    name: 'Sonia Hamdi',
    avatar: '/avatars/teacher4.jpg',
    subject: 'Anglais',
    level: 'Collège & Lycée',
    rating: 4.7,
    hourlyRate: 10 // 10 EUR/heure
  }
]

// Statistiques
export const stats: StatItem[] = [
  {
    value: '500+',
    label: 'Professeurs qualifiés',
    icon: '👨‍🏫'
  },
  {
    value: '10,000+',
    label: 'Élèves satisfaits',
    icon: '🎓'
  },
  {
    value: '50+',
    label: 'Matières enseignées',
    icon: '📚'
  }
]

// Niveaux scolaires pour le formulaire de recherche
export const schoolLevels = [
  { value: 'primaire', label: 'Primaire' },
  { value: 'college', label: 'Collège' },
  { value: 'lycee', label: 'Lycée' },
  { value: 'superieur', label: 'Supérieur' }
]
