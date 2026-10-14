import { useState } from 'react'
import { ExternalLink, Sparkles } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { localizedApiTerm } from '../lib/api'
import {
  estimateSpread,
  estimatedRoleKey,
  hasEnoughMoves,
  parseEstimatedMove,
  type EstimatedMove,
} from '../lib/estimated-spread'
import type { CompetitiveFormat, TeamMember, TeamPokemon } from '../lib/teams'
import { InlineRetryError } from './FeedbackState'

export function EstimatedSpreadSuggestion({
  pokemon,
  member,
  competitiveFormat,
  statLabel,
  onApply,
}: {
  pokemon: TeamPokemon
  member: TeamMember
  competitiveFormat: CompetitiveFormat
  statLabel: (stat: string) => string
  onApply: (change: Pick<TeamMember, 'evs' | 'nature'>) => void
}) {
  const { t, language } = useLanguage()
  const [applied, setApplied] = useState(false)
  const ready = hasEnoughMoves(pokemon.name, member.moves)
  const first = useApi(ready && member.moves[0] ? `move/${member.moves[0]}` : null, parseEstimatedMove)
  const second = useApi(ready && member.moves[1] ? `move/${member.moves[1]}` : null, parseEstimatedMove)
  const third = useApi(ready && member.moves[2] ? `move/${member.moves[2]}` : null, parseEstimatedMove)
  const fourth = useApi(ready && member.moves[3] ? `move/${member.moves[3]}` : null, parseEstimatedMove)
  const states = [first, second, third, fourth]
  const selectedStates = states.filter((_, index) => Boolean(member.moves[index]))
  const loading = ready && selectedStates.some((state) => state.loading)
  const error = ready && selectedStates.some((state) => state.error)
  const moves = selectedStates.flatMap((state) => (state.data ? [state.data] : [])) as EstimatedMove[]
  const suggestion = ready && !loading && !error ? estimateSpread(pokemon, member, moves) : null
  const smogonFormat = competitiveFormat.startsWith('doubles-') ? 'doubles' : 'ou'

  return (
    <section className="estimated-spread" aria-labelledby={`estimated-spread-${member.id}`}>
      <div className="estimated-spread-label" id={`estimated-spread-${member.id}`}>
        <Sparkles size={15} aria-hidden="true" />
        {t('teams.estimatedSpread')}
      </div>
      {!ready && <p>{t('teams.estimatedNeedsMoves')}</p>}
      {loading && <p role="status">{t('teams.estimatedLoading')}</p>}
      {error && (
        <InlineRetryError
          message={t('teams.estimatedError')}
          retryLabel={t('common.retry')}
          onRetry={() => selectedStates.forEach((state) => state.retry())}
        />
      )}
      {suggestion && (
        <button
          type="button"
          className="button secondary estimated-spread-button"
          onClick={() => {
            onApply({ evs: suggestion.evs, nature: suggestion.nature })
            setApplied(true)
          }}
        >
          <strong>{t(estimatedRoleKey(suggestion.role))}</strong>
          <span>
            {suggestion.evs
              .map((value, index) =>
                value
                  ? `${value} ${statLabel(['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'][index])}`
                  : '',
              )
              .filter(Boolean)
              .join(' / ')}
          </span>
          <small>
            {t('teams.estimatedNature', {
              nature: localizedApiTerm(suggestion.nature, language),
              increased: statLabel(
                { atk: 'attack', def: 'defense', spa: 'special-attack', spd: 'special-defense', spe: 'speed' }[
                  suggestion.plusStat
                ],
              ),
              decreased: statLabel(
                { atk: 'attack', def: 'defense', spa: 'special-attack', spd: 'special-defense', spe: 'speed' }[
                  suggestion.minusStat
                ],
              ),
            })}
          </small>
        </button>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {applied ? t('teams.estimatedApplied') : ''}
      </span>
      <a
        className="estimated-spread-link"
        href={`https://www.smogon.com/dex/sv/pokemon/${encodeURIComponent(pokemon.name)}/${smogonFormat}/`}
        target="_blank"
        rel="noreferrer"
      >
        {t('teams.openSmogon')}
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </section>
  )
}
