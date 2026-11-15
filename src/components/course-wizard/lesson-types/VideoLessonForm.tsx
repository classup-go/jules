'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { useState } from 'react'

interface VideoLessonFormProps {
  form: UseFormReturn<CourseWizardData>
  fieldPath: string
}

export function VideoLessonForm({ form, fieldPath }: VideoLessonFormProps) {
  const { register, setValue, watch, formState: { errors } } = form
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url')

  const content = watch(fieldPath as any)
  const videoUrl = content?.video_url || ''
  const duration = content?.duration || 0
  const description = content?.description || ''

  const handleSave = () => {
    const videoContent = {
      type: 'video' as const,
      video_url: uploadMethod === 'url' ? videoUrl : undefined,
      video_file: uploadMethod === 'file' ? 'uploaded_file_path' : undefined,
      duration: duration,
      description: description,
    }
    setValue(fieldPath as any, videoContent, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Leçon vidéo</h4>

        {/* Upload Method Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setUploadMethod('url')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              uploadMethod === 'url'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            URL Vidéo
          </button>
          <button
            type="button"
            onClick={() => setUploadMethod('file')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              uploadMethod === 'file'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Télécharger
          </button>
        </div>

        {uploadMethod === 'url' ? (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              URL de la vidéo
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setValue(`${fieldPath}.video_url` as any, e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Supporte YouTube, Vimeo, et autres plateformes
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Télécharger une vidéo
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Cliquez pour sélectionner ou glissez-déposez
              </p>
              <p className="text-xs text-gray-500 mt-1">
                MP4, MOV, AVI jusqu'à 500MB
              </p>
            </div>
            <p className="text-xs text-orange-600 mt-2">
              Note: L'upload de fichiers sera implémenté avec Supabase Storage
            </p>
          </div>
        )}
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Durée (minutes) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setValue(`${fieldPath}.duration` as any, parseInt(e.target.value) || 0)}
          min="1"
          placeholder="30"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setValue(`${fieldPath}.description` as any, e.target.value)}
          rows={4}
          placeholder="Décrivez le contenu de cette vidéo..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-sm text-gray-500 mt-1">
          {description.length} caractères (minimum 10)
        </p>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        💾 Enregistrer le contenu vidéo
      </button>

      {content && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ Contenu enregistré pour cette leçon
          </p>
        </div>
      )}
    </div>
  )
}
