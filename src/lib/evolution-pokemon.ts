import { ApiError } from './api-client'
import { parsePokemonTypes } from './pokemon-card-catalog'

export function parseEvolutionPokemon(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    value.id > 100_000 ||
    !('types' in value)
  ) {
    throw new ApiError('PokéAPI returned invalid evolution Pokémon data.', undefined, 'invalid-response')
  }
  return { id: value.id, types: parsePokemonTypes(value.types).sort((a, b) => a.slot - b.slot) }
}
