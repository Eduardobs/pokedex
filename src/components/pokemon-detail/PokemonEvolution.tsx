import { ArrowRight, GitBranch } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatNumber, localizedApiTerm } from '../../lib/api'
import { evolutionFamilyStats } from '../../lib/evolution-tree'
import type { EvolutionChain } from '../../types'
import { InlineRetryError } from '../FeedbackState'
import { EvolutionTree } from './EvolutionTree'

type Props = {
  chain: EvolutionChain | null
  loading: boolean
  error: boolean
  currentSpecies: string
  retry: () => void
}

function EvolutionFamilyFacts({ chain }: { chain: EvolutionChain }) {
  const { t, language } = useLanguage()
  const stats = evolutionFamilyStats(chain.chain)
  return (
    <dl className="evolution-family-facts">
      {(
        [
          ['evolution.family', stats.pokemon],
          ['evolution.stages', stats.stages],
          ['evolution.outcomes', stats.outcomes],
        ] as const
      ).map(([label, value]) => (
        <div key={label}>
          <dt>{t(label)}</dt>
          <dd>{formatNumber(value, language)}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EvolutionPreview({ chain, onOpen }: { chain: EvolutionChain | null; onOpen: () => void }) {
  const { t } = useLanguage()
  return (
    <article className="info-card evolution-preview">
      <div className="evolution-preview-title">
        <GitBranch size={24} aria-hidden="true" />
        <h2>{t('detail.evolution')}</h2>
      </div>
      <p>{t('evolution.previewDescription')}</p>
      {chain && <EvolutionFamilyFacts chain={chain} />}
      <button className="button secondary" onClick={onOpen}>
        {t('evolution.openFamily')}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </article>
  )
}

export function PokemonEvolution({ chain, loading, error, currentSpecies, retry }: Props) {
  const { t, language } = useLanguage()
  return (
    <article
      className="info-card evolution-workspace"
      role="tabpanel"
      id="panel-evolution"
      aria-labelledby="tab-evolution"
    >
      <header className="evolution-workspace-heading">
        <div>
          <span className="eyebrow">{t('evolution.family')}</span>
          <h2>{t('detail.evolution')}</h2>
          <p>{t('evolution.readingGuide')}</p>
        </div>
        {chain && <EvolutionFamilyFacts chain={chain} />}
      </header>
      {loading ? (
        <p className="muted" role="status">
          {t('common.loading')}
        </p>
      ) : error ? (
        <InlineRetryError message={t('detail.evolutionUnavailable')} retryLabel={t('common.retry')} onRetry={retry} />
      ) : chain ? (
        <>
          <EvolutionTree node={chain.chain} t={t} language={language} currentSpecies={currentSpecies} />
          {!chain.chain.evolves_to.length && <p className="evolution-empty-note">{t('detail.noEvolution')}</p>}
          {chain.baby_trigger_item && (
            <p className="baby-trigger-item">
              {t('evolution.babyTriggerItem', { item: localizedApiTerm(chain.baby_trigger_item.name, language) })}
            </p>
          )}
        </>
      ) : (
        <p className="muted">{t('detail.noEvolution')}</p>
      )}
    </article>
  )
}
