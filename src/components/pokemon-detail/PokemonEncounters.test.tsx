import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Encounter, NamedResource } from '../../types'
import { PokemonEncounters } from './PokemonEncounters'

const resource = (endpoint: string, id: number, name: string): NamedResource => ({
  name,
  url: `https://pokeapi.co/api/v2/${endpoint}/${id}/`,
})

const encounters: Encounter[] = [
  {
    location_area: resource('location-area', 1, 'viridian-forest-area'),
    version_details: [
      {
        version: resource('version', 1, 'red'),
        max_chance: 15,
        encounter_details: [
          {
            min_level: 3,
            max_level: 5,
            chance: 10,
            method: resource('encounter-method', 1, 'walk'),
            condition_values: [resource('encounter-condition-value', 4, 'time-night')],
          },
        ],
      },
    ],
  },
  {
    location_area: resource('location-area', 2, 'power-plant-area'),
    version_details: [
      {
        version: resource('version', 2, 'blue'),
        max_chance: 25,
        encounter_details: [
          {
            min_level: 20,
            max_level: 20,
            chance: 25,
            method: resource('encounter-method', 1, 'walk'),
            condition_values: [],
          },
        ],
      },
    ],
  },
]

describe('PokemonEncounters', () => {
  it('mostra a versão mais recente e permite consultar outra versão com seus detalhes', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PokemonEncounters encounters={encounters} />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('1 área em Blue')
    fireEvent.click(screen.getByText('Power Plant Area').closest('summary')!)
    expect(screen.getByText('Nível 20')).toBeVisible()

    fireEvent.click(screen.getByRole('combobox', { name: 'Versão do jogo' }))
    fireEvent.click(screen.getByRole('option', { name: 'Red' }))

    expect(screen.getByRole('status')).toHaveTextContent('1 área em Red')
    fireEvent.click(screen.getByText('Viridian Forest Area').closest('summary')!)
    expect(screen.getByText('Níveis 3–5')).toBeVisible()
    expect(screen.getByText('Caminhando')).toBeVisible()
    expect(screen.getByText('À noite')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Abrir dados completos do local' })).toHaveAttribute(
      'href',
      '/explorar/location-area/viridian-forest-area',
    )
  })
})
