'use client'

interface Step {
  number: number
  label: string
  icon: string
  shortLabel: string
}

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  steps: Step[]
}

export function WizardProgress({ currentStep, totalSteps, steps }: WizardProgressProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Étape {currentStep} sur {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep / totalSteps) * 100)}% complété
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-all ${
                    step.number === currentStep
                      ? 'bg-blue-600 text-white scale-110 shadow-lg'
                      : step.number < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step.number < currentStep ? '✓' : step.icon}
                </div>

                {/* Step Label */}
                <div className="text-center">
                  <div className={`text-xs font-medium hidden sm:block ${
                    step.number === currentStep
                      ? 'text-blue-600'
                      : step.number < currentStep
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                  <div className={`text-xs font-medium sm:hidden ${
                    step.number === currentStep
                      ? 'text-blue-600'
                      : step.number < currentStep
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {step.shortLabel}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2">
                  <div className={`h-full rounded-full transition-all ${
                    step.number < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
