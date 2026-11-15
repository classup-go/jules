'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { ClassWizardData } from '@/lib/validations/class-wizard'

type ContentType = 'text' | 'video'

export function Step4Content({ form }: { form: UseFormReturn<ClassWizardData> }) {
  const [contentType, setContentType] = useState<ContentType>('text')
  const { watch, setValue, formState: { errors } } = form

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type)
    setValue('initial_content.type', type)
    // Reset content si changement de type
    if (type !== watch('initial_content.type')) {
      setValue('initial_content.content', '')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ajouter le contenu initial
        </h2>
        <p className="text-gray-600">
          Ajoutez le premier élément de contenu pour votre cours
        </p>
      </div>

      {/* Choix type de contenu */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Type de contenu <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleContentTypeChange('text')}
            className={`p-5 border-2 rounded-xl text-center transition-all ${
              contentType === 'text'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-4xl mb-3">📝</div>
            <div className="font-semibold text-lg mb-1">Texte</div>
            <div className="text-sm text-gray-600">Article, leçon écrite</div>
          </button>

          <button
            type="button"
            onClick={() => handleContentTypeChange('video')}
            className={`p-5 border-2 rounded-xl text-center transition-all ${
              contentType === 'video'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-4xl mb-3">🎥</div>
            <div className="font-semibold text-lg mb-1">Vidéo</div>
            <div className="text-sm text-gray-600">YouTube, Vimeo, etc.</div>
          </button>
        </div>
      </div>

      {/* Éditeur selon type */}
      <div className="border-2 border-gray-200 rounded-xl p-6 min-h-[300px] bg-gray-50">
        {contentType === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Contenu du cours <span className="text-red-500">*</span>
            </label>
            <textarea
              value={watch('initial_content.content') || ''}
              onChange={(e) => setValue('initial_content.content', e.target.value)}
              rows={12}
              placeholder="Écrivez le contenu de votre première leçon...&#10;&#10;Vous pourrez le modifier et l'enrichir plus tard avec des images, vidéos, quiz, etc."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none font-sans"
            />
            {errors.initial_content?.content && (
              <p className="text-sm text-red-500 mt-1">{errors.initial_content.content.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Minimum 10 caractères. Vous pourrez utiliser un éditeur avancé après la création.
            </p>
          </div>
        )}

        {contentType === 'video' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              URL de la vidéo <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={watch('initial_content.content') || ''}
              onChange={(e) => {
                setValue('initial_content.type', 'video')
                setValue('initial_content.content', e.target.value)
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
            {errors.initial_content?.content && (
              <p className="text-sm text-red-500 mt-1">{errors.initial_content.content.message}</p>
            )}
            <div className="mt-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Plateformes supportées:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>YouTube (youtube.com ou youtu.be)</li>
                <li>Vimeo (vimeo.com)</li>
                <li>Dailymotion</li>
                <li>Lien vidéo direct (.mp4, .webm)</li>
              </ul>
            </div>

            {/* Preview si URL YouTube valide */}
            {watch('initial_content.content')?.includes('youtube.com') && (
              <div className="mt-4 bg-white rounded-lg p-4 border border-gray-300">
                <p className="text-sm text-green-600 font-medium mb-2">✓ Vidéo YouTube détectée</p>
                <p className="text-xs text-gray-500">L'aperçu sera affiché après la création</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message final */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-green-500 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="text-5xl flex-shrink-0">🎉</div>
          <div>
            <h3 className="font-bold text-xl text-gray-900 mb-3">
              Prêt à créer votre classe!
            </h3>
            <p className="text-gray-700 mb-4">
              Lorsque vous cliquerez sur <strong>"Créer la classe"</strong>, nous allons:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                <span>Créer votre classe <strong>{watch('class_name') || '...'}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                <span>Ajouter automatiquement le cours <strong>{watch('first_course.title') || '...'}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                <span>Intégrer le contenu initial que vous venez de créer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                <span>Vous rediriger vers votre classe pour continuer à l'enrichir</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900">
                <strong>💡 Après:</strong> Vous pourrez ajouter d'autres cours, inviter vos élèves, et enrichir votre contenu avec notre éditeur avancé.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
