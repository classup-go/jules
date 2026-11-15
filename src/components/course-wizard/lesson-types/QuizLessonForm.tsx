'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { useState } from 'react'

interface QuizLessonFormProps {
  form: UseFormReturn<CourseWizardData>
  fieldPath: string
}

interface Question {
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
}

export function QuizLessonForm({ form, fieldPath }: QuizLessonFormProps) {
  const { setValue, watch } = form

  const content = watch(fieldPath as any)
  const [questions, setQuestions] = useState<Question[]>(
    content?.questions || [
      { question: '', options: ['', ''], correct_answer: 0, explanation: '' },
    ]
  )

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question: '', options: ['', ''], correct_answer: 0, explanation: '' },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const addOption = (questionIndex: number) => {
    const updated = [...questions]
    if (updated[questionIndex].options.length < 6) {
      updated[questionIndex].options.push('')
      setQuestions(updated)
    }
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options = updated[questionIndex].options.filter(
        (_, i) => i !== optionIndex
      )
      setQuestions(updated)
    }
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions]
    updated[questionIndex].options[optionIndex] = value
    setQuestions(updated)
  }

  const handleSave = () => {
    const quizContent = {
      type: 'quiz' as const,
      questions: questions,
    }
    setValue(fieldPath as any, quizContent, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Quiz (QCM)</h4>
        <button
          type="button"
          onClick={addQuestion}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Ajouter une question
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Minimum 3 questions requises pour un quiz
      </p>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-start justify-between mb-4">
              <h5 className="font-medium text-gray-900">Question {qIndex + 1}</h5>
              <button
                type="button"
                onClick={() => removeQuestion(qIndex)}
                disabled={questions.length <= 1}
                className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Question Text */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                rows={2}
                placeholder="Posez votre question ici..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Options */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">
                  Options (2-6) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  disabled={question.options.length >= 6}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Ajouter une option
                </button>
              </div>

              <div className="space-y-2">
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`question-${qIndex}-correct`}
                      checked={question.correct_answer === oIndex}
                      onChange={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                      className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(qIndex, oIndex)}
                      disabled={question.options.length <= 2}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Cochez la radio button pour indiquer la bonne réponse
              </p>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Explication (optionnel)
              </label>
              <textarea
                value={question.explanation || ''}
                onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                rows={2}
                placeholder="Expliquez pourquoi cette réponse est correcte..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={questions.length < 3}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        💾 Enregistrer le quiz ({questions.length} questions)
      </button>

      {questions.length < 3 && (
        <p className="text-sm text-orange-600 text-center">
          Ajoutez au moins 3 questions pour enregistrer ce quiz
        </p>
      )}

      {content && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ Quiz enregistré avec {content.questions?.length} questions
          </p>
        </div>
      )}
    </div>
  )
}
