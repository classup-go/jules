'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData, LessonData } from '@/lib/validations/course-wizard'
import { VideoLessonForm } from '../lesson-types/VideoLessonForm'
import { PDFLessonForm } from '../lesson-types/PDFLessonForm'
import { QuizLessonForm } from '../lesson-types/QuizLessonForm'
import { ExerciseLessonForm } from '../lesson-types/ExerciseLessonForm'
import { LiveLessonForm } from '../lesson-types/LiveLessonForm'

interface Step4ContentEditorProps {
  form: UseFormReturn<CourseWizardData>
  selectedLessonId: string | null
  onSelectLesson: (lessonId: string | null) => void
}

export function Step4ContentEditor({ form, selectedLessonId, onSelectLesson }: Step4ContentEditorProps) {
  const { watch } = form
  const chapters = watch('chapters') || []

  // Find the selected lesson
  let selectedLesson: LessonData | null = null
  let chapterIndex = -1
  let lessonIndex = -1

  if (selectedLessonId) {
    for (let i = 0; i < chapters.length; i++) {
      const lesson = chapters[i].lessons.findIndex((l) => l.id === selectedLessonId)
      if (lesson !== -1) {
        chapterIndex = i
        lessonIndex = lesson
        selectedLesson = chapters[i].lessons[lesson]
        break
      }
    }
  }

  // Get all lessons for selection list
  const allLessons = chapters.flatMap((chapter, chIdx) =>
    chapter.lessons.map((lesson, lIdx) => ({
      ...lesson,
      chapterTitle: chapter.title,
      chapterIndex: chIdx,
      lessonIndex: lIdx,
    }))
  )

  // Count lessons with and without content
  const lessonsWithContent = allLessons.filter((l) => l.content !== undefined && l.content !== null).length
  const lessonsWithoutContent = allLessons.length - lessonsWithContent
  const freeLessonsWithContent = allLessons.filter(
    (l) => l.is_free && l.content !== undefined && l.content !== null
  ).length

  const renderLessonForm = () => {
    if (!selectedLesson || chapterIndex === -1 || lessonIndex === -1) {
      return null
    }

    const fieldPath = `chapters.${chapterIndex}.lessons.${lessonIndex}.content` as const

    switch (selectedLesson.type) {
      case 'video':
        return <VideoLessonForm form={form} fieldPath={fieldPath} />
      case 'pdf':
        return <PDFLessonForm form={form} fieldPath={fieldPath} />
      case 'quiz':
        return <QuizLessonForm form={form} fieldPath={fieldPath} />
      case 'exercise':
        return <ExerciseLessonForm form={form} fieldPath={fieldPath} />
      case 'live':
        return <LiveLessonForm form={form} fieldPath={fieldPath} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Contenu des leçons
        </h2>
        <p className="text-gray-600">
          Ajoutez le contenu spécifique à chaque leçon
        </p>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{allLessons.length}</div>
          <div className="text-sm text-blue-700">Leçons totales</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{lessonsWithContent}</div>
          <div className="text-sm text-green-700">Avec contenu</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{lessonsWithoutContent}</div>
          <div className="text-sm text-orange-700">Sans contenu</div>
        </div>
      </div>

      {/* Business Rule Warning */}
      {freeLessonsWithContent === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-900 mb-1">
                Règle métier non respectée
              </h3>
              <p className="text-sm text-red-800">
                Au moins 1 leçon gratuite doit avoir du contenu pour permettre la publication du cours.
              </p>
            </div>
          </div>
        </div>
      )}

      {allLessons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-gray-500 font-medium">Aucune leçon créée</p>
          <p className="text-sm text-gray-400 mt-1">
            Retournez à l'étape précédente pour créer des chapitres et des leçons
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Sélectionner une leçon</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onSelectLesson(lesson.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedLessonId === lesson.id
                        ? 'bg-blue-100 border-2 border-blue-500 text-blue-900'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        {lesson.content ? (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{lesson.chapterTitle}</span>
                          {lesson.is_free && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Gratuit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div className="lg:col-span-2">
            {selectedLesson ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedLesson.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">
                        Type: {selectedLesson.type}
                      </span>
                      {selectedLesson.is_free && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Gratuit
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLesson(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {renderLessonForm()}
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                <p className="mt-4 text-gray-500 font-medium">Sélectionnez une leçon</p>
                <p className="text-sm text-gray-400 mt-1">
                  Choisissez une leçon dans la liste pour ajouter son contenu
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
