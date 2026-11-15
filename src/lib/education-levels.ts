// Système éducatif français avec spécialités
export interface EducationLevel {
  value: string
  label: string
  category: 'college' | 'lycee' | 'terminal' | 'bac' | 'superieur'
  requiresSpecialty?: boolean
  icon: string
}

export interface Specialty {
  value: string
  label: string
  category: 'general' | 'technologique' | 'professionnel'
}

export const EDUCATION_LEVELS: EducationLevel[] = [
  // Collège
  { value: 'sixieme', label: '6ème', category: 'college', icon: '📚' },
  { value: 'cinquieme', label: '5ème', category: 'college', icon: '📚' },
  { value: 'quatrieme', label: '4ème', category: 'college', icon: '📚' },
  { value: 'troisieme', label: '3ème', category: 'college', icon: '📚' },

  // Lycée
  { value: 'seconde', label: 'Seconde', category: 'lycee', icon: '🎓' },
  { value: 'premiere', label: 'Première', category: 'lycee', requiresSpecialty: true, icon: '🎓' },
  { value: 'terminale', label: 'Terminale', category: 'terminal', requiresSpecialty: true, icon: '🎓' },

  // Post-bac
  { value: 'bac_obtenu', label: 'Bac obtenu', category: 'bac', icon: '🏆' },
  { value: 'bac_plus_1', label: 'Bac +1 (L1, BTS, DUT)', category: 'superieur', icon: '🎯' },
  { value: 'bac_plus_2', label: 'Bac +2 (L2, BTS, DUT)', category: 'superieur', icon: '🎯' },
  { value: 'bac_plus_3', label: 'Bac +3 (Licence)', category: 'superieur', icon: '🎯' },
  { value: 'bac_plus_4', label: 'Bac +4 (Master 1)', category: 'superieur', icon: '🎯' },
  { value: 'bac_plus_5', label: 'Bac +5 (Master 2)', category: 'superieur', icon: '🎯' },
  { value: 'superieur', label: 'Bac +5 et plus (Doctorat, Ingénieur)', category: 'superieur', icon: '👨‍🎓' },
]

export const SPECIALTIES: Specialty[] = [
  // Voie générale
  { value: 'general', label: 'Voie Générale', category: 'general' },
  { value: 'math_physique', label: 'Maths + Physique-Chimie', category: 'general' },
  { value: 'math_svt', label: 'Maths + SVT', category: 'general' },
  { value: 'math_nsi', label: 'Maths + NSI (Numérique)', category: 'general' },
  { value: 'math_ses', label: 'Maths + SES (Économie)', category: 'general' },
  { value: 'physique_svt', label: 'Physique-Chimie + SVT', category: 'general' },
  { value: 'ses_hggsp', label: 'SES + Histoire-Géo', category: 'general' },
  { value: 'humanites_ses', label: 'Humanités + SES', category: 'general' },
  { value: 'autre_general', label: 'Autre combinaison (Générale)', category: 'general' },

  // Voie technologique
  { value: 'stmg', label: 'STMG (Management et Gestion)', category: 'technologique' },
  { value: 'st2s', label: 'ST2S (Santé et Social)', category: 'technologique' },
  { value: 'sti2d', label: 'STI2D (Industrie et Développement Durable)', category: 'technologique' },
  { value: 'std2a', label: 'STD2A (Design et Arts Appliqués)', category: 'technologique' },
  { value: 'stl', label: 'STL (Laboratoire)', category: 'technologique' },
  { value: 'stav', label: 'STAV (Agronomie et Vivant)', category: 'technologique' },
  { value: 'sthr', label: 'STHR (Hôtellerie et Restauration)', category: 'technologique' },
  { value: 's2tmd', label: 'S2TMD (Techniques de la Musique et de la Danse)', category: 'technologique' },

  // Voie professionnelle
  { value: 'pro_commerce', label: 'Bac Pro Commerce / Vente', category: 'professionnel' },
  { value: 'pro_gestion', label: 'Bac Pro Gestion-Administration', category: 'professionnel' },
  { value: 'pro_accueil', label: 'Bac Pro Accueil', category: 'professionnel' },
  { value: 'pro_electrotechnique', label: 'Bac Pro Électrotechnique', category: 'professionnel' },
  { value: 'pro_maintenance', label: 'Bac Pro Maintenance', category: 'professionnel' },
  { value: 'pro_batiment', label: 'Bac Pro Bâtiment', category: 'professionnel' },
  { value: 'pro_autre', label: 'Autre Bac Pro', category: 'professionnel' },
]

export const SPECIALTY_CATEGORIES = [
  { value: 'general', label: 'Voie Générale', emoji: '📖' },
  { value: 'technologique', label: 'Voie Technologique', emoji: '⚙️' },
  { value: 'professionnel', label: 'Voie Professionnelle', emoji: '🔧' },
]

export function getSpecialtiesByCategory(category: string): Specialty[] {
  return SPECIALTIES.filter(s => s.category === category)
}

export function requiresSpecialty(educationLevel: string): boolean {
  const level = EDUCATION_LEVELS.find(l => l.value === educationLevel)
  return level?.requiresSpecialty || false
}
