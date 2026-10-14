import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInfiniteScroll } from './useInfiniteScroll'

export function useProgressiveList<T>(items: T[], resetKey: string, batchSize = 6, enabled = true) {
  const [limit, setLimit] = useState(batchSize)

  useEffect(() => setLimit(batchSize), [batchSize, resetKey])

  const hasMore = limit < items.length
  const loadMore = useCallback(
    () => setLimit((value) => Math.min(value + batchSize, items.length)),
    [batchSize, items.length],
  )
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: enabled && hasMore,
    onLoadMore: loadMore,
    observationKey: `${enabled}:${resetKey}:${limit}:${items.length}`,
    rootMargin: '80px 0px',
  })

  return {
    visible: useMemo(() => items.slice(0, limit), [items, limit]),
    hasMore,
    loadMore,
    sentinelRef,
  }
}
