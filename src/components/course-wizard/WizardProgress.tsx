'use client'

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  steps: {
    number: number
    label: string
    shortLabel: string
  }[]
}

export function WizardProgress({ currentStep, totalSteps, steps }: WizardProgressProps) {
  return (
    <div className="w-full py-6 px-4 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-300
                    ${
                      step.number < currentStep
                        ? 'bg-green-500 text-white'
                        : step.number === currentStep
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {step.number < currentStep ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                {/* Step Label (Desktop) */}
                <div className="hidden md:block mt-2 text-center">
                  <div
                    className={`text-xs font-medium ${
                      step.number <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.shortLabel}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 relative" style={{ top: '-10px' }}>
                  <div
                    className={`h-full transition-all duration-300 ${
                      step.number < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current Step Name (Mobile) */}
        <div className="md:hidden text-center">
          <p className="text-sm font-medium text-gray-900">
            {steps[currentStep - 1]?.label}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Étape {currentStep} sur {totalSteps}
          </p>
        </div>

        {/* Current Step Name (Desktop) */}
        <div className="hidden md:block text-center mt-2">
          <p className="text-lg font-semibold text-gray-900">
            {steps[currentStep - 1]?.label}
          </p>
        </div>
      </div>
    </div>
  )
}
