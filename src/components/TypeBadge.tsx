import { prettyName } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { typeLabelMessages } from '../i18n/messages'
import { TypeIcon } from './TypeIcon'
import type { Language } from '../contexts/LanguageContext'

export const typeLabel = (type: string, language: Language) => {
  const labels = typeLabelMessages[language] as Readonly<Record<string, string>>
  return labels[type] ?? prettyName(type)
}

export function TypeBadge({ type, iconOnly = false }: { type: string; iconOnly?: boolean }) {
  const { language } = useLanguage()
  const label = typeLabel(type, language)
  return (
    <span
      className={`type-badge type-${type}${iconOnly ? ' icon-only' : ''}`}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      <TypeIcon type={type} />
      {!iconOnly && label}
    </span>
  )
}
