'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  description?: string
  session_type: 'group' | 'one_to_one'
  scheduled_at: string
  duration: number
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  classroom?: {
    id: string
    title: string
  }
  student?: {
    id: string
    display_name: string
  }
  participants?: any[]
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'past'>('upcoming')

  useEffect(() => { loadSessions() }, [filter])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('type', filter)
      }

      const response = await fetch(`/api/sessions?${params}`)
      if (!response.ok) throw new Error('Erreur de chargement')

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Load sessions error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      await loadSessions()
      router.push(`/session/${sessionId}`)
    } catch (error: any) {
      alert(error.message || 'Erreur lors du démarrage')
    }
  }

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir terminer cette session ?')) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' })
      })

      if (!response.ok) throw new Error('Erreur')

      await loadSessions()
    } catch (error) {
      alert('Erreur lors de la fin de session')
    }
  }

  const handleCancelSession = async (sessionId: string) => {
    const reason = prompt('Raison de l\'annulation (optionnel):')
    if (reason === null) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason })
      })

      if (!response.ok) throw new Error('Erreur')

      await loadSessions()
    } catch (error) {
      alert('Erreur lors de l\'annulation')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur')

      await loadSessions()
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const isUpcoming = (dateString: string) => new Date(dateString) > new Date()

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && isUpcoming(s.scheduled_at))
  const pastSessions = sessions.filter(s => s.status === 'ended')

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      live: 'bg-red-100 text-red-800 animate-pulse',
      ended: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-yellow-100 text-yellow-800'
    }
    const labels = {
      scheduled: 'Programmée',
      live: 'En direct',
      ended: 'Terminée',
      cancelled: 'Annulée'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Mes Sessions Live</h1>
            <p className="text-gray-600">Gérez vos sessions de cours en direct et vos séances 1-to-1</p>
          </div>
          <Link
            href="/teacher/sessions/new"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Nouvelle Session
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          {(['all', 'upcoming', 'active', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                filter === f
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/50 text-gray-600 hover:bg-white hover:shadow'
              }`}
            >
              {f === 'all' && 'Toutes'}
              {f === 'upcoming' && 'À venir'}
              {f === 'active' && 'En cours'}
              {f === 'past' && 'Passées'}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📅
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{upcomingSessions.length}</p>
                <p className="text-sm text-gray-600">À venir</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{pastSessions.length}</p>
                <p className="text-sm text-gray-600">Terminées</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                ⏱️
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60)}h
                </p>
                <p className="text-sm text-gray-600">Total heures</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune session</h3>
            <p className="text-gray-600 mb-6">Planifiez votre première session live</p>
            <Link
              href="/teacher/sessions/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              Créer une session
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">
                        {session.session_type === 'one_to_one' ? '👥' : '🎓'}
                      </span>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{session.title}</h3>
                        {session.description && (
                          <p className="text-gray-600 mt-1">{session.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(session.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📅</span>
                    <div className="text-sm">
                      <div className="text-gray-600">Date</div>
                      <div className="font-semibold text-gray-900">{formatDate(session.scheduled_at)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏱️</span>
                    <div className="text-sm">
                      <div className="text-gray-600">Durée</div>
                      <div className="font-semibold text-gray-900">{session.duration} min</div>
                    </div>
                  </div>

                  {session.classroom && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📚</span>
                      <div className="text-sm">
                        <div className="text-gray-600">Cours</div>
                        <div className="font-semibold text-gray-900">{session.classroom.title}</div>
                      </div>
                    </div>
                  )}

                  {session.student && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👨‍🎓</span>
                      <div className="text-sm">
                        <div className="text-gray-600">Étudiant</div>
                        <div className="font-semibold text-gray-900">{session.student.display_name}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {session.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => handleStartSession(session.id)}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow hover:shadow-lg"
                      >
                        Démarrer
                      </button>
                      <button
                        onClick={() => handleCancelSession(session.id)}
                        className="px-4 py-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-xl font-semibold transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-colors"
                      >
                        Supprimer
                      </button>
                    </>
                  )}

                  {session.status === 'live' && (
                    <>
                      <button
                        onClick={() => router.push(`/session/${session.id}`)}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow hover:shadow-lg"
                      >
                        Rejoindre
                      </button>
                      <button
                        onClick={() => handleEndSession(session.id)}
                        className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-colors"
                      >
                        Terminer
                      </button>
                    </>
                  )}

                  {(session.status === 'ended' || session.status === 'cancelled') && (
                    <button
                      onClick={() => router.push(`/session/${session.id}`)}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                    >
                      Voir les détails
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}