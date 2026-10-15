import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Dices, RotateCcw, Shield, Swords, UserRound } from 'lucide-react'
import { ItemImage } from '../components/ItemImage'
import { PageHeader } from '../components/PageHeader'
import { TypeBadge } from '../components/TypeBadge'
import { DamageClassBadge } from '../components/SemanticBadges'
import { useLanguage } from '../contexts/LanguageContext'
import { STORAGE_KEYS } from '../config/app'
import { formatDecimal, formatNumber, localizedName, localizedText, prettyName } from '../lib/api'
import { loadBattleRoster } from '../lib/battle-data'
import {
  chooseOpponentAction,
  battleMoveEffectiveness,
  createBattleState,
  isBattleReadyTeam,
  possibleBattleStats,
  resolveBattleTurn,
  type BattleChoice,
  type BattleEvent,
  type BattlePokemon,
  type BattleSide,
  type BattleState,
} from '../lib/battle'
import { createRandomTeam, loadRandomTeamPokemon } from '../lib/random-team'
import { readStorage } from '../lib/storage'
import { validTeams, type Team } from '../lib/teams'

type ScreenState = 'idle' | 'loading' | 'error' | 'battle'

function HealthBar({ pokemon }: { pokemon: BattlePokemon }) {
  const { language, t } = useLanguage()
  const percent = Math.max(0, Math.round((pokemon.hp / pokemon.maxHp) * 100))
  const stages = Object.entries(pokemon.stages)
    .filter(([, value]) => value !== 0)
    .map(([stat, value]) => ({ stat: stat as keyof typeof pokemon.stages, value }))
  return (
    <div className="battle-health">
      <div className="battle-health-copy">
        <div>
          <small>{t('battle.number', { number: formatNumber(pokemon.pokemon.id, language) })}</small>
          <strong>{prettyName(pokemon.pokemon.name)}</strong>
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
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="battle-health-meta">
        <span>{pokemon.status ? t(`battle.status.${pokemon.status}`) : t('battle.statusHealthy')}</span>
        <span>
          {formatNumber(pokemon.hp, language)} / {formatNumber(pokemon.maxHp, language)}
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
}: {
  side: BattleSide
  opponent?: boolean
  teraControl?: ReactNode
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
    <article
      className={`battle-active${opponent ? ' opponent' : ' player'}`}
      tabIndex={0}
      aria-label={t('battle.activePokemonDetails', { name: prettyName(pokemon.pokemon.name) })}
      aria-describedby={tooltipId}
    >
      <div className="battle-active-data">
        <HealthBar pokemon={pokemon} />
        {teraControl}
      </div>
      <div className="battle-pokemon-visual">
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
        <div className="battle-active-types">
          {(pokemon.terastallized ? [pokemon.member.tera] : pokemon.pokemon.types).map((type) => (
            <TypeBadge key={type} type={type} iconOnly />
          ))}
        </div>
      </div>
      <span id={tooltipId} className="battle-active-tooltip-anchor">
        <ActivePokemonTooltip pokemon={pokemon} opponent={opponent} />
      </span>
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
}: {
  move: BattlePokemon['moves'][number]
  opponent: BattlePokemon
  onChoose: () => void
}) {
  const tooltipId = useId()
  const { apiLanguage, language, t } = useLanguage()
  const description = moveDescription(move.data, apiLanguage)
  const number = (value: number | null) => (value === null ? '—' : formatNumber(value, language))
  const effectiveness = formatDecimal(battleMoveEffectiveness(move.data, opponent), language, 2)
  return (
    <button
      className="battle-move-button"
      disabled={move.pp <= 0}
      aria-label={prettyName(move.data.name)}
      aria-describedby={tooltipId}
      onClick={onChoose}
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
          {t('battle.effectiveness')}: <b>{effectiveness}×</b>
        </span>
        <span className="battle-tooltip-description">
          <b>{t('resource.field.description')}</b>
          {description || t('battle.moveDescriptionUnavailable')}
        </span>
      </span>
    </button>
  )
}

const battleStatKeys = [
  'pokedex.sort.hp',
  'stats.attack',
  'stats.defense',
  'stats.specialAttack',
  'stats.specialDefense',
  'stats.speed',
] as const

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

function ActivePokemonTooltip({ pokemon, opponent }: { pokemon: BattlePokemon; opponent: boolean }) {
  const { language, t } = useLanguage()
  const stats = opponent ? possibleBattleStats(pokemon.pokemon, pokemon.member.level) : pokemon.stats
  const itemVisible = !opponent || pokemon.member.itemActive
  return (
    <span className="battle-active-tooltip" role="tooltip">
      <b className="battle-active-tooltip-title">{t(opponent ? 'battle.opponentDetails' : 'battle.allyDetails')}</b>
      <span className="battle-tooltip-stats">
        {stats.map((stat, index) => (
          <span key={battleStatKeys[index]}>
            <small>{t(battleStatKeys[index])}</small>
            <b>
              {Array.isArray(stat)
                ? t('battle.statRange', {
                    minimum: formatNumber(stat[0], language),
                    maximum: formatNumber(stat[1], language),
                  })
                : formatNumber(stat, language)}
            </b>
          </span>
        ))}
      </span>
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

function BattleSwitchButton({ pokemon, onChoose }: { pokemon: BattlePokemon; onChoose: () => void }) {
  const tooltipId = useId()
  const { language, t } = useLanguage()
  const hpPercentage = Math.round((pokemon.hp / pokemon.maxHp) * 100)
  return (
    <button
      className="battle-switch-button"
      aria-label={prettyName(pokemon.pokemon.name)}
      aria-describedby={tooltipId}
      onClick={onChoose}
    >
      {prettyName(pokemon.pokemon.name)}{' '}
      <small>
        {formatNumber(pokemon.hp, language)}/{formatNumber(pokemon.maxHp, language)} HP
      </small>
      <span id={tooltipId} className="battle-switch-tooltip" role="tooltip">
        <span className="battle-switch-tooltip-title">
          <b>{prettyName(pokemon.pokemon.name)}</b>
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
        <span className="battle-switch-stats">
          {pokemon.stats.map((value, index) => (
            <span key={battleStatKeys[index]}>
              <span className="battle-switch-stat-name">{t(battleStatKeys[index])}</span>
              <b>{formatNumber(value, language)}</b>
            </span>
          ))}
        </span>
        <span className="battle-switch-tooltip-moves">
          <b>{t('battle.availableMoves')}</b>
          <span>
            {pokemon.moves.map((move, index) => (
              <span key={`${move.data.name}-${index}`}>
                {prettyName(move.data.name)} · {t('battle.pp', { current: move.pp, total: move.data.pp })}
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

export function BattlePage() {
  const { t } = useLanguage()
  const teams = readStorage<Team[]>(STORAGE_KEYS.teams, validTeams, []).filter(isBattleReadyTeam)
  const [selectedTeam, setSelectedTeam] = useState(teams[0]?.id ?? '')
  const [screen, setScreen] = useState<ScreenState>('idle')
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [events, setEvents] = useState<BattleEvent[]>([])
  const [teraSelected, setTeraSelected] = useState(false)
  const [showSwitches, setShowSwitches] = useState(false)
  const [trainerSprites, setTrainerSprites] = useState(randomTrainerSprites)
  const requestRef = useRef<AbortController | null>(null)
  useEffect(() => () => requestRef.current?.abort(), [])

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

  const play = (choice: BattleChoice) => {
    if (!battle || battle.phase === 'won' || battle.phase === 'lost') return
    if (choice.kind === 'switch') setShowSwitches(false)
    let result = resolveBattleTurn(battle, choice, chooseOpponentAction(battle))
    if (result.state.phase === 'opponent-switch') {
      const automatic = resolveBattleTurn(result.state, choice, chooseOpponentAction(result.state))
      result = {
        state: automatic.state,
        events: [...result.events, ...automatic.events.filter((event) => event.type !== 'turn')],
      }
    }
    setBattle(result.state)
    setEvents((current) => [...current, ...result.events])
    setTeraSelected(false)
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
                setScreen('idle')
                setBattle(null)
                setEvents([])
                setTeraSelected(false)
                setShowSwitches(false)
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
          <div className="battle-field" aria-label={t('battle.field')}>
            <div className="battle-side opponent">
              <ActivePokemon side={battle.opponent} opponent />
              <TrainerPanel side={battle.opponent} opponent sprite={trainerSprites.opponent} />
            </div>
            <div className="battle-versus" aria-hidden="true">
              <Swords />
            </div>
            <div className="battle-side player">
              <ActivePokemon
                side={battle.player}
                teraControl={
                  !player.terastallized && (
                    <div className="battle-tera-control">
                      <button
                        className={`button secondary${teraSelected ? ' is-selected' : ''}`}
                        aria-pressed={teraSelected}
                        aria-label={t('battle.terastallize', {
                          type: prettyName(player.member.tera),
                        })}
                        onClick={() => setTeraSelected((selected) => !selected)}
                      >
                        {teraSelected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                        {t('battle.terastallize', {
                          type: prettyName(player.member.tera),
                        })}
                      </button>
                      <TypeBadge type={player.member.tera} />
                    </div>
                  )
                }
              />
              <TrainerPanel side={battle.player} opponent={false} sprite={trainerSprites.player} />
            </div>
          </div>

          <div className="battle-console">
            <div className="battle-log" aria-label={t('battle.log')} aria-live="polite" aria-atomic="false">
              <strong>{t('battle.turn', { turn: battle.turn })}</strong>
              {events.length === 0 ? (
                <p>{t('battle.ready')}</p>
              ) : (
                events
                  .slice(-8)
                  .map((event, index) => (
                    <p key={`${events.length - 8 + index}-${event.type}`}>{eventText(event, t)}</p>
                  ))
              )}
            </div>

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
                      onChoose={() => play({ kind: 'switch', index })}
                    />
                  ))}
                </div>
                {battle.phase !== 'player-switch' && (
                  <button className="button secondary battle-cancel-switch" onClick={() => setShowSwitches(false)}>
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
                      onChoose={() => play({ kind: 'move', index, tera: teraSelected })}
                    />
                  ))}
                </div>
                <div className="battle-secondary-actions">
                  <button className="button secondary" onClick={() => setShowSwitches(true)}>
                    {t('battle.switch')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
