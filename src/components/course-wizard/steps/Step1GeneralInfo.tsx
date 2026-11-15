'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Step1GeneralInfoProps {
  form: UseFormReturn<CourseWizardData>
}

interface Classroom {
  id: string
  title: string
  subject: string
  level: string
}

export function Step1GeneralInfo({ form }: Step1GeneralInfoProps) {
  const { register, formState: { errors }, watch, setValue } = form
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loadingClassrooms, setLoadingClassrooms] = useState(true)
  const [showNewClassroomForm, setShowNewClassroomForm] = useState(false)
  const [newClassroom, setNewClassroom] = useState({ title: '', subject: '', level: '' })

  const titleLength = watch('title')?.length || 0
  const selectedClassroomId = watch('classroom_id')

  useEffect(() => {
    loadClassrooms()
  }, [])

  const loadClassrooms = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('classrooms')
        .select('id, title, subject, level')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setClassrooms(data)
      }
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setLoadingClassrooms(false)
    }
  }

  const handleCreateClassroom = async () => {
    if (!newClassroom.title || !newClassroom.subject || !newClassroom.level) {
      alert('Veuillez remplir tous les champs')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: user.id,
          title: newClassroom.title,
          subject: newClassroom.subject,
          level: newClassroom.level,
          is_public: false,
          max_students: 100,
          price: 0,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setClassrooms([data, ...classrooms])
        setValue('classroom_id', data.id)
        setShowNewClassroomForm(false)
        setNewClassroom({ title: '', subject: '', level: '' })
      }
    } catch (error) {
      console.error('Error creating classroom:', error)
      alert('Erreur lors de la création de la classe')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations générales
        </h2>
        <p className="text-gray-600">
          Commencez par sélectionner une classe et définir les informations de base
        </p>
      </div>

      {/* Classroom Selection */}
      <div>
        <label htmlFor="classroom" className="block text-sm font-medium text-gray-900 mb-2">
          Classe (groupe d'élèves) <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Sélectionnez la classe à laquelle ce cours sera attribué
        </p>

        {loadingClassrooms ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-gray-600">Chargement des classes...</span>
          </div>
        ) : (
          <>
            <select
              {...register('classroom_id')}
              id="classroom"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Sélectionner une classe --</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.title} ({classroom.subject} - {classroom.level})
                </option>
              ))}
            </select>

            {!showNewClassroomForm ? (
              <button
                type="button"
                onClick={() => setShowNewClassroomForm(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Créer une nouvelle classe
              </button>
            ) : (
              <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-3">Nouvelle classe</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nom de la classe (ex: Bac S 2024-2025)"
                    value={newClassroom.title}
                    onChange={(e) => setNewClassroom({ ...newClassroom, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Matière (ex: Mathématiques)"
                    value={newClassroom.subject}
                    onChange={(e) => setNewClassroom({ ...newClassroom, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={newClassroom.level}
                    onChange={(e) => setNewClassroom({ ...newClassroom, level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Niveau --</option>
                    <option value="Primaire">Primaire</option>
                    <option value="Collège">Collège</option>
                    <option value="Lycée">Lycée</option>
                    <option value="Supérieur">Supérieur</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateClassroom}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Créer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewClassroomForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {errors.classroom_id && (
              <p className="text-sm text-red-500 mt-1">{errors.classroom_id.message}</p>
            )}
          </>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
          Titre du cours <span className="text-red-500">*</span>
        </label>
        <input
          {...register('title')}
          type="text"
          id="title"
          placeholder="Ex: Mathématiques niveau Terminale - Préparation au BAC"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex justify-between mt-1">
          <p className="text-sm text-gray-500">
            {errors.title ? (
              <span className="text-red-500">{errors.title.message}</span>
            ) : (
              'Soyez descriptif et précis'
            )}
          </p>
          <p className="text-sm text-gray-500">{titleLength}/100</p>
        </div>
      </div>

      {/* Two-column grid for Subject and Level */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-900 mb-2">
            Matière <span className="text-red-500">*</span>
          </label>
          <input
            {...register('subject')}
            type="text"
            id="subject"
            placeholder="Ex: Mathématiques, Physique, Français..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.subject && (
            <p className="text-sm text-red-500 mt-1">{errors.subject.message}</p>
          )}
        </div>

        {/* Level */}
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-gray-900 mb-2">
            Niveau <span className="text-red-500">*</span>
          </label>
          <select
            {...register('level')}
            id="level"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="primaire">🎒 Primaire</option>
            <option value="college">📚 Collège</option>
            <option value="lycee">🎓 Lycée</option>
            <option value="superieur">🏛️ Supérieur</option>
          </select>
          {errors.level && (
            <p className="text-sm text-red-500 mt-1">{errors.level.message}</p>
          )}
        </div>
      </div>

      {/* Two-column grid for Language and Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-900 mb-2">
            Langue d'enseignement <span className="text-red-500">*</span>
          </label>
          <select
            {...register('language')}
            id="language"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="ar">🇹🇳 Arabe</option>
            <option value="en">🇬🇧 Anglais</option>
          </select>
          {errors.language && (
            <p className="text-sm text-red-500 mt-1">{errors.language.message}</p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-900 mb-2">
            Difficulté <span className="text-red-500">*</span>
          </label>
          <select
            {...register('difficulty')}
            id="difficulty"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="debutant">⭐ Débutant</option>
            <option value="intermediaire">⭐⭐ Intermédiaire</option>
            <option value="avance">⭐⭐⭐ Avancé</option>
          </select>
          {errors.difficulty && (
            <p className="text-sm text-red-500 mt-1">{errors.difficulty.message}</p>
          )}
        </div>
      </div>

      {/* Exam Prep (Optional) */}
      <div>
        <label htmlFor="exam_prep" className="block text-sm font-medium text-gray-900 mb-2">
          Préparation à un examen (optionnel)
        </label>
        <input
          {...register('exam_prep')}
          type="text"
          id="exam_prep"
          placeholder="Ex: BAC, Brevet, Concours d'entrée..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500 mt-1">
          Indiquez si ce cours prépare à un examen spécifique
        </p>
      </div>

      {/* Description (Optional) */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
          Description du cours (optionnel)
        </label>
        <textarea
          {...register('description')}
          id="description"
          rows={4}
          placeholder="Décrivez brièvement le contenu et les bénéfices de votre cours..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Duration Section - Flexible pour tous types de cours */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Durée du cours</h3>
          <p className="text-sm text-gray-500 mt-1">
            Remplissez les champs pertinents selon votre type de cours
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Duration Minutes - Pour cours individuels */}
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-900 mb-2">
              Durée (minutes)
            </label>
            <input
              {...register('duration_minutes', { valueAsNumber: true })}
              type="number"
              id="duration_minutes"
              min="1"
              max="600"
              placeholder="Ex: 90"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Pour un cours simple
            </p>
            {errors.duration_minutes && (
              <p className="text-sm text-red-500 mt-1">{errors.duration_minutes.message}</p>
            )}
          </div>

          {/* Duration Hours - Pour volume horaire total */}
          <div>
            <label htmlFor="duration_hours" className="block text-sm font-medium text-gray-900 mb-2">
              Volume horaire (heures)
            </label>
            <input
              {...register('duration_hours', { valueAsNumber: true })}
              type="number"
              id="duration_hours"
              min="1"
              max="500"
              placeholder="Ex: 36"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Total heures de cours
            </p>
            {errors.duration_hours && (
              <p className="text-sm text-red-500 mt-1">{errors.duration_hours.message}</p>
            )}
          </div>

          {/* Duration Weeks - Pour formations structurées */}
          <div>
            <label htmlFor="duration_weeks" className="block text-sm font-medium text-gray-900 mb-2">
              Durée (semaines)
            </label>
            <input
              {...register('duration_weeks', { valueAsNumber: true })}
              type="number"
              id="duration_weeks"
              min="1"
              max="52"
              placeholder="Ex: 12"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Pour une formation
            </p>
            {errors.duration_weeks && (
              <p className="text-sm text-red-500 mt-1">{errors.duration_weeks.message}</p>
            )}
          </div>
        </div>

        {/* Exemples d'utilisation */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Exemples:</strong> Cours individuel: 90 minutes • Formation structurée: 12 semaines + 36 heures • Combinaison possible
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Conseils pour un bon titre
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Incluez la matière et le niveau</li>
              <li>• Mentionnez l'objectif principal (ex: préparation BAC)</li>
              <li>• Évitez les termes trop génériques</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
