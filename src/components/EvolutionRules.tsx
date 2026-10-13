import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { localizedName, localizedTextResult } from '../lib/api'
import { formatEvolutionExpression } from '../lib/evolution-expression'
import type { EvolutionDetail, NamedResource } from '../types'
import { ResourceValue } from './ResourceValue'
import { InlineRetryError } from './FeedbackState'

function EvolutionVariable({ resource }: { resource: NamedResource }) {
  const { apiLanguage, t } = useLanguage()
  const { data, loading, error, retry } = useApi<Record<string, unknown>>(resource.url)
  const text = localizedTextResult(data?.descriptions, undefined, apiLanguage)
  return (
    <li>
      <ResourceValue value={resource} />
      {loading && <span role="status">{t('common.loading')}</span>}
      {error && <InlineRetryError message={t('error.message')} retryLabel={t('common.retry')} onRetry={retry} />}
      {data && (
        <>
          <strong>
            {typeof data.symbol === 'string' ? data.symbol : ''} · {localizedName(data.names, apiLanguage)}
          </strong>
          <p lang={text.language}>{text.text || t('tools.noData')}</p>
          {text.fallback && <small className="language-fallback">{t('detail.fallbackLanguage')}</small>}
        </>
      )}
    </li>
  )
}

export function EvolutionRules({ detail }: { detail: EvolutionDetail }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const expression = detail.condition_expression
  if (!expression?.expression) return null
  const formatted = formatEvolutionExpression(expression.expression)
  return (
    <details className="evolution-rules" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{t('tools.evolutionRules')}</summary>
      <p>{t('tools.expressionHint')}</p>
      <p>
        {t('tools.expression')}: <code>{formatted ?? expression.expression.slice(0, 2000)}</code>
      </p>
      <ul>
        {open &&
          expression.variables
            ?.slice(0, 20)
            .map((resource) => <EvolutionVariable key={resource.name} resource={resource} />)}
      </ul>
    </details>
  )
}
