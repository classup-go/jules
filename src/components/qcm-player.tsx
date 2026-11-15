'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Question {
  id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export default function QCMPlayer({ questions, courseId }: { questions: Question[], courseId: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [answers, setAnswers] = useState<boolean[]>([])

  const currentQuestion = questions[currentIndex]

  const handleAnswer = async (optionIndex: number) => {
    if (isAnswered) return

    setSelectedAnswer(optionIndex)
    setIsAnswered(true)

    const isCorrect = optionIndex === currentQuestion.correct_answer
    if (isCorrect) {
      setScore(score + 1)
    }
    setAnswers([...answers, isCorrect])

    // Save answer to database
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('qcm_answers').upsert({
        question_id: currentQuestion.id,
        student_id: user.id,
        selected_answer: optionIndex,
        is_correct: isCorrect,
      })
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
    } else {
      setIsFinished(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setScore(0)
    setIsFinished(false)
    setAnswers([])
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="bg-white rounded-2xl p-6 text-center">
        <span className="text-6xl mb-4 block">
          {percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
        </span>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">Quiz terminé !</h2>
        <p className="text-4xl font-bold text-[#1E6DD1] mb-2">{score}/{questions.length}</p>
        <p className="text-[#6B7280] mb-6">{percentage}% de bonnes réponses</p>
        
        <div className="flex gap-3 mb-6">
          {answers.map((correct, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                correct ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <button
          onClick={handleRestart}
          className="w-full bg-[#1E6DD1] text-white py-3 rounded-full font-semibold"
        >
          Recommencer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white rounded-2xl p-4">
        <div className="flex justify-between text-sm text-[#6B7280] mb-2">
          <span>Question {currentIndex + 1}/{questions.length}</span>
          <span>Score: {score}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1E6DD1] transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-[#1A1A2E] mb-6">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            let bgColor = 'bg-gray-50 border-gray-200'
            let textColor = 'text-[#1A1A2E]'

            if (isAnswered) {
              if (index === currentQuestion.correct_answer) {
                bgColor = 'bg-green-100 border-green-500'
                textColor = 'text-green-700'
              } else if (index === selectedAnswer && selectedAnswer !== currentQuestion.correct_answer) {
                bgColor = 'bg-red-100 border-red-500'
                textColor = 'text-red-700'
              }
            } else if (selectedAnswer === index) {
              bgColor = 'bg-[#E8F1FB] border-[#1E6DD1]'
              textColor = 'text-[#1E6DD1]'
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${bgColor} ${textColor}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white border flex items-center justify-center font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                  {isAnswered && index === currentQuestion.correct_answer && (
                    <span className="ml-auto text-green-500">✓</span>
                  )}
                  {isAnswered && index === selectedAnswer && selectedAnswer !== currentQuestion.correct_answer && (
                    <span className="ml-auto text-red-500">✗</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {isAnswered && currentQuestion.explanation && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-[#1E6DD1]">
              💡 {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Next Button */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className="w-full bg-[#F5A623] text-white py-4 rounded-full font-semibold"
        >
          {currentIndex < questions.length - 1 ? 'Question suivante' : 'Voir les résultats'}
        </button>
      )}
    </div>
  )
}