'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { useEffect } from 'react'

interface Step5EvaluationProps {
  form: UseFormReturn<CourseWizardData>
}

export function Step5Evaluation({ form }: Step5EvaluationProps) {
  const { register, watch, setValue, formState: { errors } } = form

  const chapters = watch('chapters') || []
  const completionCriteria = watch('completion_criteria') || {}
  const requireAllQuizzes = watch('completion_criteria.require_all_quizzes') || false

  // Calculate totals
  const totalLessons = chapters.flatMap((ch) => ch.lessons).length
  const totalQuizzes = chapters
    .flatMap((ch) => ch.lessons)
    .filter((l) => l.type === 'quiz').length

  // Set smart default for min_lessons_completed (80% of total)
  useEffect(() => {
    if (totalLessons > 0 && !completionCriteria.min_lessons_completed) {
      const defaultMin = Math.ceil(totalLessons * 0.8)
      setValue('completion_criteria.min_lessons_completed', defaultMin)
    }
  }, [totalLessons, completionCriteria.min_lessons_completed, setValue])

  // Set smart default for min_quiz_score
  useEffect(() => {
    if (requireAllQuizzes && !completionCriteria.min_quiz_score) {
      setValue('completion_criteria.min_quiz_score', 70)
    }
  }, [requireAllQuizzes, completionCriteria.min_quiz_score, setValue])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Critères d'évaluation et de complétion
        </h2>
        <p className="text-gray-600">
          Définissez comment les étudiants peuvent compléter ce cours
        </p>
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-900">{totalLessons}</div>
          <div className="text-sm text-blue-700">Leçons totales</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-900">{totalQuizzes}</div>
          <div className="text-sm text-purple-700">Quiz disponibles</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-900">{chapters.length}</div>
          <div className="text-sm text-green-700">Chapitres</div>
        </div>
      </div>

      {totalLessons === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            Vous devez créer des leçons avant de définir les critères de complétion.
            Retournez à l'étape 3 pour créer la structure du cours.
          </p>
        </div>
      )}

      {/* Minimum Lessons Completed */}
      <div>
        <label htmlFor="min_lessons" className="block text-sm font-medium text-gray-900 mb-2">
          Nombre minimum de leçons à compléter <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <input
              {...register('completion_criteria.min_lessons_completed', {
                valueAsNumber: true,
              })}
              type="number"
              id="min_lessons"
              min="1"
              max={totalLessons}
              disabled={totalLessons === 0}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValue('completion_criteria.min_lessons_completed', Math.ceil(totalLessons * 0.5))}
              disabled={totalLessons === 0}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setValue('completion_criteria.min_lessons_completed', Math.ceil(totalLessons * 0.8))}
              disabled={totalLessons === 0}
              className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              80%
            </button>
            <button
              type="button"
              onClick={() => setValue('completion_criteria.min_lessons_completed', totalLessons)}
              disabled={totalLessons === 0}
              className="px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              100%
            </button>
          </div>
        </div>
        <div className="flex justify-between mt-2">
          {errors.completion_criteria?.min_lessons_completed ? (
            <p className="text-sm text-red-500">
              {errors.completion_criteria.min_lessons_completed.message}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Sur {totalLessons} leçons totales
            </p>
          )}
          <p className="text-sm text-blue-600 font-medium">
            {completionCriteria.min_lessons_completed && totalLessons > 0
              ? `${Math.round((completionCriteria.min_lessons_completed / totalLessons) * 100)}%`
              : '0%'}
          </p>
        </div>
      </div>

      {/* Require All Quizzes */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <input
            {...register('completion_criteria.require_all_quizzes')}
            type="checkbox"
            id="require_quizzes"
            disabled={totalQuizzes === 0}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex-1">
            <label htmlFor="require_quizzes" className="block font-medium text-gray-900 cursor-pointer">
              Exiger la complétion de tous les quiz
            </label>
            <p className="text-sm text-gray-600 mt-1">
              Les étudiants devront compléter tous les {totalQuizzes} quiz du cours
            </p>
            {totalQuizzes === 0 && (
              <p className="text-sm text-orange-600 mt-2">
                Aucun quiz disponible dans le cours
              </p>
            )}
          </div>
        </div>

        {/* Minimum Quiz Score (conditional) */}
        {requireAllQuizzes && totalQuizzes > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label htmlFor="min_score" className="block text-sm font-medium text-gray-900 mb-2">
              Score minimum requis pour les quiz (%)
            </label>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <input
                  {...register('completion_criteria.min_quiz_score', {
                    valueAsNumber: true,
                  })}
                  type="number"
                  id="min_score"
                  min="0"
                  max="100"
                  step="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                {[50, 60, 70, 80, 90].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setValue('completion_criteria.min_quiz_score', score)}
                    className="px-3 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    {score}%
                  </button>
                ))}
              </div>
            </div>
            {errors.completion_criteria?.min_quiz_score && (
              <p className="text-sm text-red-500 mt-2">
                {errors.completion_criteria.min_quiz_score.message}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Les étudiants devront obtenir au moins ce score moyen sur tous les quiz
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              À propos de la complétion
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Les étudiants recevront un certificat de complétion s'ils remplissent tous les critères</li>
              <li>• Le pourcentage de progression est calculé automatiquement</li>
              <li>• Vous pouvez ajuster ces critères après la publication</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary */}
      {totalLessons > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Résumé des critères</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-700">
                Compléter au moins{' '}
                <strong>{completionCriteria.min_lessons_completed || 0}</strong> leçons sur{' '}
                <strong>{totalLessons}</strong>
              </span>
            </div>
            {requireAllQuizzes && totalQuizzes > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">
                    Compléter tous les <strong>{totalQuizzes}</strong> quiz
                  </span>
                </div>
                {completionCriteria.min_quiz_score && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">
                      Obtenir au moins <strong>{completionCriteria.min_quiz_score}%</strong> de score moyen
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
