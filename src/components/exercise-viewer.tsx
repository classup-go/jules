'use client'

import { useState } from 'react'

interface Exercise {
  id: string
  title: string
  statement: string
  solution: string
  difficulty: string
  points: number
}

export default function ExerciseViewer({ exercises }: { exercises: Exercise[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  const currentExercise = exercises[currentIndex]

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-600'
      case 'hard': return 'bg-red-100 text-red-600'
      default: return 'bg-yellow-100 text-yellow-600'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Facile'
      case 'hard': return 'Difficile'
      default: return 'Moyen'
    }
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      {exercises.length > 1 && (
        <div className="bg-white rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-[#6B7280]">
              Exercice {currentIndex + 1}/{exercises.length}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(currentExercise.difficulty)}`}>
              {getDifficultyLabel(currentExercise.difficulty)}
            </span>
          </div>
          <div className="flex gap-2">
            {exercises.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  setShowSolution(false)
                }}
                className={`flex-1 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-[#1E6DD1]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Exercise */}
      <div className="bg-white rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">
          {currentExercise.title}
        </h2>

        {/* Statement */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-[#1A1A2E] mb-2">📋 Énoncé</p>
          <p className="text-[#6B7280] whitespace-pre-wrap">{currentExercise.statement}</p>
        </div>

        {/* Points */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-[#6B7280]">Points:</span>
          <span className="text-sm font-bold text-[#F5A623]">{currentExercise.points} pts</span>
        </div>

        {/* Solution Toggle */}
        {currentExercise.solution && (
          <>
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="w-full bg-[#E8F1FB] text-[#1E6DD1] py-3 rounded-xl font-medium mb-4"
            >
              {showSolution ? '🙈 Masquer le corrigé' : '👀 Voir le corrigé'}
            </button>

            {showSolution && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-2">✅ Corrigé</p>
                <p className="text-green-600 whitespace-pre-wrap">{currentExercise.solution}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      {exercises.length > 1 && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setCurrentIndex(Math.max(0, currentIndex - 1))
              setShowSolution(false)
            }}
            disabled={currentIndex === 0}
            className="flex-1 bg-gray-100 text-[#1A1A2E] py-3 rounded-full font-medium disabled:opacity-50"
          >
            ← Précédent
          </button>
          <button
            onClick={() => {
              setCurrentIndex(Math.min(exercises.length - 1, currentIndex + 1))
              setShowSolution(false)
            }}
            disabled={currentIndex === exercises.length - 1}
            className="flex-1 bg-[#1E6DD1] text-white py-3 rounded-full font-medium disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}