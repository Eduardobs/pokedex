import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { STORAGE_KEYS } from '../config/app'
import { clearApiCache } from '../lib/api-client'
import { FeaturedPokemon } from './FeaturedPokemon'

function renderFeatured() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <FeaturedPokemon />
      </LanguageProvider>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  clearApiCache()
  sessionStorage.clear()
  vi.spyOn(Math, 'random').mockReturnValue(0)
})
afterEach(() => {
  cleanup()
  clearApiCache()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('renders matching artwork, name and route, keeping the choice through rerenders', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 1, name: 'bulbasaur' }))
  vi.stubGlobal('fetch', fetchMock)
  const view = renderFeatured()
  const link = await screen.findByRole('link', { name: 'Abrir ficha de Bulbasaur' })
  expect(link).toHaveAttribute('href', '/pokemon/bulbasaur')
  expect(screen.getByRole('img', { name: 'Bulbasaur' })).toHaveAttribute('src', expect.stringContaining('/1.png'))
  view.rerender(
    <MemoryRouter>
      <LanguageProvider>
        <FeaturedPokemon />
      </LanguageProvider>
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Abrir ficha de Bulbasaur' })).toBeVisible()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(sessionStorage.getItem(STORAGE_KEYS.featuredPokemon)).toBe('1')
})
it('skips the last highlight even when the random sample repeats', async () => {
  sessionStorage.setItem(STORAGE_KEYS.featuredPokemon, '1')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: 2, name: 'ivysaur' })))
  renderFeatured()
  expect(await screen.findByRole('link', { name: 'Abrir ficha de Ivysaur' })).toHaveAttribute(
    'href',
    '/pokemon/ivysaur',
  )
  expect(sessionStorage.getItem(STORAGE_KEYS.featuredPokemon)).toBe('2')
})
it('keeps the numbered link usable on failure and retries the same Pokémon', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { status: 503 }))
    .mockResolvedValueOnce(Response.json({ id: 1, name: 'bulbasaur' }))
  vi.stubGlobal('fetch', fetchMock)
  renderFeatured()
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('link', { name: 'Abrir ficha de Bulbasaur' })).toBeVisible()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
it('works without session storage and falls back when artwork fails', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: 1, name: 'bulbasaur' })))
  renderFeatured()
  const artwork = await screen.findByRole('img', { name: 'Bulbasaur' })
  fireEvent.error(artwork)
  await waitFor(() => expect(artwork).toHaveAttribute('src', expect.stringContaining('/home/1.png')))
})
