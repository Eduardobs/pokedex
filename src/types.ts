export interface NamedResource { name: string; url: string }
export interface ApiList<T = NamedResource> { count: number; next: string | null; previous: string | null; results: T[] }

export interface PokemonListItem extends NamedResource { id: number }
export interface Pokemon {
  id: number
  name: string
  height: number
  weight: number
  base_experience: number | null
  order: number
  is_default: boolean
  location_area_encounters: string
  sprites: {
    front_default: string | null
    front_shiny: string | null
    other?: {
      ['official-artwork']?: { front_default: string | null; front_shiny: string | null }
      home?: { front_default: string | null; front_shiny: string | null }
    }
  }
  types: { slot: number; type: NamedResource }[]
  stats: { base_stat: number; effort: number; stat: NamedResource }[]
  abilities: { is_hidden: boolean; slot: number; ability: NamedResource }[]
  moves: { move: NamedResource; version_group_details: { level_learned_at: number; move_learn_method: NamedResource; version_group: NamedResource }[] }[]
  species: NamedResource
  forms: NamedResource[]
  game_indices: { game_index: number; version: NamedResource }[]
}

export interface Species {
  id: number
  name: string
  flavor_text_entries: { flavor_text: string; language: NamedResource; version: NamedResource }[]
  genera: { genus: string; language: NamedResource }[]
  color: NamedResource
  shape: NamedResource | null
  habitat: NamedResource | null
  generation: NamedResource
  growth_rate: NamedResource
  egg_groups: NamedResource[]
  evolution_chain: { url: string } | null
  gender_rate: number
  capture_rate: number
  base_happiness: number
  hatch_counter: number
  is_baby: boolean
  is_legendary: boolean
  is_mythical: boolean
  varieties: { is_default: boolean; pokemon: NamedResource }[]
}

export interface EvolutionChain {
  id: number
  chain: EvolutionNode
}
export interface EvolutionNode {
  species: NamedResource
  evolves_to: EvolutionNode[]
  evolution_details: Array<Record<string, unknown>>
}

export interface Encounter {
  location_area: NamedResource
  version_details: { version: NamedResource; max_chance: number; encounter_details: unknown[] }[]
}
