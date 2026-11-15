'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'

interface Step7StudentPreviewProps {
  form: UseFormReturn<CourseWizardData>
}

export function Step7StudentPreview({ form }: Step7StudentPreviewProps) {
  const courseData = form.getValues()

  const allLessons = courseData.chapters?.flatMap((ch) => ch.lessons) || []
  const totalDuration = allLessons.reduce((acc, lesson) => {
    if (lesson.content && 'duration' in lesson.content) {
      return acc + (lesson.content.duration || 0)
    }
    return acc
  }, 0)

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'debutant':
        return '⭐ Débutant'
      case 'intermediaire':
        return '⭐⭐ Intermédiaire'
      case 'avance':
        return '⭐⭐⭐ Avancé'
      default:
        return difficulty
    }
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'primaire':
        return '🎒 Primaire'
      case 'college':
        return '📚 Collège'
      case 'lycee':
        return '🎓 Lycée'
      case 'superieur':
        return '🏛️ Supérieur'
      default:
        return level
    }
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '📹'
      case 'pdf':
        return '📄'
      case 'quiz':
        return '✅'
      case 'exercise':
        return '📝'
      case 'live':
        return '🔴'
      default:
        return '📚'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Aperçu étudiant
        </h2>
        <p className="text-gray-600">
          Voici comment les étudiants verront votre cours
        </p>
      </div>

      {/* Course Card Preview */}
      <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden">
        {/* Cover Image Placeholder */}
        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-6xl mb-2">📚</div>
            <p className="text-sm opacity-80">Image de couverture</p>
          </div>
        </div>

        {/* Course Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {courseData.title || 'Titre du cours'}
              </h3>
              <p className="text-gray-600 mb-3">
                {courseData.description || 'Description du cours...'}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                  {courseData.subject || 'Matière'}
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                  {getLevelLabel(courseData.level || 'college')}
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full font-medium">
                  {getDifficultyLabel(courseData.difficulty || 'intermediaire')}
                </span>
                {courseData.exam_prep && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
                    🎯 {courseData.exam_prep}
                  </span>
                )}
              </div>
            </div>
            {courseData.access_type !== 'free' && (
              <div className="ml-4 text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {courseData.price?.toFixed(2) || '0.00'} €
                </div>
                <div className="text-sm text-gray-600">
                  {courseData.access_type === 'freemium' && 'Contenu mixte'}
                  {courseData.access_type === 'premium' && 'Accès premium'}
                </div>
              </div>
            )}
            {courseData.access_type === 'free' && (
              <div className="ml-4">
                <span className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg text-lg">
                  GRATUIT
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="text-sm">
                {courseData.chapters?.length || 0} chapitres
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm">{allLessons.length} leçons</span>
            </div>
            {totalDuration > 0 && (
              <div className="flex items-center gap-2 text-gray-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">
                  {Math.floor(totalDuration / 60)}h {totalDuration % 60}min
                </span>
              </div>
            )}
          </div>

          {/* Learning Objectives */}
          {courseData.learning_objectives && courseData.learning_objectives.length > 0 && (
            <div className="py-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Ce que vous allez apprendre</h4>
              <ul className="space-y-2">
                {courseData.learning_objectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Course Content */}
          <div className="py-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Contenu du cours</h4>
            <div className="space-y-3">
              {courseData.chapters?.map((chapter, chIndex) => (
                <div key={chapter.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3">
                    <h5 className="font-medium text-gray-900">
                      {chIndex + 1}. {chapter.title}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">
                      {chapter.lessons.length} leçon{chapter.lessons.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {chapter.lessons.map((lesson, lIndex) => (
                      <div
                        key={lesson.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getLessonIcon(lesson.type)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {lIndex + 1}. {lesson.title}
                            </p>
                            {lesson.content && 'duration' in lesson.content && (
                              <p className="text-xs text-gray-500">{lesson.content.duration} min</p>
                            )}
                          </div>
                        </div>
                        {lesson.is_free ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            GRATUIT
                          </span>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4 border-t border-gray-200">
            <button className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              {courseData.access_type === 'free' ? "S'inscrire gratuitement" : 'Acheter le cours'}
            </button>
          </div>
        </div>
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
            <h3 className="text-sm font-medium text-blue-900 mb-1">Aperçu en lecture seule</h3>
            <p className="text-sm text-blue-800">
              Ceci est un aperçu de comment les étudiants verront votre cours. Si vous souhaitez
              modifier quelque chose, utilisez les boutons de navigation pour revenir aux étapes
              précédentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
