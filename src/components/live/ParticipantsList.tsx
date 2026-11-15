'use client'

import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import { Participant } from 'livekit-client'

interface ParticipantsListProps {
  isTeacher?: boolean
}

export default function ParticipantsList({ isTeacher = false }: ParticipantsListProps) {
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()

  const getParticipantRole = (participant: Participant) => {
    try {
      const metadata = JSON.parse(participant.metadata || '{}')
      return metadata.is_teacher ? 'Professeur' : 'Étudiant'
    } catch {
      return 'Participant'
    }
  }

  const getParticipantName = (participant: Participant) => {
    return participant.name || participant.identity.substring(0, 8)
  }

  const isAudioEnabled = (participant: Participant) => {
    return participant.isMicrophoneEnabled
  }

  const isVideoEnabled = (participant: Participant) => {
    return participant.isCameraEnabled
  }

  const isScreenSharing = (participant: Participant) => {
    return participant.isScreenShareEnabled
  }

  return (
    <div className="h-full bg-gray-800 border-l border-gray-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span>👥</span>
          <span>Participants ({participants.length})</span>
        </h3>
      </div>

      {/* Liste des participants */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((participant) => {
          const isLocal = participant.identity === localParticipant.localParticipant.identity
          const role = getParticipantRole(participant)
          const name = getParticipantName(participant)
          const audioOn = isAudioEnabled(participant)
          const videoOn = isVideoEnabled(participant)
          const screenShare = isScreenSharing(participant)

          return (
            <div
              key={participant.identity}
              className={`p-3 rounded-lg ${
                isLocal
                  ? 'bg-blue-900/50 border border-blue-500'
                  : 'bg-gray-700/50 hover:bg-gray-700'
              }`}
            >
              {/* Info participant */}
              <div className="flex items-center gap-3 mb-2">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    role === 'Professeur'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                  }`}
                >
                  {name.charAt(0).toUpperCase()}
                </div>

                {/* Nom et rôle */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {name}
                    {isLocal && <span className="text-blue-400 ml-2">(Vous)</span>}
                  </p>
                  <p className="text-gray-400 text-xs">{role}</p>
                </div>

                {/* Statut connexion */}
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>

              {/* Indicateurs média */}
              <div className="flex items-center gap-2">
                {/* Micro */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    audioOn
                      ? 'bg-green-600/30 text-green-300'
                      : 'bg-red-600/30 text-red-300'
                  }`}
                >
                  <span>{audioOn ? '🎤' : '🔇'}</span>
                  <span>{audioOn ? 'Actif' : 'Muet'}</span>
                </div>

                {/* Caméra */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    videoOn
                      ? 'bg-green-600/30 text-green-300'
                      : 'bg-gray-600/30 text-gray-400'
                  }`}
                >
                  <span>{videoOn ? '📹' : '📷'}</span>
                  <span>{videoOn ? 'On' : 'Off'}</span>
                </div>

                {/* Partage d'écran */}
                {screenShare && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-600/30 text-purple-300">
                    <span>🖥️</span>
                    <span>Écran</span>
                  </div>
                )}
              </div>

              {/* Actions professeur (optionnel - pour plus tard) */}
              {isTeacher && !isLocal && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="flex gap-2">
                    {/* Placeholder pour futures actions: mute, kick, etc. */}
                    {/* À implémenter avec LiveKit server API */}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {participants.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucun participant</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {isTeacher && (
        <div className="p-3 border-t border-gray-700 bg-gray-900/50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-gray-400 text-xs">Total</p>
              <p className="text-white font-bold">{participants.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Micros</p>
              <p className="text-white font-bold">
                {participants.filter(p => isAudioEnabled(p)).length}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Caméras</p>
              <p className="text-white font-bold">
                {participants.filter(p => isVideoEnabled(p)).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
