import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'

type ApiState<T> = {
  pathOrUrl: string | null
  data: T | null
  error: Error | null
  loading: boolean
}

export function useApi<T>(pathOrUrl: string | null, parse?: (value: unknown) => T) {
  const [retryCount, setRetryCount] = useState(0)
  const parseRef = useRef(parse)
  const [state, setState] = useState<ApiState<T>>({
    pathOrUrl,
    data: null,
    error: null,
    loading: Boolean(pathOrUrl),
  })

  useEffect(() => {
    parseRef.current = parse
  }, [parse])

  useEffect(() => {
    if (!pathOrUrl) {
      setState({ pathOrUrl, data: null, error: null, loading: false })
      return
    }
    const controller = new AbortController()
    setState({ pathOrUrl, data: null, error: null, loading: true })
    apiFetch<unknown>(pathOrUrl, controller.signal)
      .then((value) => {
        const data = parseRef.current ? parseRef.current(value) : value as T
        if (!controller.signal.aborted) setState({ pathOrUrl, data, error: null, loading: false })
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== 'AbortError' && !controller.signal.aborted) {
          setState({ pathOrUrl, data: null, error: reason, loading: false })
        }
      })
    return () => controller.abort()
  }, [pathOrUrl, retryCount])

  const retry = useCallback(() => setRetryCount((value) => value + 1), [])

  if (state.pathOrUrl !== pathOrUrl) {
    return { data: null, error: null, loading: Boolean(pathOrUrl), retry }
  }

  return { data: state.data, error: state.error, loading: state.loading, retry }
}
