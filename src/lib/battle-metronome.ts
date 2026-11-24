import type { CompactMetronomeMove } from 'virtual:battle-metronome-moves'
import { API_BASE_URL } from '../config/app'
import { parseBattleMove } from './battle-move-parser'
import type { BattleMove } from './battle'

let pool: readonly BattleMove[] | undefined
let pendingPool: Promise<readonly BattleMove[]> | undefined

function apiRef(resource: string, name: string) {
  return { name, url: `${API_BASE_URL}/${resource}/${encodeURIComponent(name)}/` }
}

function toBattleMovePayload(move: CompactMetronomeMove) {
  return {
    name: move.name,
    type: apiRef('type', move.type),
    damage_class: apiRef('move-damage-class', move.damageClass),
    power: move.power,
    accuracy: move.accuracy,
    priority: move.priority,
    pp: move.pp,
    target: apiRef('move-target', move.target),
    effect_chance: move.effectChance,
    meta: move.meta
      ? {
          healing: move.meta.healing,
          drain: move.meta.drain,
          ailment: apiRef('move-ailment', move.meta.ailment),
          ailment_chance: move.meta.ailmentChance,
          min_hits: move.meta.minHits,
          max_hits: move.meta.maxHits,
          crit_rate: move.meta.critRate,
          flinch_chance: move.meta.flinchChance,
          stat_chance: move.meta.statChance,
        }
      : null,
    stat_changes: move.statChanges.map((entry) => ({
      stat: apiRef('stat', entry.stat),
      change: entry.change,
    })),
    flavor_text_entries: move.flavorTexts.map((entry) => ({
      language: apiRef('language', entry.language),
      flavor_text: entry.text,
    })),
  }
}

/** Loads and validates the Gen 9 eligible Metronome pool on demand so battles without Metronome avoid the payload. */
export async function preloadMetronomeMovePool(): Promise<readonly BattleMove[]> {
  if (pool) return pool
  if (!pendingPool) {
    pendingPool = import('virtual:battle-metronome-moves')
      .then(({ default: moves }) => {
        pool = moves.map((move) => parseBattleMove(toBattleMovePayload(move)))
        return pool
      })
      .finally(() => {
        pendingPool = undefined
      })
  }
  return pendingPool
}

/** Gen 9 eligibility derived from the bundled Showdown reference, in move ID order. */
export function metronomeMovePool(): readonly BattleMove[] {
  return pool ?? []
}
