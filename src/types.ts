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
    back_default?: string | null
    back_shiny?: string | null
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
  cries?: { latest: string | null; legacy: string | null }
  held_items?: { item: NamedResource; version_details: { rarity: number; version: NamedResource }[] }[]
  past_abilities?: { abilities: { ability: NamedResource | null; is_hidden: boolean; slot: number }[]; generation: NamedResource }[]
  past_types?: { generation: NamedResource; types: { slot: number; type: NamedResource }[] }[]
}

export interface TypeDamageRelations {
  double_damage_from: NamedResource[]
  half_damage_from: NamedResource[]
  no_damage_from: NamedResource[]
}

export interface PokemonType {
  id: number
  name: string
  damage_relations: TypeDamageRelations
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
  has_gender_differences: boolean
  forms_switchable: boolean
  is_baby: boolean
  is_legendary: boolean
  is_mythical: boolean
  varieties: { is_default: boolean; pokemon: NamedResource }[]
}

export interface EvolutionChain {
  id: number
  baby_trigger_item: NamedResource | null
  chain: EvolutionNode
}
export interface EvolutionNode {
  is_baby: boolean
  species: NamedResource
  evolves_to: EvolutionNode[]
  evolution_details: EvolutionDetail[]
}

export interface EvolutionConditionExpression {
  expression: string
  percentage_chance: number | null
  variables: NamedResource[]
}

export interface EvolutionDetail {
  version_group?: NamedResource | null
  is_default?: boolean
  item: NamedResource | null
  trigger: NamedResource | null
  gender: number | null
  held_item: NamedResource | null
  known_move: NamedResource | null
  known_move_type: NamedResource | null
  location: NamedResource | null
  min_level: number | null
  min_happiness: number | null
  min_beauty: number | null
  min_affection: number | null
  near_special_rock: boolean
  needs_multiplayer?: boolean
  needs_overworld_rain: boolean
  party_species: NamedResource | null
  party_type: NamedResource | null
  relative_physical_stats: -1 | 0 | 1 | null
  time_of_day: string
  trade_species: NamedResource | null
  turn_upside_down: boolean
  region?: NamedResource | null
  required_pokemon_form?: NamedResource | null
  evolved_pokemon_form?: NamedResource | null
  used_move?: NamedResource | null
  min_move_count?: number | null
  min_steps?: number | null
  min_damage_taken?: number | null
  allowed_natures?: NamedResource[] | null
  condition_expression?: EvolutionConditionExpression | null
}

export interface PokemonForm {
  id: number
  name: string
  order: number
  form_order: number
  is_default: boolean
  is_battle_only: boolean
  is_mega: boolean
  form_name: string
  pokemon: NamedResource
  types: { slot: number; type: NamedResource }[]
  sprites: {
    front_default: string | null
    front_shiny: string | null
    back_default: string | null
    back_shiny: string | null
  }
  version_group: NamedResource | null
  names: { name: string; language: NamedResource }[]
  form_names: { name: string; language: NamedResource }[]
  trigger_conditions?: {
    trigger: string
    name: string | null
    url: string | null
    base_form: NamedResource | null
  }[]
}

export interface Encounter {
  location_area: NamedResource
  version_details: { version: NamedResource; max_chance: number; encounter_details: unknown[] }[]
}
