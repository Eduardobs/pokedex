import { useState } from 'react'
import { Swords } from 'lucide-react'
import { useSearchParamUpdater } from '../hooks/useSearchParamUpdater'
import { useApi } from '../hooks/useApi'
import { useLanguage } from '../contexts/LanguageContext'
import { localizedName, localizedTextResult, prettyName } from '../lib/api'
import {
  comparisonFields,
  moveHistory,
  moveIdentifier,
  moveMetaFields,
  parseComparisonMove,
} from '../lib/move-comparison'
import { record } from '../lib/resource-data'
import { PageHeader } from '../components/PageHeader'
import { SearchField } from '../components/SearchField'
import { ResourceValue, resourceFieldLabel } from '../components/ResourceValue'
import { InlineRetryError } from '../components/FeedbackState'

function ComparisonSlot({
  name,
  side,
  onSelect,
}: {
  name: string
  side: 'firstMove' | 'secondMove'
  onSelect: (value: string) => void
}) {
  const { language, apiLanguage, t } = useLanguage()
  const [query, setQuery] = useState(name)
  const [invalid, setInvalid] = useState(false)
  const identifier = moveIdentifier(name)
  const { data, loading, error, retry } = useApi(identifier ? `move/${identifier}` : null, parseComparisonMove)
  const description = localizedTextResult(data?.effect_entries, ['effect', 'short_effect'], apiLanguage)
  const history = moveHistory(data?.past_values)
  const meta = record(data?.meta)
  const effect = description.text.replace(/\$effect_chance/g, String(data?.effect_chance ?? '—'))
  return (
    <section className="info-card resource-tool">
      <h2>{t(`tools.${side}`)}</h2>
      <form
        className="tool-controls"
        onSubmit={(event) => {
          event.preventDefault()
          const value = moveIdentifier(query)
          setInvalid(!value)
          if (value) onSelect(value)
        }}
      >
        <SearchField
          value={query}
          onChange={setQuery}
          clearLabel={t('common.clear')}
          aria-label={t(`tools.${side}`)}
          placeholder={t('tools.movePrompt')}
        />
        <button type="submit" className="button secondary">
          {t('tools.compare')}
        </button>
      </form>
      {invalid && <p role="alert">{t('tools.invalidMove')}</p>}
      {loading && <p role="status">{t('common.loading')}</p>}
      {error && <InlineRetryError message={t('error.message')} retryLabel={t('common.retry')} onRetry={retry} />}
      {!identifier && <p>{t('tools.movePrompt')}</p>}
      {data && (
        <>
          <h3>{localizedName(data.names, apiLanguage) || prettyName(String(data.name))}</h3>
          <dl className="comparison-fields">
            {comparisonFields.map((key) => (
              <div key={key}>
                <dt>{resourceFieldLabel(key, language)}</dt>
                <dd>
                  <ResourceValue value={data[key]} />
                </dd>
              </div>
            ))}
          </dl>
          <h3>{t('tools.effects')}</h3>
          <p lang={description.language}>{effect || t('tools.noData')}</p>
          {description.fallback && <small className="language-fallback">{t('detail.fallbackLanguage')}</small>}
          <dl className="comparison-fields">
            {moveMetaFields.map((key) => (
              <div key={key}>
                <dt>{resourceFieldLabel(key, language)}</dt>
                <dd>
                  <ResourceValue value={meta[key]} />
                </dd>
              </div>
            ))}
          </dl>
          <h3>{t('tools.history')}</h3>
          <p>{t('tools.historyHint')}</p>
          {history.length ? (
            history.map(({ version, changes }) => (
              <section key={version.name} className="move-history">
                <h4>
                  <ResourceValue value={version} />
                </h4>
                <ResourceValue value={changes} />
              </section>
            ))
          ) : (
            <p>{t('tools.noHistory')}</p>
          )}
        </>
      )}
    </section>
  )
}
export function MoveComparisonPage() {
  const { t } = useLanguage()
  const { searchParams, updateSearchParam } = useSearchParamUpdater()
  const left = searchParams.get('left') ?? ''
  const right = searchParams.get('right') ?? ''
  return (
    <section className="page content-width">
      <PageHeader
        eyebrow={<Swords size={18} />}
        title={t('tools.compare')}
        description={t('tools.compareDescription')}
      />
      <div className="comparison-grid">
        <ComparisonSlot
          key={`left-${left}`}
          name={left}
          side="firstMove"
          onSelect={(value) => updateSearchParam('left', value)}
        />
        <ComparisonSlot
          key={`right-${right}`}
          name={right}
          side="secondMove"
          onSelect={(value) => updateSearchParam('right', value)}
        />
      </div>
    </section>
  )
}
