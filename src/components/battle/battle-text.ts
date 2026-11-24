import type { Translate } from '../../i18n/types'
import { prettyName } from '../../lib/api'
import type { BattleEvent, BattleMove } from '../../lib/battle'

export function moveDescription(move: BattleMove, language: string) {
  const descriptions = move.descriptions ?? []
  return (
    descriptions.find((entry) => entry.language === language)?.text ||
    descriptions.find((entry) => entry.language === 'en')?.text ||
    descriptions.find((entry) => entry.language === 'pt-br')?.text ||
    descriptions[0]?.text ||
    ''
  )
}

export function eventText(event: BattleEvent, t: Translate) {
  const name = 'pokemon' in event ? prettyName(event.pokemon) : ''
  const withHpPercentage = (text: string, percentage: number | undefined) =>
    percentage === undefined ? text : `${text} (${percentage}%)`
  switch (event.type) {
    case 'charging':
    case 'recharging':
    case 'futureSight':
      return t(`battle.log.${event.type}`, { name: prettyName(event.pokemon) })
    case 'turn':
      return t('battle.log.turn', { turn: event.turn })
    case 'move':
      return t('battle.log.move', { name, move: prettyName(event.move) })
    case 'hit':
      return t('battle.log.hit', { name, move: prettyName(event.move), hit: event.hit })
    case 'switch':
      return t('battle.log.switch', { name })
    case 'tera':
      return t('battle.log.tera', { name, type: prettyName(event.tera) })
    case 'miss':
      return t('battle.log.miss', { name })
    case 'immune':
      return t('battle.log.immune', { name })
    case 'damage':
      return withHpPercentage(
        event.critical
          ? t('battle.log.critical', { name, damage: event.amount })
          : event.effectiveness > 1
            ? t('battle.log.superEffective', { name, damage: event.amount })
            : event.effectiveness < 1
              ? t('battle.log.notEffective', { name, damage: event.amount })
              : t('battle.log.damage', { name, damage: event.amount }),
        event.percentage,
      )
    case 'hazardSet':
      return t('battle.log.hazardSet', {
        hazard: prettyName(event.hazard),
        side: t(`battle.log.side.${event.side}`),
      })
    case 'hazardDamage':
      return withHpPercentage(
        t('battle.log.hazardDamage', { name, hazard: prettyName(event.hazard), damage: event.amount }),
        event.percentage,
      )
    case 'hazardsCleared':
      return t('battle.log.hazardsCleared', { side: t(`battle.log.side.${event.side}`) })
    case 'heal':
      return withHpPercentage(t('battle.log.heal', { name, amount: event.amount }), event.percentage)
    case 'substituteSet':
      return t('battle.log.substituteSet', { name, hp: event.hp })
    case 'substituteDamage':
      return t(event.broken ? 'battle.log.substituteBroken' : 'battle.log.substituteDamage', {
        name,
        damage: event.amount,
      })
    case 'itemRemoved':
      return t('battle.log.itemRemoved', { name, item: prettyName(event.item) })
    case 'itemActivated':
      return t(event.consumed ? 'battle.log.itemConsumed' : 'battle.log.itemActivated', {
        name,
        item: prettyName(event.item),
      })
    case 'status':
      return t('battle.log.status', { name, status: t(`battle.status.${event.status}`) })
    case 'statusCured':
      return t('battle.log.statusCured', { name, status: t(`battle.status.${event.status}`) })
    case 'statusDamage':
      return withHpPercentage(t('battle.log.statusDamage', { name, damage: event.amount }), event.percentage)
    case 'asleep':
      return event.move
        ? t('battle.log.asleepMove', { name, move: prettyName(event.move) })
        : t('battle.log.asleep', { name })
    case 'wake':
      return t('battle.log.wake', { name })
    case 'thaw':
      return t('battle.log.thaw', { name })
    case 'ability':
      return t('battle.log.ability', { name, ability: prettyName(event.ability) })
    case 'stage':
      return t('battle.log.stage', { name, stat: t(`battle.stat.${event.stat}`), change: event.change })
    case 'encore':
      return t('battle.log.encore', { name, move: prettyName(event.move), turns: event.turns })
    case 'taunt':
      return t('battle.log.taunt', { name })
    case 'stagesReset':
      return t('battle.log.stagesReset', { name })
    case 'teamStatusCured':
      return t('battle.log.teamStatusCured', { side: t(`battle.log.side.${event.side}`) })
    case 'fieldSet':
      return t('battle.log.fieldSet', { effect: t(`battle.fieldEffect.${event.field}`), turns: event.turns })
    case 'fieldEnded':
      return t('battle.log.fieldEnded', { effect: t(`battle.fieldEffect.${event.field}`) })
    case 'sideConditionSet':
      return t('battle.log.sideConditionSet', {
        effect: t(`battle.fieldEffect.${event.condition}`),
        side: t(`battle.log.side.${event.side}`),
        turns: event.turns,
      })
    case 'sideConditionEnded':
      return t('battle.log.sideConditionEnded', {
        effect: t(`battle.fieldEffect.${event.condition}`),
        side: t(`battle.log.side.${event.side}`),
      })
    case 'fieldBlocked':
      return t('battle.log.fieldBlocked', { name, effect: t(`battle.fieldEffect.${event.field}`) })
    case 'protected':
      return t('battle.log.protected', { name })
    case 'weatherDamage':
      return withHpPercentage(
        t('battle.log.weatherDamage', {
          name,
          damage: event.amount,
          effect: t(`battle.fieldEffect.${event.weather}`),
        }),
        event.percentage,
      )
    case 'failed':
      return event.reason && event.move
        ? t(`battle.log.blockedMove.${event.reason}`, { name, move: prettyName(event.move) })
        : t('battle.log.failed', { name })
    case 'faint':
      return t('battle.log.faint', { name })
    case 'win':
      return t(event.side === 'player' ? 'battle.log.playerWin' : 'battle.log.opponentWin')
  }
}
