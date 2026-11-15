'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'

interface Lesson {
  id: string
  title: string
  type: 'video' | 'pdf' | 'text' | 'qcm' | 'micro_learning'
  duration_minutes: number
  order_index: number
  chapter_id: string
}

interface LessonItemProps {
  lesson: Lesson
  onEditLesson: (lessonId: string) => void
  onDeleteLesson: (lessonId: string) => void
}

const getLessonIcon = (type: string) => {
  switch (type) {
    case 'video':
      return '📹'
    case 'pdf':
      return '📄'
    case 'text':
      return '📝'
    case 'qcm':
      return '✅'
    case 'micro_learning':
      return '⚡'
    default:
      return '📚'
  }
}

const getLessonTypeLabel = (type: string) => {
  switch (type) {
    case 'video':
      return 'Vidéo'
    case 'pdf':
      return 'PDF'
    case 'text':
      return 'Texte'
    case 'qcm':
      return 'QCM'
    case 'micro_learning':
      return 'Micro-learning'
    default:
      return type
  }
}

export function LessonItem({
  lesson,
  onEditLesson,
  onDeleteLesson
}: LessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lesson.id,
    data: {
      type: 'lesson',
      lesson
    }
  })

  const [showMenu, setShowMenu] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg mb-2 hover:border-blue-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 p-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
          aria-label="Déplacer la leçon"
        >
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="currentColor"
          >
            <circle cx="3" cy="4" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="3" cy="12" r="1.5" />
            <circle cx="9" cy="4" r="1.5" />
            <circle cx="9" cy="8" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
          </svg>
        </button>

        {/* Lesson Icon */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg text-xl">
          {getLessonIcon(lesson.type)}
        </div>

        {/* Lesson Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {lesson.order_index + 1}. {lesson.title}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">
              {getLessonTypeLabel(lesson.type)}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">
              {lesson.duration_minutes} min
            </span>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8 9.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => {
                    onEditLesson(lesson.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>✏️</span> Modifier
                </button>
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette leçon ?')) {
                      onDeleteLesson(lesson.id)
                    }
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-200"
                >
                  <span>🗑️</span> Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
