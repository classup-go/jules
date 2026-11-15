'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { useState } from 'react'

interface ExerciseLessonFormProps {
  form: UseFormReturn<CourseWizardData>
  fieldPath: string
}

export function ExerciseLessonForm({ form, fieldPath }: ExerciseLessonFormProps) {
  const { setValue, watch } = form

  const content = watch(fieldPath as any)
  const [statement, setStatement] = useState(content?.statement || '')
  const [solution, setSolution] = useState(content?.solution || '')
  const [hints, setHints] = useState<string[]>(content?.hints || [])

  const addHint = () => {
    setHints([...hints, ''])
  }

  const removeHint = (index: number) => {
    setHints(hints.filter((_, i) => i !== index))
  }

  const updateHint = (index: number, value: string) => {
    const updated = [...hints]
    updated[index] = value
    setHints(updated)
  }

  const handleSave = () => {
    const exerciseContent = {
      type: 'exercise' as const,
      statement: statement,
      solution: solution,
      hints: hints.filter((h) => h.trim().length > 0),
    }
    setValue(fieldPath as any, exerciseContent, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Exercice</h4>

        {/* Statement */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Énoncé de l'exercice <span className="text-red-500">*</span>
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={6}
            placeholder="Décrivez l'exercice à résoudre...&#10;&#10;Vous pouvez utiliser plusieurs lignes pour décrire le problème, donner des données, poser des questions, etc."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
          />
          <p className="text-sm text-gray-500 mt-1">
            {statement.length} caractères (minimum 10)
          </p>
        </div>

        {/* Solution */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Solution <span className="text-red-500">*</span>
          </label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            rows={8}
            placeholder="Détaillez la solution complète de l'exercice...&#10;&#10;Incluez les étapes de résolution, les calculs intermédiaires, et la réponse finale."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
          />
          <p className="text-sm text-gray-500 mt-1">
            {solution.length} caractères (minimum 10)
          </p>
        </div>

        {/* Hints */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-900">
              Indices (optionnel)
            </label>
            <button
              type="button"
              onClick={addHint}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              + Ajouter un indice
            </button>
          </div>

          {hints.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm text-gray-500">
                Aucun indice défini
              </p>
              <button
                type="button"
                onClick={addHint}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Ajouter le premier indice
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {hints.map((hint, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center bg-yellow-100 text-yellow-700 font-semibold rounded-lg text-sm">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    placeholder={`Indice ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeHint(index)}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Les indices seront révélés progressivement aux étudiants qui en ont besoin
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={statement.length < 10 || solution.length < 10}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        💾 Enregistrer l'exercice
      </button>

      {(statement.length < 10 || solution.length < 10) && (
        <p className="text-sm text-orange-600 text-center">
          L'énoncé et la solution doivent contenir au moins 10 caractères chacun
        </p>
      )}

      {content && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ Exercice enregistré {hints.length > 0 && `avec ${hints.length} indice(s)`}
          </p>
        </div>
      )}
    </div>
  )
}
