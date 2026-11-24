import { Bubbles, CircleSlash2, Flame, Mars, Snowflake, Sparkles, Venus, Zap, type LucideIcon } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatNumber, localizedName, localizedText, prettyName } from '../../lib/api'
import { currentBattleStats, possibleBattleStats, type BattlePokemon, type BattleStatRanges } from '../../lib/battle'
import type { Stats, PokemonGender } from '../../lib/teams'
import { TypeBadge } from '../TypeBadge'
import { TeraTypeBadge } from '../TeraTypeBadge'
import { ItemImage } from '../ItemImage'
import { BattleTooltipContent } from './BattleDetails'

type MajorBattleStatus = Exclude<BattlePokemon['status'], null>

const majorStatusPresentation: Record<MajorBattleStatus, { className: string; Icon?: LucideIcon }> = {
  paralysis: { className: 'paralysis', Icon: Zap },
  sleep: { className: 'sleep' },
  freeze: { className: 'freeze', Icon: Snowflake },
  burn: { className: 'burn', Icon: Flame },
  poison: { className: 'poison', Icon: Bubbles },
  'badly-poisoned': { className: 'badly-poisoned', Icon: Bubbles },
}

export function GenderIcon({ gender }: { gender: PokemonGender }) {
  const { t } = useLanguage()
  const presentation =
    gender === 'male'
      ? { Icon: Mars, label: t('gender.maleLabel'), className: 'male' }
      : gender === 'female'
        ? { Icon: Venus, label: t('gender.femaleLabel'), className: 'female' }
        : { Icon: CircleSlash2, label: t('gender.none'), className: 'none' }
  return (
    <span
      className={`battle-gender-icon ${presentation.className}`}
      role="img"
      aria-label={t('battle.gender', { gender: presentation.label })}
      title={presentation.label}
    >
      <presentation.Icon aria-hidden="true" />
    </span>
  )
}

export function MajorStatusBadge({ status, compact = false }: { status: MajorBattleStatus; compact?: boolean }) {
  const { t } = useLanguage()
  const presentation = majorStatusPresentation[status]
  const label = t(`battle.status.${status}`)
  const Icon = presentation.Icon
  return (
    <span
      className={`battle-major-status battle-major-status--${presentation.className}${compact ? ' is-compact' : ''}`}
      aria-label={label}
      title={label}
    >
      {Icon ? (
        <Icon aria-hidden="true" />
      ) : (
        <span className="battle-major-status-sleep-icon" aria-hidden="true">
          Z<small>z</small>
        </span>
      )}
      <span>{label}</span>
    </span>
  )
}

function BattlePokemonTypes({ pokemon }: { pokemon: BattlePokemon }) {
  const { t } = useLanguage()
  return (
    <span className="battle-tooltip-pokemon-types">
      <span className="battle-tooltip-original-types" aria-label={t('battle.originalTypes')}>
        {pokemon.pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} iconOnly />
        ))}
      </span>
      <span
        className={`battle-tooltip-tera${pokemon.terastallized ? ' is-active' : ''}`}
        aria-label={t('battle.teraType')}
      >
        <Sparkles size={12} aria-hidden="true" />
        <TeraTypeBadge type={pokemon.member.tera} iconOnly />
        <small>{t(pokemon.terastallized ? 'battle.teraActive' : 'battle.teraInactive')}</small>
      </span>
    </span>
  )
}

function BattlePokemonDetails({ pokemon }: { pokemon: BattlePokemon }) {
  const { t } = useLanguage()
  return (
    <span className="battle-tooltip-pokemon-details">
      {pokemon.status && (
        <span className="battle-tooltip-status">
          <b>{t('battle.statusLabel')}</b>
          <MajorStatusBadge status={pokemon.status} compact />
        </span>
      )}
    </span>
  )
}

const battleTooltipStatKeys = [
  'pokedex.sort.hp',
  'battle.statShort.attack',
  'battle.statShort.defense',
  'battle.statShort.specialAttack',
  'battle.statShort.specialDefense',
  'battle.statShort.speed',
] as const
const allBattleStatIndexes = [0, 1, 2, 3, 4, 5] as const
const opponentBattleStatIndexes = [5] as const

export function BattleTooltipStats({
  className,
  stats,
  originalStats,
  indexes = allBattleStatIndexes,
}: {
  className: string
  stats: Stats | BattleStatRanges
  originalStats?: Stats
  indexes?: readonly number[]
}) {
  const { language, t } = useLanguage()
  return (
    <span className={className}>
      {indexes.map((index) => {
        const stat = stats[index]
        const key = battleTooltipStatKeys[index]
        const label = t(key)
        if (Array.isArray(stat)) {
          return (
            <span key={key}>
              <small>{label}</small>
              <b>
                {t('battle.statRange', {
                  minimum: formatNumber(stat[0], language),
                  maximum: formatNumber(stat[1], language),
                })}
              </b>
            </span>
          )
        }
        const original = originalStats?.[index]
        const direction =
          original === undefined || stat === original ? null : stat > original ? 'increased' : 'decreased'
        const current = formatNumber(stat, language)
        const accessibleLabel =
          direction && original !== undefined
            ? t(`battle.statValue.${direction}`, {
                stat: label,
                current,
                original: formatNumber(original, language),
              })
            : undefined
        return (
          <span key={key} className={direction ? `is-${direction}` : undefined} aria-label={accessibleLabel}>
            <small aria-hidden={Boolean(direction)}>{label}</small>
            <b aria-hidden={Boolean(direction)}>
              {direction && <span className="battle-stat-direction">{direction === 'increased' ? '↑' : '↓'}</span>}
              {current}
            </b>
          </span>
        )
      })}
    </span>
  )
}

function resourceName(resource: BattlePokemon['ability'], apiLanguage: string) {
  return localizedName(resource.names, apiLanguage) || prettyName(resource.name)
}

export function ResourceDetails({ resource, item = false }: { resource: BattlePokemon['ability']; item?: boolean }) {
  const { apiLanguage, t } = useLanguage()
  const description = localizedText(resource.descriptions, ['effect'], apiLanguage)
  return (
    <span className={`battle-resource-detail${item ? ' with-item' : ''}`}>
      {item && <ItemImage name={resource.name} preferredSource={resource.sprite} alt="" width={28} height={28} />}
      <span>
        <b>{resourceName(resource, apiLanguage)}</b>
        <small>
          {description || t(item ? 'battle.itemDescriptionUnavailable' : 'battle.abilityDescriptionUnavailable')}
        </small>
      </span>
    </span>
  )
}

export function ActivePokemonTooltip({
  id,
  pokemon,
  opponent,
}: {
  id: string
  pokemon: BattlePokemon
  opponent: boolean
}) {
  const { t } = useLanguage()
  const stats = opponent ? possibleBattleStats(pokemon.pokemon, pokemon.member.level) : currentBattleStats(pokemon)
  const itemVisible = !opponent || pokemon.member.itemActive
  return (
    <BattleTooltipContent id={id} className="battle-active-tooltip">
      <span className="battle-active-tooltip-heading">
        <span className="battle-active-tooltip-title">
          <b>{prettyName(pokemon.pokemon.name)}</b>
          <GenderIcon gender={pokemon.member.gender} />
          <BattlePokemonTypes pokemon={pokemon} />
        </span>
        <small>{t(opponent ? 'battle.opponentDetails' : 'battle.allyDetails')}</small>
      </span>
      <BattleTooltipStats
        className={`battle-tooltip-stats${opponent ? ' is-opponent-speed' : ''}`}
        stats={stats}
        originalStats={opponent ? undefined : pokemon.originalStats}
        indexes={opponent ? opponentBattleStatIndexes : allBattleStatIndexes}
      />
      <BattlePokemonDetails pokemon={pokemon} />
      {opponent ? (
        <>
          <span className="battle-resource-section">
            <b>{t('battle.possibleAbilities')}</b>
            <span>{pokemon.pokemon.abilities.map(prettyName).join(' · ')}</span>
          </span>
          {pokemon.revealedMoves.length > 0 && (
            <span className="battle-resource-section">
              <b>{t('battle.revealedMoves')}</b>
              <span>{pokemon.revealedMoves.map(prettyName).join(' · ')}</span>
            </span>
          )}
        </>
      ) : (
        <span className="battle-resource-section">
          <b>{t('resource.field.ability')}</b>
          <ResourceDetails resource={pokemon.ability} />
        </span>
      )}
      {itemVisible && pokemon.item && (
        <span className="battle-resource-section">
          <b>{t('resource.field.item')}</b>
          <ResourceDetails resource={pokemon.item} item />
        </span>
      )}
      {opponent && itemVisible && pokemon.item && (
        <span className="battle-item-revealed">{t('battle.itemActivated')}</span>
      )}
    </BattleTooltipContent>
  )
}
