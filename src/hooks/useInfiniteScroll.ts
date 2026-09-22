import { useEffect, useRef } from 'react'

type Options = {
  enabled: boolean
  onLoadMore: () => void
  observationKey?: unknown
  rootMargin?: string
}

export function useInfiniteScroll<T extends Element>({
  enabled,
  onLoadMore,
  observationKey,
  rootMargin = '300px 0px',
}: Options) {
  const sentinelRef = useRef<T>(null)

  useEffect(() => {
    const target = sentinelRef.current
    if (!target || !enabled || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        onLoadMore()
      },
      { rootMargin },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, observationKey, onLoadMore, rootMargin])

  return sentinelRef
}
