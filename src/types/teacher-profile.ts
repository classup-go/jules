// Types for teacher profiles

export type Subject =
  | 'Mathématiques'
  | 'Physique-Chimie'
  | 'SVT'
  | 'Français'
  | 'Histoire-Géographie'
  | 'Anglais'
  | 'Espagnol'
  | 'Allemand'
  | 'Philosophie'
  | 'SES'
  | 'NSI'
  | 'Informatique'
  | 'Économie'
  | 'Comptabilité'
  | 'Droit'
  | 'Marketing'
  | 'Management';

export type Level =
  | '6ème'
  | '5ème'
  | '4ème'
  | '3ème'
  | '2nde'
  | '1ère'
  | 'Terminale'
  | 'BTS'
  | 'Licence'
  | 'Master'
  | 'Prépa'
  | 'Adulte';

export type TeachingMode = 'online' | 'in_person' | 'both';

export type Experience =
  | 'Moins d\'1 an'
  | '1 à 3 ans'
  | '3 à 5 ans'
  | '5 à 10 ans'
  | 'Plus de 10 ans';

export interface TeacherProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'teacher';
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  experience: Experience | null;
  subjects: Subject[] | null;
  levels: Level[] | null;
  teaching_mode: TeachingMode[] | null;
  hourly_rate: number | null;
  can_travel: boolean;
  travel_distance: number | null;
  specialties: string[] | null;
  certifications: string[] | null;
  languages: string[] | null;
  is_available: boolean;
  rating: number | null;
  total_reviews: number;
  created_at: string;
}

export const SUBJECTS: Subject[] = [
  'Mathématiques', 'Physique-Chimie', 'SVT', 'Français',
  'Histoire-Géographie', 'Anglais', 'Espagnol', 'Allemand',
  'Philosophie', 'SES', 'NSI', 'Informatique', 'Économie',
  'Comptabilité', 'Droit', 'Marketing', 'Management',
];

export const LEVELS: Level[] = [
  '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale',
  'BTS', 'Licence', 'Master', 'Prépa', 'Adulte',
];

export const TEACHING_MODES: { value: TeachingMode; label: string; icon: string }[] = [
  { value: 'online', label: 'En ligne', icon: '💻' },
  { value: 'in_person', label: 'À domicile', icon: '🏠' },
  { value: 'both', label: 'Les deux', icon: '🔄' },
];

export const EXPERIENCES: Experience[] = [
  'Moins d\'1 an', '1 à 3 ans', '3 à 5 ans', '5 à 10 ans', 'Plus de 10 ans',
];