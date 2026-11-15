'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { canPublishCourse } from '@/lib/business-rules/course-validation'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Step8PublicationProps {
  form: UseFormReturn<CourseWizardData>
  onPublish: (data: CourseWizardData) => Promise<void>
  courseId?: string
}

export function Step8Publication({ form, onPublish, courseId }: Step8PublicationProps) {
  const router = useRouter()
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const courseData = form.getValues()
  const { canPublish, blockers } = canPublishCourse(courseData)

  const allLessons = courseData.chapters?.flatMap((ch) => ch.lessons) || []
  const freeLessons = allLessons.filter((l) => l.is_free)
  const lessonsWithContent = allLessons.filter((l) => l.content)
  const totalQuizzes = allLessons.filter((l) => l.type === 'quiz').length

  const handlePublish = async () => {
    if (!canPublish) return

    try {
      setIsPublishing(true)
      setPublishError(null)

      // Validate the form
      const isValid = await form.trigger()
      if (!isValid) {
        setPublishError('Le formulaire contient des erreurs. Veuillez les corriger.')
        return
      }

      // Call the publish callback
      await onPublish(courseData as CourseWizardData)
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Erreur lors de la publication')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSaveDraft = async () => {
    // This will be handled by the parent component's autosave
    alert('Le cours a été enregistré comme brouillon')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Publication du cours
        </h2>
        <p className="text-gray-600">
          Vérifiez que tout est en ordre avant de publier votre cours
        </p>
      </div>

      {/* Validation Checklist */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Liste de vérification
        </h3>

        <div className="space-y-3">
          {/* Title */}
          <div className="flex items-start gap-3">
            {courseData.title && courseData.title.length >= 5 ? (
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
            <div>
              <p className="text-sm font-medium text-gray-900">Titre du cours</p>
              <p className="text-sm text-gray-600">{courseData.title || 'Non défini'}</p>
            </div>
          </div>

          {/* Subject & Level */}
          <div className="flex items-start gap-3">
            {courseData.subject && courseData.level ? (
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
            <div>
              <p className="text-sm font-medium text-gray-900">Matière et niveau</p>
              <p className="text-sm text-gray-600">
                {courseData.subject || 'Non défini'} • {courseData.level || 'Non défini'}
              </p>
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="flex items-start gap-3">
            {courseData.learning_objectives && courseData.learning_objectives.length >= 3 ? (
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
            <div>
              <p className="text-sm font-medium text-gray-900">Objectifs d'apprentissage</p>
              <p className="text-sm text-gray-600">
                {courseData.learning_objectives?.length || 0} objectifs (minimum 3)
              </p>
            </div>
          </div>

          {/* Chapters & Lessons */}
          <div className="flex items-start gap-3">
            {courseData.chapters && courseData.chapters.length > 0 && allLessons.length > 0 ? (
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
            <div>
              <p className="text-sm font-medium text-gray-900">Structure du cours</p>
              <p className="text-sm text-gray-600">
                {courseData.chapters?.length || 0} chapitres • {allLessons.length} leçons •{' '}
                {lessonsWithContent.length} avec contenu
              </p>
            </div>
          </div>

          {/* Access Type */}
          <div className="flex items-start gap-3">
            {courseData.access_type ? (
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
            <div>
              <p className="text-sm font-medium text-gray-900">Type d'accès et prix</p>
              <p className="text-sm text-gray-600 capitalize">
                {courseData.access_type || 'Non défini'}
                {courseData.price && courseData.price > 0 ? ` • ${courseData.price.toFixed(2)} €` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Problèmes à résoudre avant publication
          </h3>
          <ul className="space-y-2">
            {blockers.map((blocker, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                <span className="text-red-600 flex-shrink-0 mt-0.5">•</span>
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-900">{courseData.chapters?.length || 0}</div>
          <div className="text-sm text-blue-700">Chapitres</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-900">{allLessons.length}</div>
          <div className="text-sm text-purple-700">Leçons</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-900">{freeLessons.length}</div>
          <div className="text-sm text-green-700">Leçons gratuites</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-900">{totalQuizzes}</div>
          <div className="text-sm text-orange-700">Quiz</div>
        </div>
      </div>

      {/* Error Display */}
      {publishError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{publishError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPublishing}
            className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            💾 Enregistrer comme brouillon
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || isPublishing}
            className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publication en cours...
              </>
            ) : (
              <>
                🚀 Publier le cours
              </>
            )}
          </button>
        </div>

        {/* Visual Builder Link */}
        {courseId && (
          <button
            type="button"
            onClick={() => router.push(`/teacher/courses/${courseId}/builder`)}
            className="w-full px-6 py-4 border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            🎨 Organiser visuellement (Drag & Drop)
          </button>
        )}
      </div>

      {/* Info Box */}
      {canPublish && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-green-900 mb-1">Prêt à publier !</h3>
              <p className="text-sm text-green-800">
                Votre cours respecte toutes les exigences. Une fois publié, il sera visible par tous
                les étudiants sur la plateforme.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
