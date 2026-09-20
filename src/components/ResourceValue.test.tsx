import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { API_BASE } from '../lib/api'
import { ResourceValue } from './ResourceValue'

afterEach(cleanup)

function renderValue(value: unknown, depth = 0) {
  return render(
    <MemoryRouter>
      <LanguageProvider><ResourceValue value={value} depth={depth} /></LanguageProvider>
    </MemoryRouter>,
  )
}

describe('ResourceValue', () => {
  it('shows large arrays as a paginated summary instead of a record count', () => {
    const values = Array.from({ length: 21 }, (_, index) => ({
      name: `pokemon-${index + 1}`,
      url: `${API_BASE}/pokemon-species/${index + 1}/`,
    }))

    renderValue(values)

    expect(screen.getByText('Pokemon 1')).toBeInTheDocument()
    expect(screen.getAllByText(/Pokemon Species/)).toHaveLength(6)
    expect(screen.getByText(/#001/)).toBeInTheDocument()
    expect(screen.getByText('Pokemon 6')).toBeInTheDocument()
    expect(screen.queryByText('Pokemon 7')).not.toBeInTheDocument()
    expect(screen.queryByText('21 registros')).not.toBeInTheDocument()
    expect(screen.getByText('1–6 de 21')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(screen.queryByText('Pokemon 1')).not.toBeInTheDocument()
    expect(screen.getByText('Pokemon 7')).toBeInTheDocument()
    expect(screen.getByText('7–12 de 21')).toBeInTheDocument()
  })

  it('keeps useful fields visible for paginated nested records', () => {
    const values = [{ slot: 1, pokemon: { name: 'murkrow', url: `${API_BASE}/pokemon/198/` } }]

    renderValue(values, 2)

    expect(screen.getByText('Slot')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Murkrow/ })).toHaveAttribute('href', '/pokemon/murkrow')
    expect(screen.getByText('1–1 de 1')).toBeInTheDocument()
  })

  it('links Pokemon species references to the canonical Pokemon page', () => {
    renderValue({ name: 'bulbasaur', url: `${API_BASE}/pokemon-species/1/` })

    expect(screen.getByRole('link', { name: /Bulbasaur/ })).toHaveAttribute('href', '/pokemon/bulbasaur')
  })
})
