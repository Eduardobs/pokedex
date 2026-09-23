import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(() => window.scrollY > 0)
  const { t } = useLanguage()

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 0)

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateVisibility)
  }, [])

  if (!isVisible) return null

  const label = t('common.backToTop')

  return (
    <button
      className="scroll-to-top"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const prefersReducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches

        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
        document.querySelector<HTMLElement>('.brand')?.focus({ preventScroll: true })
      }}
    >
      <ArrowUp size={22} aria-hidden="true" />
    </button>
  )
}
