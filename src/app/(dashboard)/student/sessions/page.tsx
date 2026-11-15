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
  teacher: {
    id: string
    display_name: string
    avatar_url?: string
  }
  classroom?: {
    id: string
    title: string
  }
  participants?: any[]
}

export default function StudentSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'past'>('upcoming')

  useEffect(() => {
    loadSessions()

    // Auto-refresh toutes les 10 secondes pour détecter les sessions qui démarrent
    const interval = setInterval(() => {
      loadSessions()
    }, 10000)

    return () => clearInterval(interval)
  }, [filter])

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('type', filter)
      }

      const response = await fetch(`/api/sessions?${params}`)

      if (response.status === 401) {
        setError('Vous devez être connecté pour voir vos sessions')
        router.push('/auth/login')
        return
      }

      if (response.status === 403) {
        setError('Accès refusé')
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur de chargement')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error: any) {
      console.error('Load sessions error:', error)
      setError(error.message || 'Impossible de charger les sessions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      scheduled: {
        style: 'bg-blue-100 text-blue-800',
        icon: '📅',
        label: 'Programmée'
      },
      live: {
        style: 'bg-red-100 text-red-800 animate-pulse',
        icon: '🔴',
        label: 'En direct'
      },
      ended: {
        style: 'bg-green-100 text-green-800',
        icon: '✅',
        label: 'Terminée'
      },
      cancelled: {
        style: 'bg-orange-100 text-orange-800',
        icon: '❌',
        label: 'Annulée'
      }
    }

    const current = config[status as keyof typeof config]
    if (!current) return null

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${current.style}`}>
        <span>{current.icon}</span>
        <span>{current.label}</span>
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short'
    })
  }

  const isUpcoming = (dateString: string) => new Date(dateString) > new Date()
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && isUpcoming(s.scheduled_at))
  const liveSessions = sessions.filter(s => s.status === 'live')

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Mes Sessions Live</h1>
          <p className="text-gray-600">Participez aux cours en direct et aux séances 1-to-1</p>
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

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-red-800 font-semibold">{error}</p>
                <button
                  onClick={() => {
                    setError('')
                    loadSessions()
                  }}
                  className="text-sm text-red-600 hover:text-red-800 underline mt-1"
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                🔴
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{liveSessions.length}</p>
                <p className="text-sm text-gray-600">En direct</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {sessions.filter(s => s.status === 'ended').length}
                </p>
                <p className="text-sm text-gray-600">Terminées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Sessions Alert */}
        {liveSessions.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
                <span className="text-2xl">🔴</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Session en direct</h3>
                <p className="opacity-90">{liveSessions.length} session(s) en cours</p>
              </div>
            </div>
            <div className="space-y-3">
              {liveSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/session/${session.id}`)}
                  className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 transition-all flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-bold text-white">{session.title}</p>
                    <p className="text-sm text-white/80">
                      {session.teacher.display_name} • {session.classroom?.title || 'Session 1-to-1'}
                    </p>
                  </div>
                  <span className="px-4 py-2 bg-white text-red-600 rounded-lg font-bold">
                    Rejoindre
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune session</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'upcoming' && "Vous n'avez pas de sessions programmées"}
              {filter === 'active' && "Aucune session en cours"}
              {filter === 'past' && "Aucune session terminée"}
              {filter === 'all' && "Vous n'êtes inscrit à aucune session"}
            </p>
            <Link
              href="/student/my-courses"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              Voir mes cours
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {sessions.filter(s => s.status !== 'live').map((session) => (
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👨‍🏫</span>
                    <div className="text-sm">
                      <div className="text-gray-600">Professeur</div>
                      <div className="font-semibold text-gray-900">{session.teacher.display_name}</div>
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

                  <div className="flex items-center gap-2">
                    <span className="text-xl">📅</span>
                    <div className="text-sm">
                      <div className="text-gray-600">Date et heure</div>
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

                  {session.status === 'live' && session.participants && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👥</span>
                      <div className="text-sm">
                        <div className="text-gray-600">Participants</div>
                        <div className="font-semibold text-gray-900">
                          {session.participants.filter((p: any) => !p.left_at).length} connecté(s)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {session.status === 'scheduled' && (
                    <button
                      onClick={() => router.push(`/session/${session.id}`)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow hover:shadow-lg"
                    >
                      Voir les détails
                    </button>
                  )}

                  {session.status === 'live' && (
                    <button
                      onClick={() => router.push(`/session/${session.id}`)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl animate-pulse"
                    >
                      Rejoindre maintenant
                    </button>
                  )}

                  {session.status === 'ended' && (
                    <button
                      onClick={() => router.push(`/session/${session.id}`)}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                    >
                      Voir le résumé
                    </button>
                  )}

                  {session.status === 'cancelled' && (
                    <div className="flex-1 px-4 py-3 bg-yellow-50 text-yellow-700 rounded-xl font-semibold text-center">
                      Session annulée
                    </div>
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
