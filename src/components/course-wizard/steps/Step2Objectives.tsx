'use client'

import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'

interface Step2ObjectivesProps {
  form: UseFormReturn<CourseWizardData>
}

export function Step2Objectives({ form }: Step2ObjectivesProps) {
  const { register, control, formState: { errors }, watch } = form

  const {
    fields: objectiveFields,
    append: appendObjective,
    remove: removeObjective,
  } = useFieldArray({
    control,
    name: 'learning_objectives',
  })

  const {
    fields: prerequisiteFields,
    append: appendPrerequisite,
    remove: removePrerequisite,
  } = useFieldArray({
    control,
    name: 'prerequisites',
  })

  const objectives = watch('learning_objectives') || []
  const prerequisites = watch('prerequisites') || []

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Objectifs d'apprentissage & Prérequis
        </h2>
        <p className="text-gray-600">
          Définissez ce que les étudiants apprendront et les connaissances nécessaires
        </p>
      </div>

      {/* Learning Objectives */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Objectifs d'apprentissage <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Minimum 3, maximum 5 objectifs
            </p>
          </div>
          <button
            type="button"
            onClick={() => appendObjective('')}
            disabled={objectiveFields.length >= 5}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            + Ajouter un objectif
          </button>
        </div>

        <div className="space-y-3">
          {objectiveFields.map((field, index) => (
            <div key={field.id} className="relative">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center bg-blue-100 text-blue-700 font-semibold rounded-lg">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <textarea
                    {...register(`learning_objectives.${index}` as const)}
                    rows={2}
                    placeholder="Ex: Maîtriser les fonctions exponentielles et logarithmiques"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {errors.learning_objectives?.[index] ? (
                        <span className="text-red-500">
                          {errors.learning_objectives[index]?.message}
                        </span>
                      ) : (
                        'Commencez par un verbe d\'action (maîtriser, comprendre, analyser...)'
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {objectives[index]?.length || 0} caractères
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeObjective(index)}
                  disabled={objectiveFields.length <= 3}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {errors.learning_objectives && typeof errors.learning_objectives.message === 'string' && (
          <p className="text-sm text-red-500 mt-2">{errors.learning_objectives.message}</p>
        )}
      </div>

      {/* Prerequisites */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Prérequis (optionnel)
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Maximum 5 prérequis
            </p>
          </div>
          <button
            type="button"
            onClick={() => appendPrerequisite('')}
            disabled={(prerequisiteFields.length || 0) >= 5}
            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            + Ajouter un prérequis
          </button>
        </div>

        {prerequisiteFields.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-3">Aucun prérequis défini</p>
            <button
              type="button"
              onClick={() => appendPrerequisite('')}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ajouter le premier prérequis
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {prerequisiteFields.map((field, index) => (
              <div key={field.id} className="relative">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center bg-gray-100 text-gray-700 font-semibold rounded-lg">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <input
                      {...register(`prerequisites.${index}` as const)}
                      type="text"
                      placeholder="Ex: Connaissances de base en algèbre"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.prerequisites?.[index] && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.prerequisites[index]?.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePrerequisite(index)}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-green-900 mb-1">
              Conseils pour de bons objectifs
            </h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Utilisez des verbes d'action mesurables (maîtriser, analyser, créer...)</li>
              <li>• Soyez spécifique et réaliste</li>
              <li>• Focalisez sur ce que l'étudiant saura <strong>faire</strong> à la fin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
