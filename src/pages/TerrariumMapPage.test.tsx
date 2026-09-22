import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { TERRARIUM_CATEGORIES, TERRARIUM_MARKERS } from '../data/terrarium-map'
import { TerrariumMapPage } from './TerrariumMapPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <TerrariumMapPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('TerrariumMapPage', () => {
  it('renders the complete Terarium catalog and filters it by category', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Mapa interativo do Terarium' })).toBeVisible()
    expect(screen.getByText('783 pins visíveis')).toBeVisible()
    expect(screen.getByLabelText('Resumo do catálogo do mapa')).toHaveTextContent('13 categorias')

    fireEvent.click(screen.getByRole('checkbox', { name: /Pokémon lendário/ }))
    expect(screen.getByText('782 pins visíveis')).toBeVisible()
  })

  it('searches and opens an accessible Terarium marker', () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar um ponto no mapa' }), {
      target: { value: 'Meloetta' },
    })

    const pin = screen.getByRole('button', { name: /Meloetta/ })
    fireEvent.click(pin)

    expect(screen.getByRole('heading', { name: 'Meloetta' })).toBeVisible()
    expect(screen.getByText('Coastal Biome')).toBeVisible()
    expect(pin).toHaveAttribute('aria-pressed', 'true')
  })

  it('matches every category count and keeps markers inside the map bounds', () => {
    const counts = new Map<string, number>()
    TERRARIUM_MARKERS.forEach((marker) => {
      counts.set(marker.category, (counts.get(marker.category) ?? 0) + 1)
      expect(marker.x).toBeGreaterThanOrEqual(0)
      expect(marker.x).toBeLessThanOrEqual(16_384)
      expect(marker.y).toBeGreaterThanOrEqual(0)
      expect(marker.y).toBeLessThanOrEqual(16_384)
    })

    TERRARIUM_CATEGORIES.forEach((category) => {
      expect(counts.get(category.id)).toBe(category.count)
    })
    expect(TERRARIUM_MARKERS).toHaveLength(783)
  })
})
