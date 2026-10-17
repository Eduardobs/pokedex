import { useLanguage } from '../contexts/LanguageContext'
import { typeLabel } from './TypeBadge'
import { TypeIcon } from './TypeIcon'

export function TeraTypeBadge({ type, iconOnly = false }: { type: string; iconOnly?: boolean }) {
  const { language } = useLanguage()
  const label = typeLabel(type, language)

  return (
    <span
      className={`tera-type-badge type-${type}${iconOnly ? ' icon-only' : ''}`}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      <TypeIcon type={type} />
      {!iconOnly && <span>{label}</span>}
    </span>
  )
}
