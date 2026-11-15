'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [formData, setFormData] = useState({
    sessionType: 'group' as 'group' | 'one_to_one',
    classroom_id: '',
    student_id: '',
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    duration: 60,
    recordingEnabled: false,
    maxParticipants: 50
  })

  useEffect(() => {
    fetchData()
  }, [formData.sessionType, formData.classroom_id])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user.id)
      setClassrooms(classroomsData || [])

      // Pour 1-to-1, charger les étudiants du cours sélectionné
      if (formData.sessionType === 'one_to_one' && formData.classroom_id) {
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('student:users(id, display_name, email)')
          .eq('classroom_id', formData.classroom_id)
          .eq('status', 'active')

        if (enrollmentsData) {
          setStudents(enrollmentsData.map((e: any) => e.student).filter(Boolean))
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const scheduledAt = new Date(formData.scheduled_date + 'T' + formData.scheduled_time)

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          sessionType: formData.sessionType,
          classroomId: formData.sessionType === 'group' ? formData.classroom_id : null,
          studentId: formData.sessionType === 'one_to_one' ? formData.student_id : null,
          scheduledAt: scheduledAt.toISOString(),
          duration: formData.duration,
          recordingEnabled: formData.recordingEnabled,
          maxParticipants: formData.maxParticipants
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création')
      }

      router.push('/teacher/sessions')
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la création de la session')
      setLoading(false)
    }
  }

  // Generate next 14 days
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return date.toISOString().split('T')[0]
  })

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b flex items-center gap-4 shadow-sm">
        <Link href="/teacher/sessions" className="text-gray-600 hover:text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle Session Live</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Session Type */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-4">Type de session</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, sessionType: 'group', student_id: '' }))}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                formData.sessionType === 'group'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-3">🎓</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Session de groupe</h3>
              <p className="text-sm text-gray-600">Cours en direct avec toute la classe</p>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, sessionType: 'one_to_one', classroom_id: '' }))}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                formData.sessionType === 'one_to_one'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Session 1-to-1</h3>
              <p className="text-sm text-gray-600">Séance individuelle avec un étudiant</p>
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Informations de base</h2>

          {/* Classroom Selection (always shown) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Cours * {formData.sessionType === 'one_to_one' && <span className="text-gray-500 font-normal">(pour sélectionner l'étudiant)</span>}
            </label>
            <select
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.classroom_id}
              onChange={(e) => setFormData(prev => ({ ...prev, classroom_id: e.target.value, student_id: '' }))}
            >
              <option value="">Sélectionner un cours</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Student Selection (1-to-1 only) */}
          {formData.sessionType === 'one_to_one' && formData.classroom_id && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Étudiant *</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.student_id}
                onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
              >
                <option value="">Sélectionner un étudiant</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name} ({s.email})</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Titre de la session *</label>
            <input
              type="text"
              required
              placeholder="Ex: Révision Chapitre 3"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description (optionnel)</label>
            <textarea
              rows={3}
              placeholder="Décrivez le contenu de la session..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Planification</h2>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">📅 Date *</label>
            <div className="grid grid-cols-4 gap-2">
              {availableDates.map((date) => {
                const d = new Date(date)
                const isSelected = formData.scheduled_date === date
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, scheduled_date: date }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs text-gray-600">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                    <p className="text-lg font-bold text-gray-900">{d.getDate()}</p>
                    <p className="text-xs text-gray-600">{d.toLocaleDateString('fr-FR', { month: 'short' })}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">🕐 Heure *</label>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => {
                const isSelected = formData.scheduled_time === time
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, scheduled_time: time }))}
                    className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">⏱️ Durée *</label>
            <div className="grid grid-cols-5 gap-3">
              {[30, 45, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, duration: d }))}
                  className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                    formData.duration === d
                      ? 'border-green-600 bg-green-50 text-green-600'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Options</h2>

          {/* Recording */}
          <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.recordingEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, recordingEnabled: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="font-semibold text-gray-900">Enregistrer la session</p>
              <p className="text-sm text-gray-600">L'enregistrement sera disponible après la session</p>
            </div>
          </label>

          {/* Max Participants (group only) */}
          {formData.sessionType === 'group' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Nombre maximum de participants</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.maxParticipants}
                onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
              >
                <option value={10}>10 participants</option>
                <option value={25}>25 participants</option>
                <option value={50}>50 participants</option>
                <option value={100}>100 participants</option>
              </select>
            </div>
          )}
        </div>

        {/* Summary */}
        {formData.scheduled_date && formData.scheduled_time && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">📋</span> Récapitulatif
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2">
                <span className="text-lg">{formData.sessionType === 'one_to_one' ? '👥' : '🎓'}</span>
                <strong>{formData.sessionType === 'one_to_one' ? 'Session 1-to-1' : 'Session de groupe'}</strong>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                {new Date(formData.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="flex items-center gap-2">
                <span className="text-lg">🕐</span>
                {formData.scheduled_time} ({formData.duration} minutes)
              </p>
              {formData.title && (
                <p className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  {formData.title}
                </p>
              )}
              {formData.recordingEnabled && (
                <p className="flex items-center gap-2 text-red-600">
                  <span className="text-lg">🔴</span>
                  <strong>Session enregistrée</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Link
            href="/teacher/sessions"
            className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors text-center"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.scheduled_date || !formData.scheduled_time ||
                     (formData.sessionType === 'group' ? !formData.classroom_id : !formData.student_id)}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Création...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">📹</span>
                Planifier la session
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}