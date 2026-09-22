import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { API_BASE } from '../lib/api'
import { ResourceValue, resourceFieldLabel } from './ResourceValue'

afterEach(cleanup)

function renderValue(value: unknown, depth = 0) {
  return render(
    <MemoryRouter>
      <LanguageProvider><ResourceValue value={value} depth={depth} /></LanguageProvider>
    </MemoryRouter>,
  )
}

describe('ResourceValue', () => {
  it('localizes summary fields used by berry and item resources', () => {
    expect(resourceFieldLabel('growth_time', 'pt-BR')).toBe('Tempo de crescimento')
    expect(resourceFieldLabel('natural_gift_power', 'es')).toBe('Potencia de Don Natural')
    expect(resourceFieldLabel('fling_effect', 'pt-BR')).toBe('Efeito de lançamento')
  })

  it('localizes location-area and nested API fields in every supported language', () => {
    expect(resourceFieldLabel('game_index', 'pt-BR')).toBe('Índice no jogo')
    expect(resourceFieldLabel('encounter_method_rates', 'pt-BR')).toBe('Taxas por método de encontro')
    expect(resourceFieldLabel('location', 'pt-BR')).toBe('Local')
    expect(resourceFieldLabel('version_details', 'en')).toBe('Version details')
    expect(resourceFieldLabel('encounter_method', 'es')).toBe('Método de encuentro')
    expect(resourceFieldLabel('max_chance', 'es')).toBe('Probabilidad máxima')
  })

  it('localizes known API terms inside generic resource values', () => {
    renderValue({ name: 'old-rod', url: `${API_BASE}/encounter-method/2/` })

    expect(screen.getByRole('link', { name: /Vara velha/ })).toBeInTheDocument()
    expect(screen.queryByText('Old Rod')).not.toBeInTheDocument()
  })

  it('shows Pokémon arrays as paginated visual cards with artwork, name, and Pokédex number', () => {
    const values = Array.from({ length: 21 }, (_, index) => ({
      name: `pokemon-${index + 1}`,
      url: `${API_BASE}/pokemon-species/${index + 1}/`,
    }))

    renderValue(values)

    expect(screen.getByText('Pokemon 1')).toBeInTheDocument()
    expect(screen.getByText('#0001')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Pokemon 1' })).toHaveAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png')
    expect(screen.getByRole('link', { name: 'Abrir Pokemon 1, Pokémon número 1' })).toHaveAttribute('href', '/pokemon/pokemon-1')
    expect(screen.getByText('Pokemon 6')).toBeInTheDocument()
    expect(screen.queryByText('Pokemon 7')).not.toBeInTheDocument()
    expect(screen.queryByText('21 registros')).not.toBeInTheDocument()
    expect(screen.getByText('1–6 de 21')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(screen.queryByText('Pokemon 1')).not.toBeInTheDocument()
    expect(screen.getByText('Pokemon 7')).toBeInTheDocument()
    expect(screen.getByText('7–12 de 21')).toBeInTheDocument()
  })

  it('keeps related data visible for nested Pokémon records', () => {
    const values = [{ slot: 1, is_hidden: false, pokemon: { name: 'murkrow', url: `${API_BASE}/pokemon/198/` } }]

    renderValue(values, 2)

    expect(screen.getByText('Posição')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Habilidade oculta')).toBeInTheDocument()
    expect(screen.getByText('Não')).toBeInTheDocument()
    expect(screen.getByText('#0198')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Murkrow' })).toHaveAttribute('width', '58')
    expect(screen.getByRole('link', { name: 'Abrir Murkrow, Pokémon número 198' })).toHaveAttribute('href', '/pokemon/murkrow')
    expect(screen.queryByText('1–1 de 1')).not.toBeInTheDocument()
  })

  it('shows the relationship rate used by gender resource pages', () => {
    renderValue([{ rate: 4, pokemon_species: { name: 'bulbasaur', url: `${API_BASE}/pokemon-species/1/` } }])

    expect(screen.getByText('Taxa')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument()
    expect(screen.getByText('#0001')).toBeInTheDocument()
  })

  it('links Pokemon species references to the canonical Pokemon page', () => {
    renderValue({ name: 'bulbasaur', url: `${API_BASE}/pokemon-species/1/` })

    expect(screen.getByRole('link', { name: /Bulbasaur/ })).toHaveAttribute('href', '/pokemon/bulbasaur')
  })

  it('renders damage-class references with the shared icon and color treatment', () => {
    const { container } = renderValue({ name: 'status', url: `${API_BASE}/move-damage-class/1/` })

    expect(screen.getByRole('link', { name: /Status/ })).toHaveAttribute('href', '/explorar/move-damage-class/1')
    expect(container.querySelector('.damage-status img')).toHaveAttribute('src', '/icons/damage-status.png')
  })
})
