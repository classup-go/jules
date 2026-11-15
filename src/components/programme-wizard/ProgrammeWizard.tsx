'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  type ProgrammeWizardState,
  type WizardStep,
  PRESET_COURS_COURT,
} from '@/types/programme'
import Step1Info from './steps/Step1Info'
import Step2Configuration from './steps/Step2Configuration'
import Step3ContentBuilder from './steps/Step3ContentBuilder'
import Step4Pricing from './steps/Step4Pricing'
import Step5Publication from './steps/Step5Publication'

interface ProgrammeWizardProps {
  onSubmit: (data: ProgrammeWizardState) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<ProgrammeWizardState>
}

const STEPS: Array<{
  id: WizardStep
  label: string
  description: string
}> = [
  { id: 'info', label: 'Informations', description: 'Titre et description' },
  { id: 'configuration', label: 'Configuration', description: 'Format du programme' },
  { id: 'content', label: 'Contenu', description: 'Chapitres et leçons' },
  { id: 'pricing', label: 'Tarification', description: 'Prix et devise' },
  { id: 'review', label: 'Publication', description: 'Revue et publication' },
]

/**
 * ProgrammeWizard - Container Principal
 *
 * Wizard en 5 étapes pour créer un programme unifié.
 * Remplace les 3 anciens wizards (cours structuré, cursus long, intensif)
 */
export default function ProgrammeWizard({
  onSubmit,
  onCancel,
  initialData,
}: ProgrammeWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialData?.currentStep || 'info')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // État du wizard
  const [wizardData, setWizardData] = useState<ProgrammeWizardState>({
    currentStep: 'info',
    title: initialData?.title || '',
    description: initialData?.description || '',
    target_audience: initialData?.target_audience || '',
    thumbnail: initialData?.thumbnail || null,
    settings: initialData?.settings || PRESET_COURS_COURT,
    chapters: initialData?.chapters || [],
    price: initialData?.price || 0,
    currency: initialData?.currency || 'EUR',
  })

  const [isPublished, setIsPublished] = useState(false)

  // Navigation
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step)
    setWizardData((prev) => ({ ...prev, currentStep: step }))
  }

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex].id)
    }
  }

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex].id)
    }
  }

  // Mise à jour des données
  const updateField = (field: keyof ProgrammeWizardState, value: any) => {
    setWizardData((prev) => ({ ...prev, [field]: value }))
  }

  // Soumission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...wizardData,
        // Ajouter is_published au moment de la soumission
        ...(isPublished && { is_published: true }),
      } as any)
    } catch (error) {
      console.error('Erreur soumission:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header avec progression */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Créer un programme</h1>
            <p className="text-muted-foreground mt-1">
              {STEPS[currentStepIndex].description}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          )}
        </div>

        {/* Barre de progression */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Étape {currentStepIndex + 1} sur {STEPS.length}
            </span>
            <span className="font-medium">{Math.round(progress)}% complété</span>
          </div>
        </div>

        {/* Steps navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = index < currentStepIndex
            const isAccessible = index <= currentStepIndex

            return (
              <button
                key={step.id}
                onClick={() => isAccessible && goToStep(step.id)}
                disabled={!isAccessible}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                  ${
                    isActive
                      ? 'border-primary bg-primary/10 font-medium'
                      : isCompleted
                      ? 'border-green-600/50 bg-green-600/5 hover:bg-green-600/10'
                      : 'border-border hover:border-primary/50'
                  }
                  ${!isAccessible && 'opacity-50 cursor-not-allowed'}
                  whitespace-nowrap
                `}
              >
                <div
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs
                    ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }
                  `}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span className={isActive ? 'font-medium' : ''}>{step.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu du step actuel */}
      <Card className="p-6">
        {currentStep === 'info' && (
          <Step1Info
            title={wizardData.title}
            description={wizardData.description}
            targetAudience={wizardData.target_audience}
            thumbnail={wizardData.thumbnail}
            onChange={(field, value) => updateField(field, value)}
            onNext={nextStep}
          />
        )}

        {currentStep === 'configuration' && (
          <Step2Configuration
            settings={wizardData.settings}
            onChange={(settings) => updateField('settings', settings)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 'content' && (
          <Step3ContentBuilder
            chapters={wizardData.chapters}
            onChange={(chapters) => updateField('chapters', chapters)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 'pricing' && (
          <Step4Pricing
            price={wizardData.price}
            currency={wizardData.currency}
            onChange={(field, value) => updateField(field, value)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 'review' && (
          <Step5Publication
            title={wizardData.title}
            description={wizardData.description}
            targetAudience={wizardData.target_audience}
            thumbnail={wizardData.thumbnail}
            settings={wizardData.settings}
            chapters={wizardData.chapters}
            price={wizardData.price}
            currency={wizardData.currency}
            isPublished={isPublished}
            onPublishChange={setIsPublished}
            onBack={prevStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </Card>

      {/* Footer info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          💡 Vos modifications sont sauvegardées automatiquement. Vous pourrez modifier ce
          programme à tout moment après sa création.
        </p>
      </div>
    </div>
  )
}
