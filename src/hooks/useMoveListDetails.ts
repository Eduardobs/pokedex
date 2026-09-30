import { useCallback, useEffect, useState } from 'react'
import type { NamedResource } from '../types'
import { fetchMoveListDetails, type MoveListDetails } from '../lib/move-catalog'

type MoveDetailsState = {
  key: string
  data: MoveListDetails | null
  error: Error | null
  loading: boolean
}

function moveIds(resources: Array<NamedResource | { url: string }>) {
  return resources.flatMap((resource) => {
    const rawId = resource.url.split('/').filter(Boolean).at(-1) ?? ''
    const id = /^\d+$/.test(rawId) ? Number(rawId) : 0
    return Number.isSafeInteger(id) && id > 0 ? [id] : []
  })
}

export function useMoveListDetails(
  resources: Array<NamedResource | { url: string }>,
  apiLanguage: 'pt-br' | 'en' | 'es',
) {
  const [retryCount, setRetryCount] = useState(0)
  const idsKey = moveIds(resources).join(',')
  const key = idsKey ? `${apiLanguage}:${idsKey}` : ''
  const [state, setState] = useState<MoveDetailsState>({ key, data: null, error: null, loading: Boolean(key) })

  useEffect(() => {
    if (!key) {
      setState({ key, data: null, error: null, loading: false })
      return
    }

    const controller = new AbortController()
    const ids = idsKey.split(',').map(Number)
    setState({ key, data: null, error: null, loading: true })
    fetchMoveListDetails(ids, apiLanguage, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, error: null, loading: false })
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== 'AbortError' && !controller.signal.aborted) {
          setState({ key, data: null, error: reason, loading: false })
        }
      })
    return () => controller.abort()
  }, [apiLanguage, idsKey, key, retryCount])

  const retry = useCallback(() => setRetryCount((value) => value + 1), [])
  if (state.key !== key) return { data: null, error: null, loading: Boolean(key), retry }
  return { data: state.data, error: state.error, loading: state.loading, retry }
}
