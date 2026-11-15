'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { courseWizardSchema, CourseWizardData } from '@/lib/validations/course-wizard'
import { useAutosave } from '@/hooks/useAutosave'
import { WizardProgress } from './WizardProgress'
import { AutosaveIndicator } from './AutosaveIndicator'

// Import step components (will be created)
import { Step1GeneralInfo } from './steps/Step1GeneralInfo'
import { Step2Objectives } from './steps/Step2Objectives'
import { Step3LessonBuilder } from './steps/Step3LessonBuilder'
import { Step4ContentEditor } from './steps/Step4ContentEditor'
import { Step5Evaluation } from './steps/Step5Evaluation'
import { Step6AccessMonetization } from './steps/Step6AccessMonetization'
import { Step7StudentPreview } from './steps/Step7StudentPreview'
import { Step8Publication } from './steps/Step8Publication'

interface CourseWizardProps {
  initialData?: Partial<CourseWizardData>
  courseId?: string
  onSave: (data: Partial<CourseWizardData>) => Promise<void>
  onPublish: (data: CourseWizardData) => Promise<void>
}

const WIZARD_STEPS = [
  { number: 1, label: 'Informations générales', shortLabel: 'Info' },
  { number: 2, label: 'Objectifs & Prérequis', shortLabel: 'Objectifs' },
  { number: 3, label: 'Structure du cours', shortLabel: 'Structure' },
  { number: 4, label: 'Contenu des leçons', shortLabel: 'Contenu' },
  { number: 5, label: 'Évaluation', shortLabel: 'Éval' },
  { number: 6, label: 'Accès & Prix', shortLabel: 'Accès' },
  { number: 7, label: 'Aperçu étudiant', shortLabel: 'Aperçu' },
  { number: 8, label: 'Publication', shortLabel: 'Publier' },
]

export function CourseWizard({ initialData, courseId, onSave, onPublish }: CourseWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  // Initialize form with default values
  const form = useForm<CourseWizardData>({
    resolver: zodResolver(courseWizardSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      subject: '',
      level: 'college',
      language: 'fr',
      difficulty: 'intermediaire',
      learning_objectives: ['', '', ''],
      prerequisites: [],
      chapters: [],
      completion_criteria: {
        min_lessons_completed: 1,
        require_all_quizzes: false,
      },
      access_type: 'free',
      status: 'draft',
      ...initialData,
    },
  })

  // Setup autosave
  const autosave = useAutosave(form.watch, onSave, {
    delay: 2000,
    enabled: true,
  })

  const handleNext = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: (keyof CourseWizardData)[] = []

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['title', 'subject', 'level', 'difficulty', 'language']
        break
      case 2:
        fieldsToValidate = ['learning_objectives']
        break
      case 3:
        fieldsToValidate = ['chapters']
        break
      case 5:
        fieldsToValidate = ['completion_criteria']
        break
      case 6:
        fieldsToValidate = ['access_type', 'price']
        break
    }

    const isValid = await form.trigger(fieldsToValidate as any)

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveDraft = async () => {
    const data = form.getValues()
    await onSave(data)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1GeneralInfo form={form} />
      case 2:
        return <Step2Objectives form={form} />
      case 3:
        return (
          <Step3LessonBuilder
            form={form}
            onSelectLesson={setSelectedLessonId}
          />
        )
      case 4:
        return (
          <Step4ContentEditor
            form={form}
            selectedLessonId={selectedLessonId}
            onSelectLesson={setSelectedLessonId}
          />
        )
      case 5:
        return <Step5Evaluation form={form} />
      case 6:
        return <Step6AccessMonetization form={form} />
      case 7:
        return <Step7StudentPreview form={form} />
      case 8:
        return <Step8Publication form={form} onPublish={onPublish} courseId={courseId} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <WizardProgress
        currentStep={currentStep}
        totalSteps={WIZARD_STEPS.length}
        steps={WIZARD_STEPS}
      />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Autosave Indicator */}
        <div className="flex justify-end mb-4">
          <AutosaveIndicator
            status={autosave.status}
            lastSaved={autosave.lastSaved}
            error={autosave.error}
            onRetry={autosave.forceSave}
          />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Précédent
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-6 py-3 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            💾 Enregistrer le brouillon
          </button>

          {currentStep < WIZARD_STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Suivant →
            </button>
          ) : (
            <div className="w-32" /> // Spacer for layout
          )}
        </div>
      </div>
    </div>
  )
}
