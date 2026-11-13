import { API_BASE_URL } from '../config/app'
import type { EvolutionChain, EvolutionNode, Pokemon, Species } from '../types'

export const resource = (endpoint: string, name: string, id = 1) => ({
  name,
  url: `${API_BASE_URL}/${endpoint}/${id}/`,
})
export const pokemonFixture: Pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  order: 35,
  is_default: true,
  location_area_encounters: `${API_BASE_URL}/pokemon/25/encounters`,
  sprites: { front_default: null, front_shiny: null },
  types: [{ slot: 1, type: resource('type', 'electric', 13) }],
  stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name, index) => ({
    base_stat: 50,
    effort: 0,
    stat: resource('stat', name, index + 1),
  })),
  abilities: [],
  moves: [],
  species: resource('pokemon-species', 'pikachu', 25),
  forms: [],
  game_indices: [],
}
export const speciesFixture: Species = {
  id: 25,
  name: 'pikachu',
  flavor_text_entries: [],
  genera: [],
  color: resource('pokemon-color', 'yellow'),
  shape: null,
  habitat: null,
  generation: resource('generation', 'generation-i'),
  growth_rate: resource('growth-rate', 'medium'),
  egg_groups: [],
  evolution_chain: null,
  gender_rate: 4,
  capture_rate: 190,
  base_happiness: 50,
  hatch_counter: 10,
  has_gender_differences: false,
  forms_switchable: false,
  is_baby: false,
  is_legendary: false,
  is_mythical: false,
  varieties: [],
}
export const evolutionNodeFixture: EvolutionNode = {
  is_baby: false,
  species: resource('pokemon-species', 'pikachu', 25),
  evolution_details: [],
  evolves_to: [],
}
export const evolutionFixture: EvolutionChain = { id: 1, baby_trigger_item: null, chain: evolutionNodeFixture }
