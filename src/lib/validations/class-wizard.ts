import { z } from 'zod'

// Step 1: Class Info
const classInfoSchema = z.object({
  class_name: z.string()
    .min(5, 'Le nom doit contenir au moins 5 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  subject: z.string().min(1, 'Veuillez sélectionner une matière'),
  level: z.string().min(1, 'Veuillez sélectionner un niveau'),
  class_type: z.enum(['cursus', 'intensive']).default('cursus'),
  is_public: z.boolean().default(false),
})

// Step 2: Objectives
const objectivesSchema = z.object({
  learning_objectives: z.array(
    z.string().min(10, 'Minimum 10 caractères par objectif')
  ).min(3, 'Minimum 3 objectifs requis').max(5, 'Maximum 5 objectifs'),
  prerequisites: z.array(z.string()).optional().default([]),
})

// Step 3: First Course - FIXED: duration fields are truly optional
const firstCourseSchema = z.object({
  first_course: z.object({
    title: z.string()
      .min(5, 'Le titre doit contenir au moins 5 caractères')
      .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
    description: z.string().optional().default(''),
    is_free: z.boolean().default(true),
    price: z.number().min(0).optional().nullable(),
    // FIXED: These are now truly optional - no validation errors for empty
    duration_minutes: z.union([
      z.number().min(1).max(480),
      z.string().transform(val => val === '' ? undefined : Number(val)).pipe(z.number().min(1).max(480).optional()),
      z.undefined(),
      z.null()
    ]).optional().nullable(),
    duration_hours: z.union([
      z.number().min(1).max(500),
      z.string().transform(val => val === '' ? undefined : Number(val)).pipe(z.number().min(1).max(500).optional()),
      z.undefined(),
      z.null()
    ]).optional().nullable(),
    duration_weeks: z.union([
      z.number().min(1).max(52),
      z.string().transform(val => val === '' ? undefined : Number(val)).pipe(z.number().min(1).max(52).optional()),
      z.undefined(),
      z.null()
    ]).optional().nullable(),
  })
})

// Step 4: Initial Content
const initialContentSchema = z.object({
  initial_content: z.object({
    type: z.enum(['text', 'video']).default('text'),
    content: z.string().min(1, 'Le contenu est requis'),
    video_url: z.string().url().optional(),
  })
})

// Combined schema
export const classWizardSchema = z.object({
  // Step 1
  class_name: z.string()
    .min(5, 'Le nom doit contenir au moins 5 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  subject: z.string().min(1, 'Veuillez sélectionner une matière'),
  level: z.string().min(1, 'Veuillez sélectionner un niveau'),
  class_type: z.enum(['cursus', 'intensive']).default('cursus'),
  is_public: z.boolean().default(false),
  
  // Step 2
  learning_objectives: z.array(
    z.string()
  ).min(1, 'Minimum 1 objectif requis').max(5, 'Maximum 5 objectifs'),
  prerequisites: z.array(z.string()).optional().default([]),
  
  // Step 3
  first_course: z.object({
    title: z.string()
      .min(5, 'Le titre doit contenir au moins 5 caractères')
      .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
    description: z.string().optional().default(''),
    is_free: z.boolean().default(true),
    price: z.preprocess(
      (val) => val === '' || val === undefined || val === null ? undefined : Number(val),
      z.number().min(0).optional()
    ),
    duration_minutes: z.preprocess(
      (val) => val === '' || val === undefined || val === null ? undefined : Number(val),
      z.number().min(1).max(480).optional()
    ),
    duration_hours: z.preprocess(
      (val) => val === '' || val === undefined || val === null ? undefined : Number(val),
      z.number().min(1).max(500).optional()
    ),
    duration_weeks: z.preprocess(
      (val) => val === '' || val === undefined || val === null ? undefined : Number(val),
      z.number().min(1).max(52).optional()
    ),
  }),
  
  // Step 4
  initial_content: z.object({
    type: z.enum(['text', 'video']).default('text'),
    content: z.string().optional().default(''),
    video_url: z.string().optional(),
  })
})

export type ClassWizardData = z.infer<typeof classWizardSchema>

// Partial schemas for step validation
export const step1Schema = classInfoSchema
export const step2Schema = objectivesSchema
export const step3Schema = firstCourseSchema
export const step4Schema = initialContentSchema