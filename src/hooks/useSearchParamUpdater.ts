import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useSearchParamUpdater(onUpdate?: () => void) {
  const [searchParams, setSearchParams] = useSearchParams()

  const updateSearchParam = useCallback(
    (name: string, value: string, defaultValue = '') => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (!value || value === defaultValue) next.delete(name)
          else next.set(name, value)
          return next
        },
        { replace: true },
      )
      onUpdate?.()
    },
    [onUpdate, setSearchParams],
  )

  const clearSearchParams = useCallback(() => {
    setSearchParams({}, { replace: true })
    onUpdate?.()
  }, [onUpdate, setSearchParams])

  return { searchParams, updateSearchParam, clearSearchParams }
}
