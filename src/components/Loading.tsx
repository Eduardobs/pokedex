import { useLanguage } from '../contexts/LanguageContext'

export function Loading({ label }: { label?: string }) {
  const { t } = useLanguage()
  return (
    <div className="loading" role="status">
      <span className="pokeball-spinner" /> <p>{label ?? t('common.loading')}</p>
    </div>
  )
}

export function CardSkeleton({ count = 8 }: { count?: number }) {
  const { t } = useLanguage()
  return (
    <div className="pokemon-grid" aria-label={t('common.loadingShort')}>
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton card-skeleton" key={index} />
      ))}
    </div>
  )
}
