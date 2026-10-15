import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dices, RotateCcw, Shield, Swords } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { STORAGE_KEYS } from '../config/app'
import { prettyName } from '../lib/api'
import { loadBattleRoster } from '../lib/battle-data'
import {
  chooseOpponentAction,
  createBattleState,
  isBattleReadyTeam,
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
  const { t } = useLanguage()
  const percent = Math.max(0, Math.round((pokemon.hp / pokemon.maxHp) * 100))
  return (
    <div className="battle-health">
      <div className="battle-health-copy">
        <strong>{prettyName(pokemon.pokemon.name)}</strong>
        <span>{t('battle.level', { level: pokemon.member.level })}</span>
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
          {pokemon.hp} / {pokemon.maxHp}
        </span>
      </div>
    </div>
  )
}

function ActivePokemon({ side, opponent = false }: { side: BattleSide; opponent?: boolean }) {
  const pokemon = side.roster[side.active]
  const sprite = pokemon.member.shiny ? pokemon.pokemon.homeShinySprite : pokemon.pokemon.homeSprite
  return (
    <article className={`battle-active${opponent ? ' opponent' : ' player'}`}>
      <HealthBar pokemon={pokemon} />
      <div className="battle-pokemon-visual">
        {sprite ? (
          <img src={sprite} alt={prettyName(pokemon.pokemon.name)} width="180" height="180" />
        ) : (
          <Shield aria-hidden="true" />
        )}
        <div className="battle-active-types">
          {(pokemon.terastallized ? [pokemon.member.tera] : pokemon.pokemon.types).map((type) => (
            <TypeBadge key={type} type={type} iconOnly />
          ))}
        </div>
      </div>
    </article>
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
    try {
      const [playerRoster, randomPokemon] = await Promise.all([
        loadBattleRoster(team, controller.signal),
        loadRandomTeamPokemon(controller.signal),
      ])
      const opponentTeam = createRandomTeam(t('battle.opponentTeam'), randomPokemon)
      const opponentRoster = await loadBattleRoster(opponentTeam, controller.signal)
      if (controller.signal.aborted) return
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
            <ActivePokemon side={battle.opponent} opponent />
            <div className="battle-versus" aria-hidden="true">
              <Swords />
            </div>
            <ActivePokemon side={battle.player} />
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
                  }}
                >
                  {t('battle.playAgain')}
                </button>
              </div>
            ) : battle.phase === 'player-switch' ? (
              <div className="battle-actions">
                <h2>{t('battle.chooseReplacement')}</h2>
                <div className="battle-switches">
                  {availableSwitches.map(({ pokemon, index }) => (
                    <button key={pokemon.member.id} onClick={() => play({ kind: 'switch', index })}>
                      {prettyName(pokemon.pokemon.name)}{' '}
                      <small>
                        {pokemon.hp}/{pokemon.maxHp} HP
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="battle-actions">
                <h2>{t('battle.chooseAction', { name: prettyName(player.pokemon.name) })}</h2>
                <div className="battle-moves">
                  {player.moves.map((move, index) => (
                    <button
                      key={`${move.data.name}-${index}`}
                      disabled={move.pp <= 0}
                      onClick={() => play({ kind: 'move', index, tera: teraSelected })}
                    >
                      <span>{prettyName(move.data.name)}</span>
                      <TypeBadge type={move.data.type} />
                      <small>{t('battle.pp', { current: move.pp, total: move.data.pp })}</small>
                    </button>
                  ))}
                </div>
                <div className="battle-secondary-actions">
                  <button
                    className="button secondary"
                    disabled={battle.player.teraUsed}
                    aria-pressed={teraSelected}
                    onClick={() => setTeraSelected((selected) => !selected)}
                  >
                    {t(battle.player.teraUsed ? 'battle.teraUsed' : 'battle.terastallize', {
                      type: prettyName(player.member.tera),
                    })}
                  </button>
                  <details>
                    <summary>{t('battle.switch')}</summary>
                    <div className="battle-switches">
                      {availableSwitches.map(({ pokemon, index }) => (
                        <button key={pokemon.member.id} onClick={() => play({ kind: 'switch', index })}>
                          {prettyName(pokemon.pokemon.name)}{' '}
                          <small>
                            {pokemon.hp}/{pokemon.maxHp} HP
                          </small>
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
