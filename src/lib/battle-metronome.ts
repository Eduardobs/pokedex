import { API_BASE_URL } from '../config/app'
import bundledMoves from '../data/third-party/pokeapi-battle-moves.json'
import eligibility from '../data/third-party/battle-metronome-moves.json'
import { parseBattleMove } from './battle-data'
import type { BattleMove } from './battle'

let pool: BattleMove[] | undefined

/** Gen 9 eligibility derived from the bundled Showdown reference, in move ID order. */
export function metronomeMovePool(): readonly BattleMove[] {
  if (!pool) {
    const names = new Set(eligibility.moves)
    const moves: typeof bundledMoves = JSON.parse(
      JSON.stringify(bundledMoves.filter((move) => names.has(move.name))).replaceAll(
        'https://pokeapi.co/api/v2',
        API_BASE_URL,
      ),
    )
    pool = moves.map(parseBattleMove)
  }
  return pool
}
