'use client'

import { AutosaveStatus } from '@/hooks/useAutosave'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AutosaveIndicatorProps {
  status: AutosaveStatus
  lastSaved: Date | null
  error: string | null
  onRetry?: () => void
}

export function AutosaveIndicator({ status, lastSaved, error, onRetry }: AutosaveIndicatorProps) {
  if (status === 'idle' && !lastSaved) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-yellow-700">Enregistrement...</span>
        </>
      )}

      {status === 'saved' && lastSaved && (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-green-500">
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-green-700">
            Enregistré {formatDistanceToNow(lastSaved, { addSuffix: true, locale: fr })}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-500">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="M8 4V8M8 10.5V11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-red-700">
            {error || 'Erreur d\'enregistrement'}
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Réessayer
            </button>
          )}
        </>
      )}
    </div>
  )
}
