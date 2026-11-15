'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { useState } from 'react'

interface LiveLessonFormProps {
  form: UseFormReturn<CourseWizardData>
  fieldPath: string
}

export function LiveLessonForm({ form, fieldPath }: LiveLessonFormProps) {
  const { setValue, watch } = form

  const content = watch(fieldPath as any)
  const [scheduledDate, setScheduledDate] = useState(
    content?.scheduled_at ? new Date(content.scheduled_at).toISOString().slice(0, 16) : ''
  )
  const [duration, setDuration] = useState(content?.duration || 60)
  const [maxParticipants, setMaxParticipants] = useState(content?.max_participants || 50)

  const handleSave = () => {
    if (!scheduledDate) return

    const liveContent = {
      type: 'live' as const,
      scheduled_at: new Date(scheduledDate),
      duration: duration,
      max_participants: maxParticipants,
    }
    setValue(fieldPath as any, liveContent, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Session Live</h4>

        {/* Scheduled Date & Time */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Date et heure de la session <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            Planifiez la session en direct (utilise LiveKit)
          </p>
        </div>

        {/* Duration */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Durée (minutes) <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              min="15"
              max="240"
              step="15"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2">
              {[30, 60, 90, 120].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    duration === minutes
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {minutes}min
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Durée estimée de la session (entre 15 et 240 minutes)
          </p>
        </div>

        {/* Max Participants */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Nombre maximum de participants
          </label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 50)}
            min="1"
            max="100"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            Limitez le nombre d'étudiants pour cette session (défaut: 50)
          </p>
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
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                À propos des sessions live
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Les sessions sont hébergées via LiveKit</li>
                <li>• Les étudiants recevront une notification avant le début</li>
                <li>• Les enregistrements peuvent être activés (optionnel)</li>
                <li>• Pensez à tester votre équipement audio/vidéo avant</li>
              </ul>
            </div>
          </div>
        </div>

        {scheduledDate && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-purple-900">Session planifiée</h3>
                <p className="text-sm text-purple-800 mt-1">
                  {new Date(scheduledDate).toLocaleString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  <br />
                  Durée: {duration} minutes • Max participants: {maxParticipants}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!scheduledDate || duration < 15}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        💾 Enregistrer la session live
      </button>

      {!scheduledDate && (
        <p className="text-sm text-orange-600 text-center">
          Sélectionnez une date et heure pour la session
        </p>
      )}

      {content && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ Session live planifiée
          </p>
        </div>
      )}
    </div>
  )
}
