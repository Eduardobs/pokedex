import { useLanguage } from '../contexts/LanguageContext'
import { localizedTextResult } from '../lib/api'
import { moveHistory, moveMetaFields, parseComparisonMove } from '../lib/move-comparison'
import { record } from '../lib/resource-data'
import { ResourceValue, resourceFieldLabel } from './ResourceValue'

export function MoveComparisonDetails({ data, name }: { data: ReturnType<typeof parseComparisonMove>; name: string }) {
  const { language, apiLanguage, t } = useLanguage()
  const description = localizedTextResult(data.effect_entries, ['effect', 'short_effect'], apiLanguage)
  const history = moveHistory(data.past_values)
  const meta = record(data.meta)
  const effect = description.text.replace(/\$effect_chance/g, String(data.effect_chance ?? '—'))
  return (
    <section className="info-card resource-tool">
      <h2>{name}</h2>
      <details>
        <summary>{t('tools.effects')}</summary>
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
      </details>
      <details>
        <summary>{t('tools.history')}</summary>
        <p>{t('tools.historyHint')}</p>
        {history.length ? (
          history.map(({ version, changes }) => (
            <section key={version.name} className="move-history">
              <h3>
                <ResourceValue value={version} />
              </h3>
              <ResourceValue value={changes} />
            </section>
          ))
        ) : (
          <p>{t('tools.noHistory')}</p>
        )}
      </details>
    </section>
  )
}
