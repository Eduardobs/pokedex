import { useMemo } from 'react'
import { intersectPokemonTypes, type PokemonType } from '../lib/pokemon-directory'
import type { NamedResource } from '../types'
import { useApi } from './useApi'

type PokemonTypeResponse = { pokemon: { pokemon: NamedResource }[] }

export function usePokemonTypeFilter(types: readonly PokemonType[]) {
  const first = useApi<PokemonTypeResponse>(types[0] ? `type/${types[0]}` : null)
  const second = useApi<PokemonTypeResponse>(types[1] ? `type/${types[1]}` : null)
  const hasTypes = types.length > 0
  const hasSecondType = types.length > 1
  const data = useMemo(() => {
    if (!hasTypes || !first.data || (hasSecondType && !second.data)) return null
    const pokemon = first.data.pokemon.map((entry) => entry.pokemon)
    return hasSecondType && second.data
      ? intersectPokemonTypes(
          pokemon,
          second.data.pokemon.map((entry) => entry.pokemon),
        )
      : pokemon
  }, [first.data, second.data, hasTypes, hasSecondType])

  return {
    data,
    loading: (hasTypes && first.loading) || (hasSecondType && second.loading),
    error: (hasTypes && first.error) || (hasSecondType && second.error),
    retry: () => {
      if (first.error) first.retry()
      if (second.error) second.retry()
    },
  }
}
