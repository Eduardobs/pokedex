import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { HISUI_CATEGORIES, HISUI_MARKERS } from '../data/maps/hisui-map'
import { HisuiMapPage } from './HisuiMapPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <HisuiMapPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('HisuiMapPage', () => {
  it('renders the complete Hisui catalog and filters it by category', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Mapa interativo de Hisui' })).toBeVisible()
    expect(screen.getByText('2.525 pins visíveis')).toBeVisible()
    expect(screen.getByLabelText('Resumo do catálogo do mapa')).toHaveTextContent('31 categorias')

    fireEvent.click(screen.getByRole('checkbox', { name: /Chama perdida/ }))
    expect(screen.getByText('2.418 pins visíveis')).toBeVisible()
  })

  it('searches and opens an accessible Hisui marker', () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar um ponto no mapa' }), {
      target: { value: 'Arceus' },
    })

    const pin = screen.getByRole('button', { name: /Arceus/ })
    fireEvent.click(pin)

    expect(screen.getByRole('heading', { name: 'Arceus' })).toBeVisible()
    expect(screen.getByText('Ancient Retreat')).toBeVisible()
    expect(pin).toHaveAttribute('aria-pressed', 'true')
  })

  it('matches every category count and keeps markers inside the map bounds', () => {
    const counts = new Map<string, number>()
    HISUI_MARKERS.forEach((marker) => {
      counts.set(marker.category, (counts.get(marker.category) ?? 0) + 1)
      expect(marker.x).toBeGreaterThanOrEqual(0)
      expect(marker.x).toBeLessThanOrEqual(16_384)
      expect(marker.y).toBeGreaterThanOrEqual(0)
      expect(marker.y).toBeLessThanOrEqual(16_384)
    })

    HISUI_CATEGORIES.forEach((category) => {
      expect(counts.get(category.id)).toBe(category.count)
    })
    expect(HISUI_MARKERS).toHaveLength(2_525)
  })
})
