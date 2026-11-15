'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  Chat,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'
import TeacherControlBar from './TeacherControlBar'
import ParticipantsList from './ParticipantsList'

interface LiveRoomProps {
  sessionId: string
  roomName: string
  isTeacher: boolean
  sessionDuration: number // en minutes
  onLeave?: () => void
  onEndSession?: () => void // Pour le professeur qui termine la session
}

export default function LiveRoom({
  sessionId,
  roomName,
  isTeacher,
  sessionDuration,
  onLeave,
  onEndSession
}: LiveRoomProps) {
  const router = useRouter()
  const [token, setToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchToken()
  }, [sessionId, roomName])

  const fetchToken = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, roomName })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur de connexion')
      }

      const data = await response.json()
      setToken(data.token)
    } catch (err: any) {
      console.error('Token fetch error:', err)
      setError(err.message || 'Impossible de se connecter à la session')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    // Enregistrer la déconnexion
    try {
      await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST'
      })
    } catch (err) {
      console.error('Leave session error:', err)
    }

    if (onLeave) {
      onLeave()
    } else {
      router.back()
    }
  }

  const handleEndSession = async () => {
    // Terminer la session (professeur seulement)
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la fin de la session')
      }

      // Enregistrer la déconnexion
      await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST'
      })

      // Callback ou redirection
      if (onEndSession) {
        onEndSession()
      } else if (onLeave) {
        onLeave()
      } else {
        router.push('/teacher/sessions')
      }
    } catch (err) {
      console.error('End session error:', err)
      alert('Erreur lors de la fin de la session')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Connexion à la session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Erreur de connexion</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  if (!token) {
    return null
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''

  return (
    <div className="h-screen bg-gray-900">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnect}
        style={{ height: '100%' }}
        data-lk-theme="default"
      >
        <div className="flex h-full">
          {/* Main video area */}
          <div className="flex-1 flex flex-col">
            {/* Video Grid */}
            <div className="flex-1 p-4 overflow-auto">
              <MyVideoConference />
            </div>

            {/* Control Bar - Différencié selon le rôle */}
            <div className="p-4 bg-gray-800">
              {isTeacher ? (
                <TeacherControlBar
                  duration={sessionDuration}
                  onEndSession={handleEndSession}
                  sessionId={sessionId}
                />
              ) : (
                <ControlBar
                  variation="verbose"
                  controls={{
                    microphone: true,
                    camera: true,
                    screenShare: true,
                    chat: true,
                    leave: true,
                  }}
                />
              )}
            </div>
          </div>

          {/* Sidebar - Participants (professeur) ou Chat (étudiant) */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-hidden flex flex-col">
            {isTeacher ? (
              <>
                <ParticipantsList isTeacher={true} />
                <div className="h-64 border-t border-gray-700">
                  <Chat />
                </div>
              </>
            ) : (
              <Chat />
            )}
          </div>
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <GridLayout tracks={tracks} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  )
}
