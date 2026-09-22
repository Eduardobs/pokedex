import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Pokemon } from '../../types'
import { PokemonHistoryCard } from './PokemonHistoryCard'

const resource = (endpoint: string, id: number, name: string) => ({
  name,
  url: `https://pokeapi.co/api/v2/${endpoint}/${id}/`,
})

const pokemon = {
  past_stats: [
    {
      generation: resource('generation', 1, 'generation-i'),
      stats: [{ base_stat: 50, effort: 0, stat: resource('stat', 9, 'special') }],
    },
  ],
  past_types: [
    {
      generation: resource('generation', 5, 'generation-v'),
      types: [{ slot: 1, type: resource('type', 1, 'normal') }],
    },
  ],
  past_abilities: [
    {
      generation: resource('generation', 4, 'generation-iv'),
      abilities: [{ ability: null, is_hidden: true, slot: 3 }],
    },
  ],
} as Pokemon

describe('PokemonHistoryCard', () => {
  it('traduz o histórico técnico em uma linha do tempo legível', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PokemonHistoryCard pokemon={pokemon} />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Histórico por geração' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Atributos anteriores' })).toBeVisible()
    expect(screen.getByText('Até Geração I')).toBeVisible()
    expect(screen.getByText('Especial')).toBeVisible()
    expect(screen.getByText('50')).toBeVisible()
    expect(screen.getByText('Normal')).toBeVisible()
    expect(screen.getByText('Slot 3 ainda indisponível')).toBeVisible()
  })
})
