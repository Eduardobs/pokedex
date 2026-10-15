import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, CircleSlash2, Dices, Mars, RotateCcw, Shield, Sparkles, Swords, UserRound, Venus } from 'lucide-react'
import { ItemImage } from '../components/ItemImage'
import { PageHeader } from '../components/PageHeader'
import { TypeBadge } from '../components/TypeBadge'
import { DamageClassBadge } from '../components/SemanticBadges'
import { useLanguage } from '../contexts/LanguageContext'
import { BATTLE_TIMING, STORAGE_KEYS } from '../config/app'
import { formatDecimal, formatNumber, localizedName, localizedText, prettyName } from '../lib/api'
import { loadBattleRoster } from '../lib/battle-data'
import {
  chooseOpponentAction,
  battleMoveEffectiveness,
  createBattleState,
  currentBattleStats,
  isBattleReadyTeam,
  possibleBattleStats,
  resolveBattleTurnSteps,
  type BattleChoice,
  type BattleEvent,
  type BattlePokemon,
  type BattleSide,
  type BattleStatRanges,
  type BattleState,
} from '../lib/battle'
import { createRandomTeam, loadRandomTeamPokemon } from '../lib/random-team'
import { readStorage } from '../lib/storage'
import { validTeams, type Stats, type Team } from '../lib/teams'
import type { PokemonGender } from '../lib/teams'

type ScreenState = 'idle' | 'loading' | 'error' | 'battle'
type ActiveMove = { side: 'player' | 'opponent'; name: string }

function waitForBattleDelay(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration))
}

function useAnimatedHealth(target: number) {
  const [displayed, setDisplayed] = useState(target)
  const displayedRef = useRef(target)
  useEffect(() => {
    const start = displayedRef.current
    if (start === target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      displayedRef.current = target
      setDisplayed(target)
      return
    }
    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / BATTLE_TIMING.hpTransitionMs)
      const next = Math.round(start + (target - start) * progress)
      displayedRef.current = next
      setDisplayed(next)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [target])
  return displayed
}

function GenderIcon({ gender }: { gender: PokemonGender }) {
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

function positionBattleTooltip(event: ReactPointerEvent<HTMLElement>, tooltipId: string) {
  const tooltip = document.getElementById(tooltipId)
  if (!tooltip) return
  const gap = 10
  const bounds = tooltip.getBoundingClientRect()
  const left = Math.max(gap, Math.min(event.clientX + gap, window.innerWidth - bounds.width - gap))
  const top = Math.max(gap, Math.min(event.clientY + gap, window.innerHeight - bounds.height - gap))
  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
  tooltip.style.right = 'auto'
  tooltip.style.bottom = 'auto'
  tooltip.classList.add('is-pointer-positioned')
}

function resetBattleTooltip(tooltipId: string) {
  const tooltip = document.getElementById(tooltipId)
  if (!tooltip) return
  tooltip.style.removeProperty('left')
  tooltip.style.removeProperty('top')
  tooltip.style.removeProperty('right')
  tooltip.style.removeProperty('bottom')
  tooltip.classList.remove('is-pointer-positioned')
}

function HealthBar({ pokemon }: { pokemon: BattlePokemon }) {
  const { language, t } = useLanguage()
  const displayedHp = useAnimatedHealth(pokemon.hp)
  const percent = Math.max(0, Math.round((pokemon.hp / pokemon.maxHp) * 100))
  const stages = Object.entries(pokemon.stages)
    .filter(([, value]) => value !== 0)
    .map(([stat, value]) => ({ stat: stat as keyof typeof pokemon.stages, value }))
  return (
    <div className="battle-health">
      <div className="battle-health-copy">
        <div>
          <small>{t('battle.number', { number: formatNumber(pokemon.pokemon.id, language) })}</small>
          <strong>
            {prettyName(pokemon.pokemon.name)}
            <GenderIcon gender={pokemon.member.gender} />
          </strong>
        </div>
        <span>{t('battle.level', { level: formatNumber(pokemon.member.level, language) })}</span>
      </div>
      <div
        className="battle-health-track"
        role="meter"
        aria-label={t('battle.health', { name: prettyName(pokemon.pokemon.name) })}
        aria-valuemin={0}
        aria-valuemax={pokemon.maxHp}
        aria-valuenow={pokemon.hp}
      >
        <span style={{ width: `${percent}%`, transitionDuration: `${BATTLE_TIMING.hpTransitionMs}ms` }} />
      </div>
      <div className="battle-health-meta">
        {pokemon.status && <span>{t(`battle.status.${pokemon.status}`)}</span>}
        <span>
          {formatNumber(displayedHp, language)} / {formatNumber(pokemon.maxHp, language)}
        </span>
      </div>
      <div className={`battle-active-types${pokemon.terastallized ? ' is-tera' : ''}`}>
        <span className="battle-active-type-label">
          {pokemon.terastallized && <Sparkles size={14} aria-hidden="true" />}
          {t(pokemon.terastallized ? 'teams.tera' : 'resource.field.types')}
        </span>
        <span className="battle-active-type-badges">
          {(pokemon.terastallized ? [pokemon.member.tera] : pokemon.pokemon.types).map((type) => (
            <TypeBadge key={type} type={type} iconOnly />
          ))}
        </span>
      </div>
      <div className="battle-stat-modifiers" aria-label={t('battle.statModifiers')}>
        {stages.map(({ stat, value }) => (
          <span key={stat} className={value > 0 ? 'raised' : value < 0 ? 'lowered' : undefined}>
            {t(`battle.stat.${stat}`)} {value > 0 ? `+${value}` : value}
          </span>
        ))}
      </div>
    </div>
  )
}

function ActivePokemon({
  side,
  opponent = false,
  teraControl,
  activeMove,
}: {
  side: BattleSide
  opponent?: boolean
  teraControl?: ReactNode
  activeMove?: string
}) {
  const tooltipId = useId()
  const { t } = useLanguage()
  const pokemon = side.roster[side.active]
  const sprite = pokemon.member.shiny
    ? opponent
      ? pokemon.pokemon.showdownFrontShinySprite
      : pokemon.pokemon.showdownBackShinySprite
    : opponent
      ? pokemon.pokemon.showdownFrontSprite
      : pokemon.pokemon.showdownBackSprite
  const fallback = pokemon.member.shiny ? pokemon.pokemon.homeShinySprite : pokemon.pokemon.homeSprite
  return (
    <article className={`battle-active${opponent ? ' opponent' : ' player'}`}>
      <div className="battle-active-data">
        <HealthBar key={pokemon.member.id} pokemon={pokemon} />
        {teraControl}
      </div>
      <div className="battle-pokemon-visual">
        {activeMove && (
          <span
            className="battle-move-announcement"
            style={{ animationDuration: `${BATTLE_TIMING.actionDelayMs}ms` }}
            role="status"
          >
            {prettyName(activeMove)}
          </span>
        )}
        <span
          className="battle-sprite-trigger"
          tabIndex={0}
          aria-label={t('battle.activePokemonDetails', { name: prettyName(pokemon.pokemon.name) })}
          aria-describedby={tooltipId}
          onPointerMove={(event) => positionBattleTooltip(event, tooltipId)}
          onPointerLeave={() => resetBattleTooltip(tooltipId)}
        >
          {sprite ? (
            <img
              src={sprite}
              alt={prettyName(pokemon.pokemon.name)}
              width="180"
              height="180"
              onError={({ currentTarget }) => {
                if (!fallback || currentTarget.src === fallback) return
                currentTarget.onerror = null
                currentTarget.src = fallback
              }}
            />
          ) : fallback ? (
            <img src={fallback} alt={prettyName(pokemon.pokemon.name)} width="180" height="180" />
          ) : (
            <Shield aria-hidden="true" />
          )}
          <span className="battle-active-tooltip-anchor">
            <ActivePokemonTooltip id={tooltipId} pokemon={pokemon} opponent={opponent} />
          </span>
        </span>
      </div>
    </article>
  )
}

function moveDescription(move: BattlePokemon['moves'][number]['data'], language: string) {
  const descriptions = move.descriptions ?? []
  return (
    descriptions.find((entry) => entry.language === language)?.text ||
    descriptions.find((entry) => entry.language === 'en')?.text ||
    descriptions.find((entry) => entry.language === 'pt-br')?.text ||
    descriptions[0]?.text ||
    ''
  )
}

function BattleMoveButton({
  move,
  opponent,
  onChoose,
  disabled = false,
}: {
  move: BattlePokemon['moves'][number]
  opponent: BattlePokemon
  onChoose: () => void
  disabled?: boolean
}) {
  const tooltipId = useId()
  const { apiLanguage, language, t } = useLanguage()
  const description = moveDescription(move.data, apiLanguage)
  const number = (value: number | null) => (value === null ? '—' : formatNumber(value, language))
  const multiplier = battleMoveEffectiveness(move.data, opponent)
  const formattedMultiplier = formatDecimal(multiplier, language, 2)
  const effectiveness =
    multiplier === 0
      ? t('battle.effectiveness.none')
      : multiplier === 1
        ? t('battle.effectiveness.normal')
        : multiplier === 2 || multiplier === 4
          ? t('battle.effectiveness.super', { multiplier: formattedMultiplier })
          : t('battle.effectiveness.reduced', { multiplier: formattedMultiplier })
  return (
    <button
      className="battle-move-button"
      disabled={disabled || move.pp <= 0}
      aria-label={prettyName(move.data.name)}
      aria-describedby={tooltipId}
      onClick={onChoose}
      onPointerMove={(event) => positionBattleTooltip(event, tooltipId)}
      onPointerLeave={() => resetBattleTooltip(tooltipId)}
    >
      <span>{prettyName(move.data.name)}</span>
      <TypeBadge type={move.data.type} />
      <small>{t('battle.pp', { current: move.pp, total: move.data.pp })}</small>
      <span id={tooltipId} className="battle-move-tooltip" role="tooltip">
        <span className="battle-tooltip-damage">
          <span>{t('move.damageClass')}</span>
          <DamageClassBadge value={move.data.damageClass} />
        </span>
        <span>
          {t('move.power')}: <b>{number(move.data.power)}</b>
        </span>
        <span>
          {t('move.accuracy')}: <b>{number(move.data.accuracy)}</b>
        </span>
        <span>
          {t('battle.effectiveness')}: <b>{effectiveness}</b>
        </span>
        <span className="battle-tooltip-description">
          <b>{t('resource.field.description')}</b>
          <span>{description || t('battle.moveDescriptionUnavailable')}</span>
        </span>
      </span>
    </button>
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

function BattleTooltipStats({
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

const trainerSpriteNames = [
  'acetrainer-gen1',
  'acetrainer-gen2',
  'acetrainer-gen3',
  'acetrainer-gen4',
  'acetrainer-gen6',
] as const

function randomTrainerSprites() {
  const player = trainerSpriteNames[Math.floor(Math.random() * trainerSpriteNames.length)]
  let opponent = trainerSpriteNames[Math.floor(Math.random() * trainerSpriteNames.length)]
  if (trainerSpriteNames.length > 1) {
    while (opponent === player) opponent = trainerSpriteNames[Math.floor(Math.random() * trainerSpriteNames.length)]
  }
  return {
    player: `https://play.pokemonshowdown.com/sprites/trainers/${player}.png`,
    opponent: `https://play.pokemonshowdown.com/sprites/trainers/${opponent}.png`,
  }
}

function resourceName(resource: BattlePokemon['ability'], apiLanguage: string) {
  return localizedName(resource.names, apiLanguage) || prettyName(resource.name)
}

function ResourceDetails({ resource, item = false }: { resource: BattlePokemon['ability']; item?: boolean }) {
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

function ActivePokemonTooltip({ id, pokemon, opponent }: { id: string; pokemon: BattlePokemon; opponent: boolean }) {
  const { t } = useLanguage()
  const stats = opponent ? possibleBattleStats(pokemon.pokemon, pokemon.member.level) : currentBattleStats(pokemon)
  const itemVisible = !opponent || pokemon.member.itemActive
  return (
    <span id={id} className="battle-active-tooltip" role="tooltip">
      <span className="battle-active-tooltip-heading">
        <span className="battle-active-tooltip-title">
          <b>{prettyName(pokemon.pokemon.name)}</b>
          <GenderIcon gender={pokemon.member.gender} />
        </span>
        <small>{t(opponent ? 'battle.opponentDetails' : 'battle.allyDetails')}</small>
      </span>
      <BattleTooltipStats
        className={`battle-tooltip-stats${opponent ? ' is-opponent-speed' : ''}`}
        stats={stats}
        originalStats={opponent ? undefined : pokemon.originalStats}
        indexes={opponent ? opponentBattleStatIndexes : allBattleStatIndexes}
      />
      {opponent ? (
        <span className="battle-resource-section">
          <b>{t('battle.possibleAbilities')}</b>
          <span>{pokemon.pokemon.abilities.map(prettyName).join(' · ')}</span>
        </span>
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
    </span>
  )
}

function TrainerPanel({ side, opponent, sprite }: { side: BattleSide; opponent: boolean; sprite: string }) {
  const { t } = useLanguage()
  const alive = side.roster.filter((pokemon) => pokemon.hp > 0).length
  const fainted = side.roster.length - alive
  return (
    <aside
      className={`battle-trainer${opponent ? ' opponent' : ' player'}`}
      aria-label={t('battle.trainerTeam', { name: side.team.name })}
    >
      <span className="battle-trainer-sprite" aria-hidden="true">
        <UserRound />
        <img
          src={sprite}
          alt=""
          width={76}
          height={76}
          onError={({ currentTarget }) => {
            currentTarget.hidden = true
          }}
        />
      </span>
      <span className="battle-trainer-copy">
        <b>{side.team.name}</b>
        <small>{t('battle.teamStatus', { alive, fainted })}</small>
      </span>
      <ul className="battle-roster-icons" aria-label={t('battle.rosterStatus', { name: side.team.name })}>
        {side.roster.map((pokemon) => {
          const faintedPokemon = pokemon.hp === 0
          const homeSprite = pokemon.member.shiny ? pokemon.pokemon.homeShinySprite : pokemon.pokemon.homeSprite
          return (
            <li
              key={pokemon.member.id}
              className={`${pokemon.hasEnteredBattle ? 'is-used' : 'is-unused'}${faintedPokemon ? ' is-fainted' : ''}`}
              aria-label={t(
                faintedPokemon
                  ? 'battle.rosterFainted'
                  : pokemon.hasEnteredBattle
                    ? 'battle.rosterUsed'
                    : 'battle.rosterUnused',
                {
                  name: prettyName(pokemon.pokemon.name),
                },
              )}
            >
              {pokemon.hasEnteredBattle && homeSprite ? (
                <img src={homeSprite} alt="" width={30} height={30} />
              ) : pokemon.hasEnteredBattle ? (
                <Shield aria-hidden="true" />
              ) : (
                <span className="battle-pokeball" aria-hidden="true" />
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function BattleSwitchButton({
  pokemon,
  onChoose,
  disabled = false,
}: {
  pokemon: BattlePokemon
  onChoose: () => void
  disabled?: boolean
}) {
  const tooltipId = useId()
  const { language, t } = useLanguage()
  const hpPercentage = Math.round((pokemon.hp / pokemon.maxHp) * 100)
  const homeSprite = pokemon.member.shiny ? pokemon.pokemon.homeShinySprite : pokemon.pokemon.homeSprite
  return (
    <button
      className="battle-switch-button"
      disabled={disabled}
      aria-label={prettyName(pokemon.pokemon.name)}
      aria-describedby={tooltipId}
      onClick={onChoose}
      onPointerMove={(event) => positionBattleTooltip(event, tooltipId)}
      onPointerLeave={() => resetBattleTooltip(tooltipId)}
    >
      <span className="battle-switch-summary">
        <span className="battle-switch-sprite" aria-hidden="true">
          {homeSprite ? <img src={homeSprite} alt="" /> : <Shield />}
        </span>
        <span className="battle-switch-copy">
          <b>{prettyName(pokemon.pokemon.name)}</b>
          <small>
            {formatNumber(pokemon.hp, language)}/{formatNumber(pokemon.maxHp, language)} HP
          </small>
        </span>
      </span>
      <span id={tooltipId} className="battle-switch-tooltip" role="tooltip">
        <span className="battle-switch-tooltip-title">
          <b>
            {prettyName(pokemon.pokemon.name)}
            <GenderIcon gender={pokemon.member.gender} />
          </b>
          <span>{t('battle.level', { level: formatNumber(pokemon.member.level, language) })}</span>
        </span>
        <span className="battle-switch-tooltip-types">
          <span>{t('resource.field.types')}</span>
          <span className="battle-switch-type-list">
            {pokemon.pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </span>
          <span className="battle-switch-tooltip-tera">
            {t('teams.tera')}: <TypeBadge type={pokemon.member.tera} />
          </span>
        </span>
        <span>
          {t('battle.hpRemaining')}: <b>{formatNumber(hpPercentage, language)}%</b> (
          {formatNumber(pokemon.hp, language)}/{formatNumber(pokemon.maxHp, language)} HP)
        </span>
        <BattleTooltipStats
          className="battle-switch-stats"
          stats={currentBattleStats(pokemon)}
          originalStats={pokemon.originalStats}
        />
        <span className="battle-switch-resources">
          <span className="battle-resource-section">
            <b>{t('resource.field.ability')}</b>
            <ResourceDetails resource={pokemon.ability} />
          </span>
          <span className="battle-resource-section">
            <b>{t('resource.field.item')}</b>
            {pokemon.item ? (
              <ResourceDetails resource={pokemon.item} item />
            ) : (
              <span className="battle-resource-empty">{t('battle.noItem')}</span>
            )}
          </span>
        </span>
        <span className="battle-switch-tooltip-moves">
          <b>{t('battle.availableMoves')}</b>
          <span>
            {pokemon.moves.map((move, index) => (
              <span className="battle-switch-move" key={`${move.data.name}-${index}`}>
                <span className="battle-switch-move-name">{prettyName(move.data.name)}</span>
                <span className="battle-switch-move-icons">
                  <DamageClassBadge value={move.data.damageClass} compact />
                  <TypeBadge type={move.data.type} iconOnly />
                </span>
                <small>{t('battle.pp', { current: move.pp, total: move.data.pp })}</small>
              </span>
            ))}
          </span>
        </span>
      </span>
    </button>
  )
}

function eventText(event: BattleEvent, t: ReturnType<typeof useLanguage>['t']) {
  const name = 'pokemon' in event ? prettyName(event.pokemon) : ''
  switch (event.type) {
    case 'turn':
      return t('battle.log.turn', { turn: event.turn })
    case 'move':
      return t('battle.log.move', { name, move: prettyName(event.move) })
    case 'switch':
      return t('battle.log.switch', { name })
    case 'tera':
      return t('battle.log.tera', { name, type: prettyName(event.tera) })
    case 'miss':
      return t('battle.log.miss', { name })
    case 'immune':
      return t('battle.log.immune', { name })
    case 'damage':
      return event.critical
        ? t('battle.log.critical', { name, damage: event.amount })
        : event.effectiveness > 1
          ? t('battle.log.superEffective', { name, damage: event.amount })
          : event.effectiveness < 1
            ? t('battle.log.notEffective', { name, damage: event.amount })
            : t('battle.log.damage', { name, damage: event.amount })
    case 'hazardSet':
      return t('battle.log.hazardSet', {
        hazard: prettyName(event.hazard),
        side: t(`battle.log.side.${event.side}`),
      })
    case 'hazardDamage':
      return t('battle.log.hazardDamage', { name, hazard: prettyName(event.hazard), damage: event.amount })
    case 'hazardsCleared':
      return t('battle.log.hazardsCleared', { side: t(`battle.log.side.${event.side}`) })
    case 'heal':
      return t('battle.log.heal', { name, amount: event.amount })
    case 'itemRemoved':
      return t('battle.log.itemRemoved', { name, item: prettyName(event.item) })
    case 'status':
      return t('battle.log.status', { name, status: t(`battle.status.${event.status}`) })
    case 'statusDamage':
      return t('battle.log.statusDamage', { name, damage: event.amount })
    case 'asleep':
      return t('battle.log.asleep', { name })
    case 'wake':
      return t('battle.log.wake', { name })
    case 'stage':
      return t('battle.log.stage', { name, stat: t(`battle.stat.${event.stat}`), change: event.change })
    case 'failed':
      return t('battle.log.failed', { name })
    case 'faint':
      return t('battle.log.faint', { name })
    case 'win':
      return t(event.side === 'player' ? 'battle.log.playerWin' : 'battle.log.opponentWin')
  }
}

function BattleLogEvent({ event }: { event: BattleEvent }) {
  const { t } = useLanguage()
  const text = eventText(event, t)
  const name = 'pokemon' in event ? prettyName(event.pokemon) : ''
  const nameIndex = event.type === 'move' && name ? text.indexOf(name) : -1
  const tone =
    event.type === 'damage' || event.type === 'hazardDamage' || event.type === 'statusDamage'
      ? 'damage'
      : event.type === 'heal'
        ? 'healing'
        : event.type === 'move'
          ? 'move'
          : event.type === 'status' || event.type === 'stage'
            ? 'effect'
            : event.type === 'faint' || event.type === 'win'
              ? 'important'
              : 'neutral'
  return (
    <p className={`battle-log-event is-${tone}`}>
      {nameIndex >= 0 ? (
        <>
          {text.slice(0, nameIndex)}
          <strong>{name}</strong>
          {text.slice(nameIndex + name.length)}
        </>
      ) : (
        text
      )}
    </p>
  )
}

export function BattlePage() {
  const { t } = useLanguage()
  const teams = readStorage<Team[]>(STORAGE_KEYS.teams, validTeams, []).filter(isBattleReadyTeam)
  const [selectedTeam, setSelectedTeam] = useState(teams[0]?.id ?? '')
  const [screen, setScreen] = useState<ScreenState>('idle')
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [events, setEvents] = useState<BattleEvent[]>([])
  const [teraSelected, setTeraSelected] = useState(false)
  const [showSwitches, setShowSwitches] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [activeMove, setActiveMove] = useState<ActiveMove | null>(null)
  const [trainerSprites, setTrainerSprites] = useState(randomTrainerSprites)
  const requestRef = useRef<AbortController | null>(null)
  const sequenceRef = useRef(0)
  useEffect(
    () => () => {
      requestRef.current?.abort()
      sequenceRef.current += 1
    },
    [],
  )

  const startBattle = async () => {
    const team = teams.find((entry) => entry.id === selectedTeam)
    if (!team || screen === 'loading') return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setScreen('loading')
    setBattle(null)
    setEvents([])
    setTeraSelected(false)
    setShowSwitches(false)
    try {
      const [playerRoster, randomPokemon] = await Promise.all([
        loadBattleRoster(team, controller.signal),
        loadRandomTeamPokemon(controller.signal),
      ])
      const opponentTeam = createRandomTeam(t('battle.opponentTeam'), randomPokemon)
      const opponentRoster = await loadBattleRoster(opponentTeam, controller.signal)
      if (controller.signal.aborted) return
      setTrainerSprites(randomTrainerSprites())
      setBattle(createBattleState(team, playerRoster, opponentTeam, opponentRoster))
      setScreen('battle')
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setScreen('error')
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  const play = async (choice: BattleChoice) => {
    if (!battle || resolving || battle.phase === 'won' || battle.phase === 'lost') return
    if (choice.kind === 'switch') setShowSwitches(false)
    const sequence = ++sequenceRef.current
    setResolving(true)
    let steps = resolveBattleTurnSteps(battle, choice, chooseOpponentAction(battle))
    const lastState = steps.at(-1)?.state
    if (lastState?.phase === 'opponent-switch') {
      const automatic = resolveBattleTurnSteps(lastState, choice, chooseOpponentAction(lastState))
      if (automatic.length) {
        automatic[0] = { ...automatic[0], events: automatic[0].events.filter((event) => event.type !== 'turn') }
      }
      steps = [...steps, ...automatic]
    }
    for (const step of steps) {
      setActiveMove(step.action?.move ? { side: step.action.side, name: step.action.move } : null)
      if (step.action) await waitForBattleDelay(BATTLE_TIMING.actionDelayMs)
      if (sequenceRef.current !== sequence) return
      setActiveMove(null)
      setBattle(step.state)
      setEvents((current) => [...current, ...step.events])
      await waitForBattleDelay(BATTLE_TIMING.resultDisplayMs)
      if (sequenceRef.current !== sequence) return
    }
    setTeraSelected(false)
    setResolving(false)
  }

  const player = battle?.player.roster[battle.player.active]
  const availableSwitches =
    battle?.player.roster.flatMap((pokemon, index) =>
      index !== battle.player.active && pokemon.hp > 0 ? [{ pokemon, index }] : [],
    ) ?? []
  const choosingSwitch = battle?.phase === 'player-switch' || showSwitches

  return (
    <section className="page content-width battle-page">
      <PageHeader
        eyebrow={<Swords size={18} />}
        title={t('battle.title')}
        description={t('battle.description')}
        aside={
          screen === 'battle' ? (
            <button
              className="button secondary"
              onClick={() => {
                sequenceRef.current += 1
                setScreen('idle')
                setBattle(null)
                setEvents([])
                setTeraSelected(false)
                setShowSwitches(false)
                setResolving(false)
                setActiveMove(null)
              }}
            >
              <RotateCcw size={18} aria-hidden="true" /> {t('battle.newBattle')}
            </button>
          ) : undefined
        }
      />

      {screen !== 'battle' && (
        <div className="battle-lobby">
          <div>
            <span className="eyebrow">
              <Dices size={16} aria-hidden="true" /> {t('battle.format')}
            </span>
            <h2>{t('battle.chooseTeam')}</h2>
            <p>{t('battle.chooseTeamDescription')}</p>
          </div>
          {teams.length ? (
            <div className="battle-lobby-actions">
              <label>
                {t('battle.yourTeam')}
                <select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary" onClick={startBattle} disabled={screen === 'loading'}>
                <Swords size={18} aria-hidden="true" />
                {screen === 'loading' ? t('battle.loading') : t('battle.start')}
              </button>
            </div>
          ) : (
            <div className="battle-empty">
              <p>{t('battle.noTeams')}</p>
              <Link className="button primary" to="/teams">
                {t('battle.openTeams')}
              </Link>
            </div>
          )}
          {screen === 'loading' && (
            <p role="status" aria-live="polite">
              {t('battle.loadingDescription')}
            </p>
          )}
          {screen === 'error' && (
            <div role="alert" className="battle-error">
              <p>{t('battle.loadError')}</p>
              <button className="button secondary" onClick={startBattle}>
                {t('common.retry')}
              </button>
            </div>
          )}
        </div>
      )}

      {battle && player && screen === 'battle' && (
        <div className="battle-shell">
          <div className="battle-arena">
            <div className="battle-trainers">
              <TrainerPanel side={battle.player} opponent={false} sprite={trainerSprites.player} />
              <TrainerPanel side={battle.opponent} opponent sprite={trainerSprites.opponent} />
            </div>
            <div className="battle-field" aria-label={t('battle.field')} aria-busy={resolving}>
              <div className="battle-side opponent">
                <ActivePokemon
                  side={battle.opponent}
                  opponent
                  activeMove={activeMove?.side === 'opponent' ? activeMove.name : undefined}
                />
              </div>
              <div className="battle-versus" aria-hidden="true">
                <Swords />
              </div>
              <div className="battle-side player">
                <ActivePokemon
                  side={battle.player}
                  activeMove={activeMove?.side === 'player' ? activeMove.name : undefined}
                  teraControl={
                    !player.terastallized && (
                      <div className="battle-tera-control">
                        <button
                          className={`button secondary${teraSelected ? ' is-selected' : ''}`}
                          aria-pressed={teraSelected}
                          disabled={resolving}
                          onClick={() => setTeraSelected((selected) => !selected)}
                        >
                          {teraSelected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                          {t('battle.terastallize')} <TypeBadge type={player.member.tera} />
                        </button>
                      </div>
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="battle-console">
            {battle.phase === 'won' || battle.phase === 'lost' ? (
              <div className="battle-result" role="status">
                <h2>{t(battle.phase === 'won' ? 'battle.victory' : 'battle.defeat')}</h2>
                <button
                  className="button primary"
                  onClick={() => {
                    setScreen('idle')
                    setBattle(null)
                    setEvents([])
                    setTeraSelected(false)
                    setShowSwitches(false)
                  }}
                >
                  {t('battle.playAgain')}
                </button>
              </div>
            ) : choosingSwitch ? (
              <div className="battle-actions">
                <h2>{t('battle.chooseReplacement')}</h2>
                <div className="battle-switches">
                  {availableSwitches.map(({ pokemon, index }) => (
                    <BattleSwitchButton
                      key={pokemon.member.id}
                      pokemon={pokemon}
                      disabled={resolving}
                      onChoose={() => void play({ kind: 'switch', index })}
                    />
                  ))}
                </div>
                {battle.phase !== 'player-switch' && (
                  <button
                    className="button secondary battle-cancel-switch"
                    disabled={resolving}
                    onClick={() => setShowSwitches(false)}
                  >
                    {t('battle.cancelSwitch')}
                  </button>
                )}
              </div>
            ) : (
              <div className="battle-actions">
                <h2>{t('battle.chooseAction', { name: prettyName(player.pokemon.name) })}</h2>
                <div className="battle-moves">
                  {player.moves.map((move, index) => (
                    <BattleMoveButton
                      key={`${move.data.name}-${index}`}
                      move={move}
                      opponent={battle.opponent.roster[battle.opponent.active]}
                      disabled={resolving}
                      onChoose={() => void play({ kind: 'move', index, tera: teraSelected })}
                    />
                  ))}
                </div>
                <div className="battle-secondary-actions">
                  <button className="button secondary" disabled={resolving} onClick={() => setShowSwitches(true)}>
                    {t('battle.switch')}
                  </button>
                </div>
              </div>
            )}

            <div className="battle-log" aria-label={t('battle.log')} aria-live="polite" aria-atomic="false">
              <strong>{t('battle.turn', { turn: battle.turn })}</strong>
              {resolving && <p className="battle-resolving">{t('battle.resolving')}</p>}
              {events.length === 0 && !resolving ? (
                <p>{t('battle.ready')}</p>
              ) : (
                events
                  .slice(-8)
                  .map((event, index) => (
                    <BattleLogEvent key={`${events.length - 8 + index}-${event.type}`} event={event} />
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
