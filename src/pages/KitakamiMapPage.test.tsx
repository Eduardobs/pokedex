import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { KITAKAMI_CATEGORIES, KITAKAMI_MARKERS } from '../data/maps/kitakami-map'
import { KitakamiMapPage } from './KitakamiMapPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <KitakamiMapPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('KitakamiMapPage', () => {
  it('renders the complete Kitakami catalog and filters it by category', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Mapa interativo de Kitakami' })).toBeVisible()
    expect(screen.getByText('782 pins visíveis')).toBeVisible()
    expect(screen.getByLabelText('Resumo do catálogo do mapa')).toHaveTextContent('16 categorias')

    fireEvent.click(screen.getByRole('checkbox', { name: /Pokémon lendário/ }))
    expect(screen.getByText('777 pins visíveis')).toBeVisible()
  })

  it('searches and opens an accessible Kitakami marker', () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar um ponto no mapa' }), {
      target: { value: 'Munkidori' },
    })

    const pin = screen.getByRole('button', { name: /Munkidori/ })
    fireEvent.click(pin)

    expect(screen.getByRole('heading', { name: 'Munkidori' })).toBeVisible()
    expect(screen.getByText('Wistful Fields')).toBeVisible()
    expect(pin).toHaveAttribute('aria-pressed', 'true')
  })

  it('matches every category count and keeps markers inside the map bounds', () => {
    const counts = new Map<string, number>()
    KITAKAMI_MARKERS.forEach((marker) => {
      counts.set(marker.category, (counts.get(marker.category) ?? 0) + 1)
      expect(marker.x).toBeGreaterThanOrEqual(0)
      expect(marker.x).toBeLessThanOrEqual(16_384)
      expect(marker.y).toBeGreaterThanOrEqual(0)
      expect(marker.y).toBeLessThanOrEqual(16_384)
    })

    KITAKAMI_CATEGORIES.forEach((category) => {
      expect(counts.get(category.id)).toBe(category.count)
    })
    expect(KITAKAMI_MARKERS).toHaveLength(782)
  })
})
