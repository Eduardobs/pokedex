import { FEATURED_POKEMON_MAX_ID } from '../config/app'

/** Skip the previous specimen without biasing the remaining national IDs. */
export function randomFeaturedPokemonId(previous: number | null, sample: number): number {
  const hasPrevious =
    previous !== null && Number.isInteger(previous) && previous >= 1 && previous <= FEATURED_POKEMON_MAX_ID
  const count = FEATURED_POKEMON_MAX_ID - (hasPrevious ? 1 : 0)
  const unit = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 1 - Number.EPSILON) : 0
  const id = Math.floor(unit * count) + 1
  return hasPrevious && id >= previous ? id + 1 : id
}

export function parseFeaturedPokemon(value: unknown): { id: number; name: string } {
  if (!value || typeof value !== 'object' || !('id' in value) || !('name' in value))
    throw new Error('Invalid featured Pokémon')
  const { id, name } = value
  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    id < 1 ||
    id > FEATURED_POKEMON_MAX_ID ||
    typeof name !== 'string' ||
    name.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
  )
    throw new Error('Invalid featured Pokémon')
  return { id, name }
}
