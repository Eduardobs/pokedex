import { createBattleState } from './battle'
import { loadBattleRoster } from './battle-data'
import { createRandomTeam, loadRandomTeamPokemon } from './random-team'
import type { Team } from './teams'

export async function prepareBattle(team: Team, opponentName: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const [playerRoster, randomPokemon] = await Promise.all([
    loadBattleRoster(team, signal),
    loadRandomTeamPokemon(signal),
  ])
  signal.throwIfAborted()
  const opponentTeam = createRandomTeam(opponentName, randomPokemon)
  const opponentRoster = await loadBattleRoster(opponentTeam, signal)
  signal.throwIfAborted()
  return createBattleState(team, playerRoster, opponentTeam, opponentRoster)
}
