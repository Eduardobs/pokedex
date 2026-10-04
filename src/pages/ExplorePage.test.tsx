import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ExplorePage } from './ExplorePage'

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function renderPage(initialEntry = '/explorar') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LanguageProvider>
        <Routes>
          <Route
            path="explorar"
            element={
              <>
                <ExplorePage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('ExplorePage', () => {
  it('filters by localized labels and stores the query in the URL', () => {
    renderPage()
    const search = screen.getByRole('textbox', { name: 'Buscar uma categoria...' })

    fireEvent.change(search, { target: { value: 'classes de dano' } })

    expect(screen.getByTestId('location')).toHaveTextContent('?q=classes+de+dano')
    expect(screen.getByRole('heading', { level: 2, name: 'Combate' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Classes de dano/ })).toHaveAttribute('href', '/explorar/move-damage-class')
    expect(screen.queryByRole('heading', { level: 2, name: 'Itens' })).not.toBeInTheDocument()
  })

  it('shows an empty result and lets the user restore every resource', () => {
    renderPage('/explorar?q=not-a-resource')

    expect(screen.getByRole('heading', { name: 'Nenhuma categoria encontrada' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(screen.getByTestId('location')).toHaveTextContent('')
    expect(screen.getByRole('heading', { level: 2, name: 'Pokémon' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Idiomas' })).toBeVisible()
  })
})
