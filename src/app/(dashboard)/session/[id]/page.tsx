'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LiveRoom from '@/components/live/LiveRoom'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function SessionPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [canModify, setCanModify] = useState(false)
  const [inRoom, setInRoom] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    loadSession()
  }, [id])

  const loadSession = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sessions/${id}`)

      if (response.status === 403) {
        const error = await response.json()
        setError(error.error || 'Accès refusé à cette session')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur de chargement')
      }

      const data = await response.json()
      setSession(data.session)
      setCurrentUserRole(data.currentUserRole || '')
      setCanModify(data.canModify || false)
    } catch (err: any) {
      console.error('Session load error:', err)
      setError(err.message || 'Impossible de charger la session')
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = async () => {
    try {
      setStarting(true)
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors du démarrage')
      }

      // Recharger la session
      await loadSession()

      // Entrer directement dans la room
      setInRoom(true)
    } catch (err: any) {
      console.error('Start session error:', err)
      alert(err.message || 'Impossible de démarrer la session')
    } finally {
      setStarting(false)
    }
  }

  const handleJoinSession = () => {
    setInRoom(true)
  }

  const handleLeaveSession = () => {
    setInRoom(false)
    // Redirection selon le rôle
    if (currentUserRole === 'teacher') {
      router.push('/teacher/sessions')
    } else {
      router.push('/student/sessions')
    }
  }

  const handleEndSession = () => {
    // Après la fin de session, rediriger
    if (currentUserRole === 'teacher') {
      router.push('/teacher/sessions')
    } else {
      router.push('/student/sessions')
    }
  }

  const isTeacher = currentUserRole === 'teacher'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isAccessDenied = error.includes('Accès refusé') || error.includes('inscrit')

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-6xl mb-4">{isAccessDenied ? '🔒' : '❌'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isAccessDenied ? 'Accès Refusé' : 'Erreur'}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>

          {isAccessDenied && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl text-left">
              <p className="text-sm text-blue-800 mb-2">
                💡 Pour accéder à cette session, vous devez être inscrit au cours correspondant.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Retour
            </button>
            {isAccessDenied && (
              <button
                onClick={() => router.push('/student/my-courses')}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Voir mes cours
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const roomName = session.room_id || session.livekit_room || `session_${session.id}`

  // PROFESSEUR + LIVE: Entrer directement dans la room
  if (isTeacher && session.status === 'live' && !inRoom) {
    setInRoom(true)
  }

  // Dans la room
  if (inRoom) {
    return (
      <LiveRoom
        sessionId={session.id}
        roomName={roomName}
        isTeacher={isTeacher}
        sessionDuration={session.duration}
        onLeave={handleLeaveSession}
        onEndSession={handleEndSession}
      />
    )
  }

  // PROFESSEUR + SCHEDULED: Page de préparation
  if (isTeacher && session.status === 'scheduled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Préparez votre session
            </h1>
            <p className="text-gray-600">{session.title}</p>
          </div>

          <SessionInfoCards session={session} />

          <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>👨‍🏫</span>
              <span>Contrôles Professeur</span>
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Gérez les participants en temps réel</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Contrôlez les micros et caméras</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Partagez votre écran avec les étudiants</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Terminez la session quand vous voulez</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleStartSession}
              disabled={starting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {starting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Démarrage...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Démarrer la session</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ÉTUDIANT + SCHEDULED: Message d'attente
  if (!isTeacher && session.status === 'scheduled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Session programmée
            </h1>
            <p className="text-gray-600">{session.title}</p>
          </div>

          <SessionInfoCards session={session} />

          <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl text-center">
            <p className="text-blue-800 font-semibold mb-2">
              Le professeur n'a pas encore démarré la session
            </p>
            <p className="text-blue-600 text-sm">
              Vous pourrez rejoindre dès que {session.teacher?.display_name} lancera la session
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={() => router.back()}
              className="w-full px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ÉTUDIANT + LIVE: Lobby puis rejoindre
  if (!isTeacher && session.status === 'live') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {session.session_type === 'one_to_one' ? '👥' : '🎓'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {session.title}
            </h1>
            {session.description && (
              <p className="text-gray-600">{session.description}</p>
            )}
          </div>

          <SessionInfoCards session={session} />

          <div className="mt-6 p-4 bg-red-50 rounded-xl border-2 border-red-500 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔴</span>
              <div>
                <div className="font-bold text-red-600">SESSION EN DIRECT</div>
                <div className="text-sm text-red-600">
                  {session.participants?.filter((p: any) => !p.left_at).length || 0} participant(s) connecté(s)
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleJoinSession}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span>🎥</span>
              <span>Rejoindre la session</span>
            </button>
          </div>

          <TechnicalRequirements />
        </div>
      </div>
    )
  }

  // SESSION TERMINÉE ou ANNULÉE
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            {session.status === 'ended' ? '✅' : '❌'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {session.status === 'ended' ? 'Session terminée' : 'Session annulée'}
          </h1>
          <p className="text-gray-600">{session.title}</p>
        </div>

        <SessionInfoCards session={session} />

        <div className="mt-8">
          <button
            onClick={() => router.back()}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  )
}

// Composant pour afficher les infos de session
function SessionInfoCards({ session }: { session: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
        <span className="text-2xl">👨‍🏫</span>
        <div>
          <div className="text-sm text-gray-600">Professeur</div>
          <div className="font-semibold text-gray-900">
            {session.teacher?.display_name}
          </div>
        </div>
      </div>

      {session.classroom && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
          <span className="text-2xl">📚</span>
          <div>
            <div className="text-sm text-gray-600">Cours</div>
            <div className="font-semibold text-gray-900">
              {session.classroom.title}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl">
        <span className="text-2xl">⏱️</span>
        <div>
          <div className="text-sm text-gray-600">Durée</div>
          <div className="font-semibold text-gray-900">
            {session.duration} minutes
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <span className="text-2xl">📅</span>
        <div>
          <div className="text-sm text-gray-600">Programmée pour</div>
          <div className="font-semibold text-gray-900">
            {new Date(session.scheduled_at).toLocaleString('fr-FR', {
              dateStyle: 'full',
              timeStyle: 'short'
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant pour les prérequis techniques
function TechnicalRequirements() {
  return (
    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
      <div className="flex items-start gap-3">
        <span className="text-xl">💡</span>
        <div className="text-sm text-yellow-800">
          <p className="font-semibold mb-1">Prérequis techniques</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Autorisez l'accès à votre caméra et microphone</li>
            <li>Utilisez une connexion internet stable</li>
            <li>Utilisez Chrome, Firefox ou Safari pour une meilleure expérience</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
