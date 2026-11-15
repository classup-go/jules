'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData, ChapterData, LessonData } from '@/lib/validations/course-wizard'
import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { ChapterItem } from '@/components/course-builder/ChapterItem'
import { LessonItem } from '@/components/course-builder/LessonItem'

interface Step3LessonBuilderProps {
  form: UseFormReturn<CourseWizardData>
  onSelectLesson: (lessonId: string | null) => void
}

export function Step3LessonBuilder({ form, onSelectLesson }: Step3LessonBuilderProps) {
  const { watch, setValue, formState: { errors } } = form
  const chapters = watch('chapters') || []

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonType, setLessonType] = useState<'video' | 'pdf' | 'quiz' | 'exercise' | 'live'>('video')
  const [lessonIsFree, setLessonIsFree] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleAddChapter = () => {
    setEditingChapterId(null)
    setChapterTitle('')
    setShowChapterModal(true)
  }

  const handleEditChapter = (chapterId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId)
    if (chapter) {
      setEditingChapterId(chapterId)
      setChapterTitle(chapter.title)
      setShowChapterModal(true)
    }
  }

  const handleSaveChapter = () => {
    if (!chapterTitle.trim()) return

    if (editingChapterId) {
      // Edit existing chapter
      const updatedChapters = chapters.map((c) =>
        c.id === editingChapterId ? { ...c, title: chapterTitle } : c
      )
      setValue('chapters', updatedChapters, { shouldValidate: true })
    } else {
      // Add new chapter
      const newChapter: ChapterData = {
        id: `chapter-${Date.now()}`,
        title: chapterTitle,
        order_index: chapters.length,
        lessons: [],
      }
      setValue('chapters', [...chapters, newChapter], { shouldValidate: true })
    }

    setShowChapterModal(false)
    setChapterTitle('')
  }

  const handleDeleteChapter = (chapterId: string) => {
    const updatedChapters = chapters
      .filter((c) => c.id !== chapterId)
      .map((c, index) => ({ ...c, order_index: index }))
    setValue('chapters', updatedChapters, { shouldValidate: true })
  }

  const handleAddLesson = (chapterId: string) => {
    setSelectedChapterId(chapterId)
    setLessonTitle('')
    setLessonType('video')
    setLessonIsFree(false)
    setShowLessonModal(true)
  }

  const handleSaveLesson = () => {
    if (!lessonTitle.trim() || !selectedChapterId) return

    const chapterIndex = chapters.findIndex((c) => c.id === selectedChapterId)
    if (chapterIndex === -1) return

    const chapter = chapters[chapterIndex]
    const newLesson: LessonData = {
      id: `lesson-${Date.now()}`,
      title: lessonTitle,
      type: lessonType,
      is_free: lessonIsFree,
      order_index: chapter.lessons.length,
    }

    const updatedChapters = [...chapters]
    updatedChapters[chapterIndex] = {
      ...chapter,
      lessons: [...chapter.lessons, newLesson],
    }

    setValue('chapters', updatedChapters, { shouldValidate: true })
    setShowLessonModal(false)
  }

  const handleEditLesson = (lessonId: string) => {
    onSelectLesson(lessonId)
  }

  const handleDeleteLesson = (lessonId: string) => {
    const updatedChapters = chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons
        .filter((l) => l.id !== lessonId)
        .map((l, index) => ({ ...l, order_index: index })),
    }))
    setValue('chapters', updatedChapters, { shouldValidate: true })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const activeData = active.data.current
    const overData = over.data.current

    // Handle chapter reordering
    if (activeData?.type === 'chapter' && overData?.type === 'chapter') {
      const oldIndex = chapters.findIndex((c) => c.id === active.id)
      const newIndex = chapters.findIndex((c) => c.id === over.id)

      const reordered = arrayMove(chapters, oldIndex, newIndex).map((c, index) => ({
        ...c,
        order_index: index,
      }))

      setValue('chapters', reordered, { shouldValidate: true })
    }

    // Handle lesson reordering within same chapter
    if (activeData?.type === 'lesson' && overData?.type === 'lesson') {
      const activeLesson = activeData.lesson
      const overLesson = overData.lesson

      if (activeLesson.chapter_id === overLesson.chapter_id) {
        const chapterIndex = chapters.findIndex((c) =>
          c.lessons.some((l) => l.id === activeLesson.id)
        )
        if (chapterIndex === -1) return

        const chapter = chapters[chapterIndex]
        const oldIndex = chapter.lessons.findIndex((l) => l.id === active.id)
        const newIndex = chapter.lessons.findIndex((l) => l.id === over.id)

        const reorderedLessons = arrayMove(chapter.lessons, oldIndex, newIndex).map(
          (l, index) => ({ ...l, order_index: index })
        )

        const updatedChapters = [...chapters]
        updatedChapters[chapterIndex] = {
          ...chapter,
          lessons: reorderedLessons,
        }

        setValue('chapters', updatedChapters, { shouldValidate: true })
      }
    }

    setActiveId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Structure du cours
        </h2>
        <p className="text-gray-600">
          Organisez votre cours en chapitres et leçons
        </p>
      </div>

      {/* Add Chapter Button */}
      <button
        type="button"
        onClick={handleAddChapter}
        className="w-full px-6 py-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors font-medium"
      >
        + Ajouter un chapitre
      </button>

      {/* Chapters List */}
      {chapters.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <ChapterItem
                  key={chapter.id}
                  chapter={{
                    ...chapter,
                    lessons: chapter.lessons.map((l) => ({
                      ...l,
                      duration_minutes: 0,
                      chapter_id: chapter.id,
                    })),
                  }}
                  onEditChapter={handleEditChapter}
                  onDeleteChapter={handleDeleteChapter}
                  onAddLesson={handleAddLesson}
                >
                  <SortableContext
                    items={chapter.lessons.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {chapter.lessons.map((lesson) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={{
                          ...lesson,
                          duration_minutes: 0,
                          chapter_id: chapter.id,
                        }}
                        onEditLesson={handleEditLesson}
                        onDeleteLesson={handleDeleteLesson}
                      />
                    ))}
                  </SortableContext>
                </ChapterItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Validation Error */}
      {errors.chapters && typeof errors.chapters.message === 'string' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{errors.chapters.message}</p>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingChapterId ? 'Modifier le chapitre' : 'Nouveau chapitre'}
            </h3>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Titre du chapitre"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowChapterModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveChapter}
                disabled={!chapterTitle.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingChapterId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nouvelle leçon</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Titre de la leçon
                </label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ex: Introduction aux fonctions"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Type de leçon
                </label>
                <select
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="video">📹 Vidéo</option>
                  <option value="pdf">📄 PDF</option>
                  <option value="quiz">✅ Quiz</option>
                  <option value="exercise">📝 Exercice</option>
                  <option value="live">🔴 Session Live</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_free"
                  checked={lessonIsFree}
                  onChange={(e) => setLessonIsFree(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_free" className="text-sm text-gray-700">
                  Leçon gratuite (aperçu pour les étudiants)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLessonModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveLesson}
                disabled={!lessonTitle.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
