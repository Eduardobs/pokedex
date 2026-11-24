import { useEffect, useRef, useState } from 'react'
import { ArrowRightLeft, Check, Skull, Trophy } from 'lucide-react'
import { BATTLE_TIMING, type BattleDifficulty } from '../../config/app'
import { useLanguage } from '../../contexts/LanguageContext'
import { prettyName } from '../../lib/api'
import {
  legalBattleMoveIndexes,
  resolveBattleTurnSteps,
  STRUGGLE_INDEX,
  STRUGGLE_MOVE,
  type BattleChoice,
  type BattleEvent,
  type BattleState,
} from '../../lib/battle'
import { chooseOpponentAction } from '../../lib/battle-ai'
import { battlePokemonName } from '../../lib/battle-abilities'
import { TeraTypeBadge } from '../TeraTypeBadge'
import { ActivePokemon } from './ActivePokemon'
import { BattleFieldEffects, BattleSideHazards } from './BattleFieldEffects'
import { BattleMoveButton, BattleSwitchButton } from './BattleActionButtons'
import { BattleLog } from './BattleLog'
import { TrainerPanel, randomTrainerSprites } from './TrainerPanel'

type ActiveMove = { side: 'player' | 'opponent'; name: string }

function waitForBattleDelay(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration))
}

export function BattleArena({
  initialState,
  difficulty,
  onExit,
}: {
  initialState: BattleState
  difficulty: BattleDifficulty
  onExit: () => void
}) {
  const { t } = useLanguage()
  const [battle, setBattle] = useState(initialState)
  const [events, setEvents] = useState<BattleEvent[]>([])
  const [teraSelected, setTeraSelected] = useState(false)
  const [showSwitches, setShowSwitches] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [activeMove, setActiveMove] = useState<ActiveMove | null>(null)
  const [missedSide, setMissedSide] = useState<'player' | 'opponent' | null>(null)
  const [hitSide, setHitSide] = useState<'player' | 'opponent' | null>(null)
  const [trainerSprites] = useState(randomTrainerSprites)
  const sequenceRef = useRef(0)
  useEffect(
    () => () => {
      sequenceRef.current += 1
    },
    [],
  )

  const play = async (choice: BattleChoice) => {
    if (resolving || battle.phase === 'won' || battle.phase === 'lost') return
    if (choice.kind === 'switch') setShowSwitches(false)
    const sequence = ++sequenceRef.current
    setResolving(true)
    let steps = resolveBattleTurnSteps(battle, choice, chooseOpponentAction(battle, Math.random, difficulty))
    let lastState = steps.at(-1)?.state
    while (lastState?.phase === 'opponent-switch') {
      const automatic = resolveBattleTurnSteps(
        lastState,
        choice,
        chooseOpponentAction(lastState, Math.random, difficulty),
      )
      if (automatic.length) {
        automatic[0] = { ...automatic[0], events: automatic[0].events.filter((event) => event.type !== 'turn') }
      }
      steps = [...steps, ...automatic]
      lastState = automatic.at(-1)?.state
    }
    let presentedState = battle
    for (const step of steps) {
      setActiveMove(step.action?.move ? { side: step.action.side, name: step.action.move } : null)
      if (step.action) await waitForBattleDelay(BATTLE_TIMING.actionDelayMs)
      if (sequenceRef.current !== sequence) return
      setActiveMove(null)
      const defender = step.action?.side === 'player' ? 'opponent' : 'player'
      const previousDefender = presentedState[defender].roster[presentedState[defender].active]
      const nextDefender = step.state[defender].roster[step.state[defender].active]
      const receivedHit =
        step.action?.move &&
        previousDefender.member.id === nextDefender.member.id &&
        (nextDefender.hp < previousDefender.hp || nextDefender.substituteHp < previousDefender.substituteHp) &&
        step.events.some(
          (event) =>
            (event.type === 'damage' || event.type === 'substituteDamage') &&
            event.pokemon === battlePokemonName(nextDefender) &&
            event.amount > 0,
        )
      setMissedSide(step.action?.move && step.events.some((event) => event.type === 'miss') ? defender : null)
      setHitSide(receivedHit ? defender : null)
      presentedState = step.state
      setBattle(step.state)
      setEvents((current) => [...current, ...step.events])
      if (step.action) await waitForBattleDelay(BATTLE_TIMING.resultDisplayMs)
      if (sequenceRef.current !== sequence) return
      setHitSide(null)
      setMissedSide(null)
    }
    setTeraSelected(false)
    setResolving(false)
  }

  const player = battle.player.roster[battle.player.active]
  const availableSwitches = battle.player.roster.flatMap((pokemon, index) =>
    index !== battle.player.active && pokemon.hp > 0 ? [{ pokemon, index }] : [],
  )
  const choosingSwitch = battle.phase === 'player-switch' || showSwitches

  const legalMoves = legalBattleMoveIndexes(player)
  return (
    <div className="battle-shell">
      <div className="battle-arena">
        <div className="battle-trainers">
          <TrainerPanel side={battle.player} opponent={false} sprite={trainerSprites.player} />
          <TrainerPanel side={battle.opponent} opponent sprite={trainerSprites.opponent} />
        </div>
        <div className="battle-field" aria-label={t('battle.field')} aria-busy={resolving}>
          <BattleFieldEffects field={battle.field} player={battle.player} opponent={battle.opponent} />
          <div className="battle-side opponent">
            <BattleSideHazards hazards={battle.opponent.hazards} side="opponent" />
            <ActivePokemon
              missed={missedSide === 'opponent'}
              hit={hitSide === 'opponent'}
              side={battle.opponent}
              opponent
              activeMove={activeMove?.side === 'opponent' ? activeMove.name : undefined}
            />
          </div>
          <div className="battle-side player">
            <BattleSideHazards hazards={battle.player.hazards} side="player" />
            <ActivePokemon
              missed={missedSide === 'player'}
              hit={hitSide === 'player'}
              side={battle.player}
              activeMove={activeMove?.side === 'player' ? activeMove.name : undefined}
              teraControl={
                !player.terastallized && (
                  <div className="battle-tera-control">
                    <button
                      className={`button secondary${teraSelected ? ' is-selected' : ''}`}
                      aria-pressed={teraSelected}
                      disabled={
                        resolving ||
                        battle.phase !== 'choice' ||
                        player.hp === 0 ||
                        player.recharging ||
                        player.chargingMoveIndex !== undefined
                      }
                      onClick={() => setTeraSelected((selected) => !selected)}
                    >
                      {teraSelected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                      {t('battle.terastallize')} <TeraTypeBadge type={player.member.tera} />
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
            {battle.phase === 'won' ? (
              <Trophy className="battle-result-icon" size={48} aria-hidden="true" />
            ) : (
              <Skull className="battle-result-icon" size={48} aria-hidden="true" />
            )}
            <h2>{t(battle.phase === 'won' ? 'battle.victory' : 'battle.defeat')}</h2>
            <button className="button primary" onClick={onExit}>
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
            {(player.recharging || player.chargingMoveIndex !== undefined) && (
              <button
                className="button primary"
                disabled={resolving}
                onClick={() => void play({ kind: 'move', index: player.chargingMoveIndex ?? 0 })}
              >
                {t(player.recharging ? 'battle.rechargeTurn' : 'battle.releaseMove')}
              </button>
            )}
            <div className="battle-moves">
              {legalMoves.includes(STRUGGLE_INDEX) && (
                <BattleMoveButton
                  move={{ data: STRUGGLE_MOVE, pp: 1 }}
                  opponent={battle.opponent.roster[battle.opponent.active]}
                  disabled={resolving}
                  onChoose={() => void play({ kind: 'move', index: STRUGGLE_INDEX, tera: teraSelected })}
                />
              )}
              {player.moves.map((move, index) => (
                <BattleMoveButton
                  key={`${move.data.name}-${index}`}
                  move={move}
                  opponent={battle.opponent.roster[battle.opponent.active]}
                  disabled={resolving || player.chargingMoveIndex !== undefined || !legalMoves.includes(index)}
                  onChoose={() => void play({ kind: 'move', index, tera: teraSelected })}
                />
              ))}
            </div>
            <div className="battle-secondary-actions">
              <button
                className="button secondary"
                disabled={
                  resolving ||
                  (!player.skyDropSourceId && (player.recharging || player.chargingMoveIndex !== undefined))
                }
                onClick={() => setShowSwitches(true)}
              >
                <ArrowRightLeft size={16} aria-hidden="true" /> {t('battle.switch')}
              </button>
            </div>
          </div>
        )}

        <BattleLog battle={battle} events={events} resolving={resolving} />
      </div>
    </div>
  )
}
