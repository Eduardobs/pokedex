import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchPokemonCardDetails, type PokemonCardDetails } from '../lib/pokemon-card-catalog'

export function usePokemonCardDetails(names: string[], kind: 'pokemon' | 'form') {
  const key = names.join(',')
  const stableNames = useMemo(() => (key ? key.split(',') : []), [key])
  const [data, setData] = useState<Record<string, PokemonCardDetails>>({})
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (stableNames.length === 0) return
    const controller = new AbortController()
    setError(null)
    setLoading(true)
    fetchPokemonCardDetails(stableNames, kind, controller.signal)
      .then((details) => {
        if (!controller.signal.aborted) setData((current) => ({ ...current, ...details }))
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== 'AbortError' && !controller.signal.aborted) setError(reason)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [kind, retryToken, stableNames])

  const retry = useCallback(() => setRetryToken((value) => value + 1), [])
  return { data, error, loading, retry }
}
