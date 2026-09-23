import { GraduationCap, Search, Shapes } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useApi } from '../../hooks/useApi'
import { normalizeSearchText } from '../../lib/api'
import { groupMovesByLearningMethod } from '../../lib/move-learning'
import { BATTLE_TYPES, type BattleType } from '../../lib/type-chart'
import type { Pokemon, PokemonType } from '../../types'
import { EmptyState, InlineRetryError } from '../FeedbackState'
import { MoveCard, moveLearningMethodLabel } from '../MoveCard'
import { SearchField } from '../SearchField'
import { SelectMenu } from '../SelectMenu'
import { DamageClassBadge } from '../SemanticBadges'
import { typeLabel } from '../TypeBadge'

type PokemonMovesTabProps = {
  active: boolean
  pokemon: Pokemon
}

export function PokemonMovesTab({ active, pokemon }: PokemonMovesTabProps) {
  const { language, t } = useLanguage()
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('all')
  const [type, setType] = useState<BattleType | 'all'>('all')
  const deferredQuery = useDeferredValue(query)
  const {
    data: selectedType,
    loading: typeLoading,
    error: typeError,
    retry: retryType,
  } = useApi<PokemonType & { moves: Array<{ name: string }> }>(active && type !== 'all' ? `type/${type}` : null)
  const groups = useMemo(() => groupMovesByLearningMethod(pokemon.moves), [pokemon.moves])
  const methods = useMemo(() => groups.map((group) => group.method), [groups])
  const moveNamesForType = useMemo(
    () => (type === 'all' ? null : new Set(selectedType?.moves.map((move) => move.name) ?? [])),
    [selectedType, type],
  )
  const normalizedQuery = useMemo(() => normalizeSearchText(deferredQuery), [deferredQuery])
  const filteredGroups = useMemo(
    () =>
      groups
        .filter((group) => method === 'all' || group.method === method)
        .map((group) => ({
          ...group,
          moves: group.moves.filter(
            ({ move }) =>
              normalizeSearchText(move.name).includes(normalizedQuery) &&
              (!moveNamesForType || moveNamesForType.has(move.name)),
          ),
        }))
        .filter((group) => group.moves.length),
    [groups, method, moveNamesForType, normalizedQuery],
  )
  const methodOptions = [
    { value: 'all', label: t('detail.allMethods') },
    ...methods.map((moveMethod) => ({
      value: moveMethod,
      label: moveLearningMethodLabel(moveMethod, t),
    })),
  ]
  const typeOptions: Array<{ value: BattleType | 'all'; label: string }> = [
    { value: 'all', label: t('detail.allTypes') },
    ...BATTLE_TYPES.map((battleType) => ({
      value: battleType,
      label: typeLabel(battleType, language),
    })),
  ]

  if (!active) return null

  return (
    <article className="info-card wide-card" role="tabpanel" id="panel-moves" aria-labelledby="tab-moves">
      <div className="table-heading">
        <div>
          <h2>{t('detail.compatibleMoves')}</h2>
          <p>{t('detail.movesDesc')}</p>
        </div>
        <div
          className="damage-legend"
          aria-label={t('damage.class', {
            name: `${t('damage.physical')}, ${t('damage.special')}, ${t('damage.status')}`,
          })}
        >
          <DamageClassBadge value="physical" />
          <DamageClassBadge value="special" />
          <DamageClassBadge value="status" />
        </div>
      </div>
      <div className="move-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          clearLabel={t('common.clear')}
          iconSize={18}
          aria-label={t('detail.movesSearch')}
          placeholder={t('detail.movesSearch')}
        />
        <SelectMenu
          icon={<GraduationCap size={18} />}
          label={t('move.learning')}
          options={methodOptions}
          value={method}
          onChange={setMethod}
        />
        <SelectMenu
          icon={<Shapes size={18} />}
          label={t('detail.moveType')}
          options={typeOptions}
          value={type}
          onChange={setType}
        />
      </div>
      {typeLoading && (
        <p className="sort-status" role="status">
          {t('common.loading')}
        </p>
      )}
      {typeError && (
        <InlineRetryError message={t('error.message')} retryLabel={t('common.retry')} onRetry={retryType} />
      )}
      <div className="move-groups">
        {!typeLoading &&
          !typeError &&
          filteredGroups.map((group) => (
            <section className="move-group" key={group.method}>
              <header>
                <h3>{moveLearningMethodLabel(group.method, t)}</h3>
                <span>
                  {group.moves.length === 1 ? t('move.countOne') : t('move.count', { count: group.moves.length })}
                </span>
              </header>
              <div className="moves-grid">
                {group.moves.map(({ move, method: learningMethod, level }) => (
                  <MoveCard key={move.name} move={move} method={learningMethod} level={level} />
                ))}
              </div>
            </section>
          ))}
      </div>
      {!typeLoading && !typeError && !filteredGroups.length && (
        <EmptyState className="compact-empty" icon={<Search />} title={t('pokedex.empty')} headingLevel={3} />
      )}
    </article>
  )
}
