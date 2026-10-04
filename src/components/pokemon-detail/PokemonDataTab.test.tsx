import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Pokemon, Species } from '../../types'
import { PokemonDataTab } from './PokemonDataTab'

const resource = (endpoint: string, id: number, name: string) => ({
  name,
  url: `https://pokeapi.co/api/v2/${endpoint}/${id}/`,
})

const pokemon = {
  id: 25,
  name: 'pikachu',
  order: 35,
  is_default: true,
  species: resource('pokemon-species', 25, 'pikachu'),
  forms: [resource('pokemon-form', 25, 'pikachu')],
  sprites: {
    front_default: 'front.png',
    front_shiny: 'front-shiny.png',
    back_default: 'back.png',
    back_shiny: null,
  },
  cries: { latest: 'latest.ogg', legacy: null },
  held_items: [],
  game_indices: [],
  past_abilities: [],
  past_stats: [],
  past_types: [],
} as unknown as Pokemon

const species = {
  is_legendary: true,
  is_mythical: false,
} as Species

function renderTab(currentSpecies: Species | null, speciesLoading = false, currentPokemon = pokemon) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <PokemonDataTab pokemon={currentPokemon} species={currentSpecies} speciesLoading={speciesLoading} />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('PokemonDataTab', () => {
  it('presents registry flags, available media and the canonical API source', () => {
    const { container } = renderTab(species)
    const registry = screen.getByRole('heading', { name: 'Registro da PokéAPI' }).closest('article')

    expect(registry).not.toBeNull()
    expect(within(registry!).getByText('Lendário').parentElement).toHaveTextContent('Sim')
    expect(within(registry!).getByText('Mítico').parentElement).toHaveTextContent('Não')
    expect(screen.getByRole('img', { name: 'Frente · Normal' })).toHaveAttribute('src', 'front.png')
    expect(screen.getByRole('img', { name: 'Frente · Shiny' })).toHaveAttribute('src', 'front-shiny.png')
    expect(screen.getByRole('img', { name: 'Costas · Normal' })).toHaveAttribute('src', 'back.png')
    expect(container.querySelector('audio')).toHaveAttribute('src', 'latest.ogg')
    expect(screen.getByRole('link', { name: /JSON/ })).toHaveAttribute(
      'href',
      'https://pokeapi.co/api/v2/pokemon/pikachu',
    )
  })

  it('distinguishes loading species data from unavailable optional history', () => {
    renderTab(null, true, { ...pokemon, cries: undefined })
    const registry = screen.getByRole('heading', { name: 'Registro da PokéAPI' }).closest('article')

    expect(within(registry!).getAllByText('Carregando')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Sons' }).parentElement).toHaveTextContent('Nenhum dado registrado.')
    expect(screen.getByRole('heading', { name: 'Itens carregados' }).parentElement).toHaveTextContent(
      'Nenhum item carregado registrado.',
    )
    expect(screen.getByRole('heading', { name: 'Índices nos jogos' }).parentElement).toHaveTextContent(
      'Nenhum dado registrado.',
    )
  })
})
