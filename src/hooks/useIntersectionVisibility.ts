import { useEffect, useRef, useState } from 'react'

export function useIntersectionVisibility<T extends Element>(
  initiallyVisible = false,
  rootMargin = '200px',
) {
  const targetRef = useRef<T>(null)
  const [visible, setVisible] = useState(initiallyVisible)

  useEffect(() => {
    const target = targetRef.current
    if (!target || visible) return
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [rootMargin, visible])

  return { targetRef, visible }
}
