import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import type { Pokemon, PokemonForm, Species } from '../types'
import { PokemonForms } from './PokemonForms'

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }))

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  apiFetch: apiFetchMock,
}))

const pokemonUrl = 'https://pokeapi.co/api/v2/pokemon/412/'
const plantFormUrl = 'https://pokeapi.co/api/v2/pokemon-form/412/'
const sandyFormUrl = 'https://pokeapi.co/api/v2/pokemon-form/10034/'
const pokemonSprite =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/412.png'
const officialArtwork =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/412.png'
const sandySprite =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/412-sandy.png'
const sandyArtwork =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/412-sandy.png'

const species: Species = {
  id: 412,
  name: 'burmy',
  flavor_text_entries: [],
  genera: [],
  color: { name: 'green', url: 'https://pokeapi.co/api/v2/pokemon-color/5/' },
  shape: null,
  habitat: null,
  generation: { name: 'generation-iv', url: 'https://pokeapi.co/api/v2/generation/4/' },
  growth_rate: { name: 'medium', url: 'https://pokeapi.co/api/v2/growth-rate/2/' },
  egg_groups: [],
  evolution_chain: null,
  gender_rate: 4,
  capture_rate: 120,
  base_happiness: 50,
  hatch_counter: 15,
  has_gender_differences: false,
  forms_switchable: true,
  is_baby: false,
  is_legendary: false,
  is_mythical: false,
  varieties: [{ is_default: true, pokemon: { name: 'burmy', url: pokemonUrl } }],
}

const pokemon: Pokemon = {
  id: 412,
  name: 'burmy',
  height: 2,
  weight: 34,
  base_experience: 45,
  order: 441,
  is_default: true,
  location_area_encounters: 'https://pokeapi.co/api/v2/pokemon/412/encounters',
  sprites: {
    front_default: pokemonSprite,
    front_shiny: null,
    other: {
      'official-artwork': { front_default: officialArtwork, front_shiny: null },
    },
  },
  types: [{ slot: 1, type: { name: 'bug', url: 'https://pokeapi.co/api/v2/type/7/' } }],
  stats: [],
  abilities: [],
  moves: [],
  species: { name: 'burmy', url: 'https://pokeapi.co/api/v2/pokemon-species/412/' },
  forms: [
    { name: 'burmy-plant', url: plantFormUrl },
    { name: 'burmy-sandy', url: sandyFormUrl },
  ],
  game_indices: [],
}

function pokemonForm(
  id: number,
  name: string,
  formName: string,
  isDefault: boolean,
  sprite: string,
): PokemonForm {
  return {
    id,
    name,
    order: 1,
    form_order: id,
    is_default: isDefault,
    is_battle_only: false,
    is_mega: false,
    form_name: formName,
    pokemon: { name: 'burmy', url: pokemonUrl },
    types: pokemon.types,
    sprites: {
      front_default: sprite,
      front_shiny: null,
      back_default: null,
      back_shiny: null,
    },
    version_group: null,
    names: [],
    form_names: [],
  }
}

const plantForm = pokemonForm(412, 'burmy-plant', 'plant', true, pokemonSprite)
const sandyForm = pokemonForm(10034, 'burmy-sandy', 'sandy', false, sandySprite)

describe('PokemonForms', () => {
  beforeEach(() => {
    localStorage.clear()
    apiFetchMock.mockReset()
    apiFetchMock.mockImplementation((pathOrUrl: string) => {
      if (pathOrUrl === pokemonUrl) return Promise.resolve(pokemon)
      if (pathOrUrl === plantFormUrl) return Promise.resolve(plantForm)
      if (pathOrUrl === sandyFormUrl) return Promise.resolve(sandyForm)
      return Promise.reject(new Error(`Unexpected URL: ${pathOrUrl}`))
    })
  })

  it('shows each shared form artwork and falls back without changing the default form', async () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PokemonForms species={species} currentPokemon={pokemon} />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('img', { name: 'Forma padrão' })).toHaveAttribute(
      'src',
      officialArtwork,
    )
    const sandyImage = screen.getByRole('img', { name: 'Sandy' })
    expect(sandyImage).toHaveAttribute('src', sandyArtwork)

    fireEvent.error(sandyImage)
    expect(sandyImage).toHaveAttribute('src', sandySprite)

    fireEvent.error(sandyImage)
    expect(sandyImage).toHaveAttribute('src', officialArtwork)
  })
})
