import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { HomePage } from './HomePage'

function CatalogLocation() {
  const location = useLocation()
  return <output aria-label="Catalog location">{location.pathname + location.search}</output>
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('opens the catalog with a trimmed and encoded home search', async () => {
  render(
    <LanguageProvider>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pokemon" element={<CatalogLocation />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  mr. mime  ' } })
  fireEvent.click(screen.getByRole('button'))
  expect(await screen.findByLabelText('Catalog location')).toHaveTextContent('/pokemon?q=mr.%20mime')
})

it('formats the Pokémon total for the selected language', () => {
  localStorage.setItem(STORAGE_KEYS.language, 'en')
  render(
    <MemoryRouter>
      <LanguageProvider>
        <HomePage />
      </LanguageProvider>
    </MemoryRouter>,
  )
  expect(screen.getByText('1,000+ Pokémon')).toBeVisible()
  for (const path of ['/teams', '/types-table', '/maps']) {
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href') === path)).toBe(true)
  }
})
