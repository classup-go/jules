'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CourseWizard } from '@/components/course-wizard/CourseWizard'
import { CourseWizardData } from '@/lib/validations/course-wizard'

export default function NewCoursePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [courseId, setCourseId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 🚧 MASQUAGE: Rediriger vers nouvelle interface sauf si paramètre interne
  const isInternalCall = searchParams.get('internal') === 'true'

  if (!isInternalCall) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-yellow-400">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-center">
              <div className="text-6xl mb-3">🚧</div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Nouvelle Interface Disponible!
              </h1>
              <p className="text-yellow-50">
                Nous avons simplifié la création de cours
              </p>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  ✨ Ce qui a changé
                </h2>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <p className="text-sm">
                      <strong>Un seul point d'entrée</strong> : Tout commence par créer une classe
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <p className="text-sm">
                      <strong>Workflow simplifié</strong> : Guidé étape par étape
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">✓</span>
                    <p className="text-sm">
                      <strong>Plus rapide</strong> : Créez en 5 minutes
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/teacher/classes/create"
                  className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  ➕ Créer une classe
                </Link>

                <Link
                  href="/teacher/classes"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold transition-colors"
                >
                  Voir mes classes
                </Link>

                <button
                  onClick={() => router.back()}
                  className="block w-full text-gray-500 text-center py-2 text-sm hover:text-gray-700"
                >
                  ← Retour
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              💡 Vos anciens cours sont toujours accessibles dans "Mes classes"
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Create initial course draft on mount
  useEffect(() => {
    const createDraft = async () => {
      try {
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Nouveau cours',
            subject: '',
            level: 'college',
          }),
        })

        if (!response.ok) {
          throw new Error('Erreur lors de la création du brouillon')
        }

        const data = await response.json()
        setCourseId(data.id)
      } catch (error) {
        console.error('Error creating draft:', error)
        alert('Erreur lors de la création du brouillon')
      } finally {
        setIsLoading(false)
      }
    }

    createDraft()
  }, [])

  const handleSave = async (data: Partial<CourseWizardData>) => {
    if (!courseId) return

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Error saving:', error)
      throw error
    }
  }

  const handlePublish = async (data: CourseWizardData) => {
    if (!courseId) return

    try {
      const response = await fetch(`/api/courses/${courseId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la publication')
      }

      // Redirect to course detail page
      router.push(`/teacher/courses/${courseId}`)
    } catch (error) {
      console.error('Error publishing:', error)
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Création du brouillon...</p>
        </div>
      </div>
    )
  }

  if (!courseId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">
            Impossible de créer le brouillon du cours
          </p>
          <button
            onClick={() => router.push('/teacher/courses')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour aux cours
          </button>
        </div>
      </div>
    )
  }

  return (
    <CourseWizard
      courseId={courseId}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  )
}