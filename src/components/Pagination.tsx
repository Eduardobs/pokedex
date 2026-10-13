import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber } from '../lib/api'

type PaginationProps = {
  /** One-based current page. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
  live?: boolean
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  className = '',
  live = true,
}: PaginationProps) {
  const { language, t } = useLanguage()
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) return null
  const current = Math.max(1, Math.min(page, pageCount))
  const start = Math.max(2, Math.min(current - 1, pageCount - 3))
  const pages = [1]
  for (let value = start; value <= Math.min(pageCount - 1, start + 2); value++) pages.push(value)
  pages.push(pageCount)
  const controls = [
    { label: t('pagination.first'), target: 1, Icon: ChevronFirst, boundary: current === 1 },
    { label: t('resource.previous'), target: current - 1, Icon: ChevronLeft, boundary: current === 1 },
    { label: t('resource.next'), target: current + 1, Icon: ChevronRight, boundary: current === pageCount },
    { label: t('pagination.last'), target: pageCount, Icon: ChevronLast, boundary: current === pageCount },
  ]
  const renderControl = ({ label, target, Icon, boundary }: (typeof controls)[number]) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      title={label}
      disabled={boundary}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onPageChange(target)
      }}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
  return (
    <nav className={`page-navigation ${className}`} aria-label={t('pagination.label')}>
      <div className="page-navigation-summary" aria-live={live ? 'polite' : undefined} aria-atomic="true">
        <b>{t('resource.page', { page: formatNumber(current, language) })}</b>
        <small>
          {t('resource.range', {
            start: formatNumber((current - 1) * pageSize + 1, language),
            end: formatNumber(Math.min(current * pageSize, total), language),
            total: formatNumber(total, language),
          })}
        </small>
      </div>
      <div className="page-navigation-controls">
        {controls.slice(0, 2).map(renderControl)}
        <div className="page-navigation-numbers">
          {pages.map((value, index) => (
            <Fragment key={value}>
              {index > 0 && value - pages[index - 1] > 1 && <span aria-hidden="true">…</span>}
              <button
                type="button"
                aria-label={t('pagination.goTo', { page: formatNumber(value, language) })}
                aria-current={value === current ? 'page' : undefined}
                aria-disabled={disabled || undefined}
                onClick={() => {
                  if (!disabled && value !== current) onPageChange(value)
                }}
              >
                {formatNumber(value, language)}
              </button>
            </Fragment>
          ))}
        </div>
        {controls.slice(2).map(renderControl)}
      </div>
    </nav>
  )
}
