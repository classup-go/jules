'use client'

import { useEffect, useState } from 'react'
import { ControlBar, useRoomContext } from '@livekit/components-react'

interface TeacherControlBarProps {
  duration: number // Durée en minutes
  onEndSession: () => void
  sessionId: string
}

export default function TeacherControlBar({
  duration,
  onEndSession,
  sessionId
}: TeacherControlBarProps) {
  const [elapsed, setElapsed] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const room = useRoomContext()

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const remaining = Math.max(0, duration * 60 - elapsed)
  const isOvertime = remaining === 0
  const isNearEnd = remaining > 0 && remaining <= 300 // 5 minutes

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndClick = () => {
    setShowEndConfirm(true)
  }

  const confirmEnd = async () => {
    setShowEndConfirm(false)
    await onEndSession()
  }

  const participantCount = room?.numParticipants || 0

  return (
    <div className="space-y-3">
      {/* Timer et info session */}
      <div className="grid grid-cols-2 gap-3">
        {/* Timer */}
        <div
          className={`p-4 rounded-lg text-center ${
            isOvertime
              ? 'bg-red-600 animate-pulse'
              : isNearEnd
              ? 'bg-orange-600'
              : 'bg-blue-600'
          }`}
        >
          <p className="text-white text-xs uppercase font-semibold mb-1">
            {isOvertime ? 'Dépassement' : 'Temps restant'}
          </p>
          <p className="text-white text-2xl font-bold font-mono">
            {isOvertime ? `+${formatTime(elapsed - duration * 60)}` : formatTime(remaining)}
          </p>
        </div>

        {/* Participants */}
        <div className="bg-green-600 p-4 rounded-lg text-center">
          <p className="text-white text-xs uppercase font-semibold mb-1">
            Participants
          </p>
          <p className="text-white text-2xl font-bold">
            {participantCount}
          </p>
        </div>
      </div>

      {/* Contrôles standard LiveKit */}
      <div className="bg-gray-800 rounded-lg p-2">
        <ControlBar
          variation="verbose"
          controls={{
            microphone: true,
            camera: true,
            screenShare: true,
            chat: true,
            leave: false, // On gère le leave via le bouton Terminer
          }}
        />
      </div>

      {/* Bouton Terminer la session */}
      {!showEndConfirm ? (
        <button
          onClick={handleEndClick}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
        >
          <span className="text-xl">🛑</span>
          <span>Terminer la session</span>
        </button>
      ) : (
        <div className="bg-red-900 border-2 border-red-500 p-4 rounded-lg space-y-3">
          <p className="text-white font-semibold text-center">
            Êtes-vous sûr de vouloir terminer la session ?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEndConfirm(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmEnd}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* Note importante */}
      {isNearEnd && !isOvertime && (
        <div className="bg-orange-900/50 border border-orange-500 p-3 rounded-lg">
          <p className="text-orange-200 text-sm text-center">
            ⚠️ La session se termine bientôt
          </p>
        </div>
      )}

      {isOvertime && (
        <div className="bg-red-900/50 border border-red-500 p-3 rounded-lg">
          <p className="text-red-200 text-sm text-center">
            ⚠️ La session a dépassé le temps prévu
          </p>
        </div>
      )}
    </div>
  )
}
