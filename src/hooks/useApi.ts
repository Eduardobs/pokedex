import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

export function useApi<T>(pathOrUrl: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(Boolean(pathOrUrl))

  useEffect(() => {
    if (!pathOrUrl) { setLoading(false); return }
    const controller = new AbortController()
    setData(null)
    setLoading(true)
    setError(null)
    apiFetch<T>(pathOrUrl, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== 'AbortError') setError(reason)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [pathOrUrl])

  return { data, error, loading }
}
