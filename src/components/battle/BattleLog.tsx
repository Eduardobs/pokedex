import { useEffect, useId, useMemo, useRef } from 'react'
import { ArrowDown, ArrowRightLeft, CircleDotDashed, HeartPulse, Sparkles, Swords, Trophy, Zap } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatNumber, prettyName } from '../../lib/api'
import {
  STRUGGLE_MOVE,
  type BattleMove,
  type BattleEvent,
  type BattlePokemon,
  type BattleState,
} from '../../lib/battle'
import { TypeBadge } from '../TypeBadge'
import { TeraTypeBadge } from '../TeraTypeBadge'
import { DamageClassBadge } from '../SemanticBadges'
import { BattleDetails, BattleTooltipContent } from './BattleDetails'
import { battleTooltipBindings } from './battle-tooltip'
import { eventText, moveDescription } from './battle-text'

function BattleLogMove({ move, data }: { move: string; data?: BattleMove }) {
  if (!data && move.toLowerCase() === 'struggle') data = STRUGGLE_MOVE
  const tooltipId = useId()
  const { apiLanguage, language, t } = useLanguage()
  const description =
    data?.name === 'struggle' ? t('battle.struggleDescription') : data ? moveDescription(data, apiLanguage) : ''
  return (
    <BattleDetails
      label={t('battle.activePokemonDetails', { name: move })}
      tooltip={
        <BattleTooltipContent id={tooltipId} className="battle-log-move-tooltip">
          <span className="battle-log-move-meta">
            {data && (
              <span className="battle-log-move-icons">
                <TypeBadge type={data.type} iconOnly />
                <DamageClassBadge value={data.damageClass} compact />
              </span>
            )}
            <span className="battle-log-move-priority">
              {t('move.priority')}: <b>{data ? formatNumber(data.priority, language) : '—'}</b>
            </span>
          </span>
          <span>
            {t('move.power')}: <b>{data?.power === null || !data ? '—' : formatNumber(data.power, language)}</b>
          </span>
          <span>
            {t('move.accuracy')}:{' '}
            <b>{data?.accuracy === null || !data ? '—' : formatNumber(data.accuracy, language)}</b>
          </span>
          <span>{description || t('battle.moveDescriptionUnavailable')}</span>
        </BattleTooltipContent>
      }
      action={false}
    >
      {(detailProps, detailTooltip) => (
        <span
          className="battle-log-move-trigger"
          {...detailProps}
          tabIndex={0}
          aria-describedby={detailTooltip ? tooltipId : undefined}
          {...battleTooltipBindings(tooltipId)}
        >
          {move}
          {detailTooltip}
        </span>
      )}
    </BattleDetails>
  )
}

function BattleLogEvent({ event, move }: { event: BattleEvent; move?: BattleMove }) {
  const { t } = useLanguage()
  const text = eventText(event, t)
  const name = 'pokemon' in event ? prettyName(event.pokemon) : ''
  const nameIndex = name ? text.indexOf(name) : -1
  const moveName = event.type === 'move' ? prettyName(event.move) : ''
  const moveIndex = event.type === 'move' && moveName ? text.indexOf(moveName, nameIndex + name.length) : -1
  const teraName = event.type === 'tera' ? prettyName(event.tera) : ''
  const teraIndex = event.type === 'tera' ? text.indexOf(teraName, nameIndex + name.length) : -1
  const tone =
    event.type === 'damage' ||
    event.type === 'substituteDamage' ||
    event.type === 'hazardDamage' ||
    event.type === 'statusDamage' ||
    event.type === 'weatherDamage'
      ? 'damage'
      : event.type === 'heal'
        ? 'healing'
        : event.type === 'move'
          ? 'move'
          : [
                'status',
                'statusCured',
                'stage',
                'encore',
                'taunt',
                'stagesReset',
                'teamStatusCured',
                'fieldSet',
                'fieldEnded',
                'sideConditionSet',
                'sideConditionEnded',
                'fieldBlocked',
                'substituteSet',
                'itemActivated',
              ].includes(event.type)
            ? 'effect'
            : event.type === 'faint' || event.type === 'win' || event.type === 'tera'
              ? 'important'
              : 'neutral'
  const Icon =
    event.type === 'faint'
      ? ArrowDown
      : event.type === 'win'
        ? Trophy
        : event.type === 'switch'
          ? ArrowRightLeft
          : tone === 'damage'
            ? Zap
            : tone === 'healing'
              ? HeartPulse
              : tone === 'move'
                ? Swords
                : tone === 'effect' || event.type === 'tera'
                  ? Sparkles
                  : CircleDotDashed
  if (event.type === 'turn') return <p className="battle-log-turn">{text}</p>
  return (
    <p className={`battle-log-event is-${tone}`}>
      <Icon className="battle-log-icon" size={15} aria-hidden="true" />
      <span>
        {event.type === 'tera' && nameIndex >= 0 && teraIndex >= 0 ? (
          <>
            {text.slice(0, nameIndex)}
            <strong>{name}</strong>
            {text.slice(nameIndex + name.length, teraIndex)}
            <TeraTypeBadge type={event.tera} />
            {text.slice(teraIndex + teraName.length)}
          </>
        ) : nameIndex >= 0 ? (
          <>
            {text.slice(0, nameIndex)}
            <strong>{name}</strong>
            {moveIndex >= 0 ? (
              <>
                {text.slice(nameIndex + name.length, moveIndex)}
                <BattleLogMove move={moveName} data={move} />
                {text.slice(moveIndex + moveName.length)}
              </>
            ) : (
              text.slice(nameIndex + name.length)
            )}
          </>
        ) : (
          text
        )}
      </span>
    </p>
  )
}

function movesByName(roster: BattlePokemon[]) {
  const moves = new Map<string, BattleMove>()
  for (const pokemon of roster) {
    for (const { data } of pokemon.moves) {
      if (!moves.has(data.name)) moves.set(data.name, data)
    }
  }
  return moves
}

export function BattleLog({
  battle,
  events,
  resolving,
}: {
  battle: BattleState
  events: BattleEvent[]
  resolving: boolean
}) {
  const { t } = useLanguage()
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [events.length])
  const entries = useMemo(() => {
    const moves = { player: movesByName(battle.player.roster), opponent: movesByName(battle.opponent.roster) }
    return events.map((event, index) => (
      <BattleLogEvent
        key={index}
        event={event}
        move={event.type === 'move' ? moves[event.side].get(event.move) : undefined}
      />
    ))
  }, [events, battle.player.roster, battle.opponent.roster])
  return (
    <div
      role="log"
      className="battle-log"
      ref={logRef}
      tabIndex={0}
      aria-label={t('battle.log')}
      aria-live="polite"
      aria-atomic="false"
    >
      <strong>{t('battle.turn', { turn: battle.turn })}</strong>
      {resolving && <p className="battle-resolving">{t('battle.resolving')}</p>}
      {events.length === 0 && !resolving ? <p>{t('battle.ready')}</p> : entries}
    </div>
  )
}
