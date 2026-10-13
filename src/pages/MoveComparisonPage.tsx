import { Swords } from 'lucide-react'
import { useSearchParamUpdater } from '../hooks/useSearchParamUpdater'
import { useApi } from '../hooks/useApi'
import { useLanguage } from '../contexts/LanguageContext'
import { localizedName, prettyName } from '../lib/api'
import { comparisonFields, moveIdentifier, parseComparisonMove } from '../lib/move-comparison'
import { PageHeader } from '../components/PageHeader'
import { MovePicker } from '../components/MovePicker'
import { MoveComparisonDetails } from '../components/MoveComparisonDetails'
import { ResourceValue, resourceFieldLabel } from '../components/ResourceValue'
import { InlineRetryError } from '../components/FeedbackState'

export function MoveComparisonPage() {
  const { t, language, apiLanguage } = useLanguage()
  const { searchParams, updateSearchParam } = useSearchParamUpdater()
  const left = searchParams.get('left') ?? ''
  const right = searchParams.get('right') ?? ''
  const leftId = moveIdentifier(left),
    rightId = moveIdentifier(right)
  const first = useApi(leftId ? `move/${leftId}` : null, parseComparisonMove)
  const second = useApi(rightId ? `move/${rightId}` : null, parseComparisonMove)
  const nameFor = (data: ReturnType<typeof parseComparisonMove> | null, fallback: string) =>
    data ? localizedName(data.names, apiLanguage) || prettyName(String(data.name)) : fallback
  const firstName = nameFor(first.data, t('tools.firstMove'))
  const secondName = nameFor(second.data, t('tools.secondMove'))
  return (
    <section className="page content-width">
      <PageHeader
        eyebrow={<Swords size={18} />}
        title={t('tools.compare')}
        description={t('tools.compareDescription')}
      />
      <div className="comparison-grid">
        <MovePicker name={left} label={t('tools.firstMove')} onSelect={(value) => updateSearchParam('left', value)} />
        <MovePicker
          name={right}
          label={t('tools.secondMove')}
          onSelect={(value) => updateSearchParam('right', value)}
        />
      </div>
      <div className="comparison-feedback">
        {(first.loading || second.loading) && <p role="status">{t('common.loading')}</p>}
        {first.error && (
          <InlineRetryError
            message={`${firstName}: ${t('error.message')}`}
            retryLabel={t('common.retry')}
            onRetry={first.retry}
          />
        )}
        {second.error && (
          <InlineRetryError
            message={`${secondName}: ${t('error.message')}`}
            retryLabel={t('common.retry')}
            onRetry={second.retry}
          />
        )}
      </div>
      {(first.data || second.data) && (
        <>
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <caption>{t('ui.attributeComparison')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('ui.attribute')}</th>
                  <th scope="col">{firstName}</th>
                  <th scope="col">{secondName}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFields.map((key) => {
                  const different =
                    first.data && second.data && JSON.stringify(first.data[key]) !== JSON.stringify(second.data[key])
                  return (
                    <tr key={key} className={different ? 'comparison-different' : undefined}>
                      <th scope="row">
                        {resourceFieldLabel(key, language)} {different && <small>{t('ui.different')}</small>}
                      </th>
                      {[first.data, second.data].map((data, index) => (
                        <td key={index}>
                          {data ? (
                            key === 'accuracy' && typeof data[key] === 'number' ? (
                              `${data[key]}%`
                            ) : (
                              <ResourceValue value={data[key]} />
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="comparison-grid">
            {first.data && <MoveComparisonDetails data={first.data} name={firstName} />}
            {second.data && <MoveComparisonDetails data={second.data} name={secondName} />}
          </div>
        </>
      )}
    </section>
  )
}
