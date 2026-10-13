import { useEffect, useState } from 'react'
import { loadTypeHistory, type HistoricalType } from '../lib/type-history'

export function useTypeHistory(enabled: boolean) {
  const [data, setData] = useState<HistoricalType[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setData(null)
    setError(false)
    loadTypeHistory(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true)
          controller.abort()
        }
      })
    return () => controller.abort()
  }, [enabled, attempt])
  return { data, error, loading: enabled && !data && !error, retry: () => setAttempt((value) => value + 1) }
}
