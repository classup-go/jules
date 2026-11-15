import { useEffect, useRef, useState, useCallback } from 'react'
import { UseFormWatch } from 'react-hook-form'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutosaveResult {
  status: AutosaveStatus
  lastSaved: Date | null
  error: string | null
  forceSave: () => Promise<void>
}

export function useAutosave<T>(
  watch: UseFormWatch<T>,
  onSave: (data: T) => Promise<void>,
  options: {
    delay?: number
    enabled?: boolean
  } = {}
): AutosaveResult {
  const { delay = 2000, enabled = true } = options

  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)

  const save = useCallback(async (data: T) => {
    if (isSavingRef.current) return

    try {
      isSavingRef.current = true
      setStatus('saving')
      setError(null)

      await onSave(data)

      setStatus('saved')
      setLastSaved(new Date())

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setStatus('idle')
      }, 3000)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
      console.error('Autosave error:', err)
    } finally {
      isSavingRef.current = false
    }
  }, [onSave])

  const forceSave = useCallback(async () => {
    const subscription = watch((data) => {
      save(data as T)
    })
    subscription.unsubscribe()
  }, [watch, save])

  useEffect(() => {
    if (!enabled) return

    const subscription = watch((data) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        save(data as T)
      }, delay)
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [watch, save, delay, enabled])

  return {
    status,
    lastSaved,
    error,
    forceSave
  }
}
