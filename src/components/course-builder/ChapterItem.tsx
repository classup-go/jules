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
}

interface Chapter {
  id: string
  title: string
  description?: string
  order_index: number
  lessons: Lesson[]
}

interface ChapterItemProps {
  chapter: Chapter
  onEditChapter: (chapterId: string) => void
  onDeleteChapter: (chapterId: string) => void
  onAddLesson: (chapterId: string) => void
  children?: React.ReactNode
}

export function ChapterItem({
  chapter,
  onEditChapter,
  onDeleteChapter,
  onAddLesson,
  children
}: ChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: chapter.id,
    data: {
      type: 'chapter',
      chapter
    }
  })

  const [isExpanded, setIsExpanded] = useState(true)
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
      className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden"
    >
      {/* Chapter Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
          aria-label="Déplacer le chapitre"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="4" cy="12" r="1.5" />
            <circle cx="12" cy="4" r="1.5" />
            <circle cx="12" cy="8" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
        </button>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-600 hover:text-gray-800"
        >
          {isExpanded ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Chapter Title */}
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">
            {chapter.order_index + 1}. {chapter.title}
          </h3>
          {chapter.description && (
            <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {chapter.lessons.length} leçon{chapter.lessons.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => {
                    onEditChapter(chapter.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>✏️</span> Modifier
                </button>
                <button
                  onClick={() => {
                    onAddLesson(chapter.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>➕</span> Ajouter une leçon
                </button>
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce chapitre et toutes ses leçons ?')) {
                      onDeleteChapter(chapter.id)
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

      {/* Lessons List */}
      {isExpanded && (
        <div className="p-4 bg-gray-50">
          {children}

          {chapter.lessons.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">Aucune leçon dans ce chapitre</p>
              <button
                onClick={() => onAddLesson(chapter.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <span>➕</span> Ajouter une leçon
              </button>
            </div>
          )}

          {chapter.lessons.length > 0 && (
            <button
              onClick={() => onAddLesson(chapter.id)}
              className="mt-3 w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              ➕ Ajouter une leçon
            </button>
          )}
        </div>
      )}
    </div>
  )
}
