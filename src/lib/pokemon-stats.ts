export type StatRange = {
  minimum: number
  maximum: number
}

/**
 * Returns the possible stat range at level 100 in the modern main-series games.
 * The minimum uses 0 IVs/EVs and a hindering nature; the maximum uses 31 IVs,
 * 252 EVs and a beneficial nature. Nature does not affect HP.
 */
export function level100StatRange(baseStat: number, statName: string, pokemonName?: string): StatRange {
  if (statName === 'hp') {
    if (pokemonName === 'shedinja') return { minimum: 1, maximum: 1 }
    return {
      minimum: 2 * baseStat + 110,
      maximum: 2 * baseStat + 204,
    }
  }

  return {
    minimum: Math.floor((2 * baseStat + 5) * 0.9),
    maximum: Math.floor((2 * baseStat + 99) * 1.1),
  }
}
