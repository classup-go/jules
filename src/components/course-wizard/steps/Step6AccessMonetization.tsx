'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { validateCourseBusinessRules } from '@/lib/business-rules/course-validation'

interface Step6AccessMonetizationProps {
  form: UseFormReturn<CourseWizardData>
}

export function Step6AccessMonetization({ form }: Step6AccessMonetizationProps) {
  const { register, watch, setValue, formState: { errors } } = form

  const accessType = watch('access_type')
  const price = watch('price') || 0
  const chapters = watch('chapters') || []

  // Validate business rules
  const validation = validateCourseBusinessRules(form.getValues())
  const freeLessons = chapters.flatMap((ch) => ch.lessons).filter((l) => l.is_free)
  const freeLessonsWithContent = freeLessons.filter((l) => l.content)

  const hasPremiumContent = accessType === 'premium' || accessType === 'freemium'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Accès et Monétisation
        </h2>
        <p className="text-gray-600">
          Définissez le type d'accès et le prix de votre cours
        </p>
      </div>

      {/* Access Type Cards */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-4">
          Type d'accès <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free */}
          <button
            type="button"
            onClick={() => {
              setValue('access_type', 'free')
              setValue('price', 0)
            }}
            className={`p-6 border-2 rounded-xl text-left transition-all ${
              accessType === 'free'
                ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                🆓
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Gratuit</h3>
                <p className="text-sm text-gray-600">0 €</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Tout le contenu est accessible gratuitement. Idéal pour développer votre audience et
              construire votre réputation.
            </p>
            {accessType === 'free' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Sélectionné
              </div>
            )}
          </button>

          {/* Premium */}
          <button
            type="button"
            onClick={() => setValue('access_type', 'premium')}
            className={`p-6 border-2 rounded-xl text-left transition-all ${
              accessType === 'premium'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                💎
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Premium</h3>
                <p className="text-sm text-gray-600">Payant</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Tout le contenu est payant. Nécessite au moins 1 leçon gratuite comme aperçu pour les
              étudiants.
            </p>
            {accessType === 'premium' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Sélectionné
              </div>
            )}
          </button>

          {/* Freemium */}
          <button
            type="button"
            onClick={() => setValue('access_type', 'freemium')}
            className={`p-6 border-2 rounded-xl text-left transition-all ${
              accessType === 'freemium'
                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Freemium</h3>
                <p className="text-sm text-gray-600">Mixte</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Certaines leçons gratuites, d'autres payantes. Meilleur des deux mondes pour convertir
              les étudiants.
            </p>
            {accessType === 'freemium' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-purple-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Sélectionné
              </div>
            )}
          </button>
        </div>

        {errors.access_type && (
          <p className="text-sm text-red-500 mt-2">{errors.access_type.message}</p>
        )}
      </div>

      {/* Price Input (conditional) */}
      {hasPremiumContent && (
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-900 mb-2">
            Prix du cours (EUR) <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <div className="relative">
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  id="price"
                  min="0"
                  step="0.01"
                  placeholder="29.99"
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  €
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {[9.99, 19.99, 29.99, 49.99, 99.99].map((suggestedPrice) => (
                <button
                  key={suggestedPrice}
                  type="button"
                  onClick={() => setValue('price', suggestedPrice)}
                  className="px-3 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                >
                  {suggestedPrice}€
                </button>
              ))}
            </div>
          </div>
          {errors.price && (
            <p className="text-sm text-red-500 mt-2">{errors.price.message}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Prix de base en euros. Sera converti automatiquement selon la géolocalisation de
            l'étudiant (TND, XOF, CAD, USD).
          </p>
        </div>
      )}

      {/* Business Rules Validation */}
      {hasPremiumContent && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Règles métier</h3>

          <div className="space-y-3">
            {/* Rule: At least 1 free lesson with content */}
            <div
              className={`p-4 rounded-lg border-2 ${
                freeLessonsWithContent.length > 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {freeLessonsWithContent.length > 0 ? (
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <div className="flex-1">
                  <h4
                    className={`text-sm font-medium ${
                      freeLessonsWithContent.length > 0 ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    Au moins 1 leçon gratuite avec contenu
                  </h4>
                  <p
                    className={`text-sm mt-1 ${
                      freeLessonsWithContent.length > 0 ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {freeLessonsWithContent.length > 0
                      ? `✓ ${freeLessonsWithContent.length} leçon(s) gratuite(s) avec contenu`
                      : "✗ Aucune leçon gratuite avec contenu. Marquez au moins 1 leçon comme gratuite et ajoutez-lui du contenu à l'étape 3-4."}
                  </p>
                </div>
              </div>
            </div>

            {/* Display all validation warnings */}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-orange-900">Avertissement</h4>
                    <p className="text-sm text-orange-800 mt-1">{warning.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              Conseils de monétisation
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>Gratuit:</strong> Parfait pour construire votre audience et obtenir des avis
              </li>
              <li>
                • <strong>Premium:</strong> Meilleur pour du contenu très spécialisé ou avancé
              </li>
              <li>
                • <strong>Freemium:</strong> Taux de conversion optimal, laissez les étudiants goûter
                votre contenu
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary */}
      {accessType && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Résumé</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Type d'accès:</span>
              <span className="font-medium text-gray-900 capitalize">{accessType}</span>
            </div>
            {hasPremiumContent && (
              <div className="flex justify-between">
                <span className="text-gray-700">Prix:</span>
                <span className="font-medium text-gray-900">{price.toFixed(2)} EUR</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-700">Leçons gratuites:</span>
              <span className="font-medium text-gray-900">
                {freeLessons.length} ({freeLessonsWithContent.length} avec contenu)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
