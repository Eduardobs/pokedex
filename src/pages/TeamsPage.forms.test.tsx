import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { clearApiCache } from '../lib/api-client'
import { TeamsPage } from './TeamsPage'

const names = [
  'koraidon',
  'koraidon-limited-build',
  'koraidon-sprinting-build',
  'koraidon-swimming-build',
  'koraidon-gliding-build',
  'miraidon',
  'miraidon-low-power-mode',
  'miraidon-drive-mode',
  'miraidon-aquatic-mode',
  'miraidon-glide-mode',
  'charizard-mega-x',
  'charizard-gmax',
  'raichu-alola',
]

afterEach(() => {
  cleanup()
  localStorage.clear()
  clearApiCache()
  vi.unstubAllGlobals()
})

it('offers battle forms while excluding ride forms from suggestions and direct searches', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      results: names.map((name, index) => ({ name, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })),
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  render(
    <MemoryRouter>
      <LanguageProvider>
        <TeamsPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Nova equipe' }))
  const search = screen.getByRole('textbox', { name: 'Nome original ou número do Pokémon' })
  fireEvent.change(search, { target: { value: 'koraidon' } })
  expect(await screen.findByRole('button', { name: 'Koraidon' })).toBeInTheDocument()
  expect(screen.queryAllByRole('button', { name: /Koraidon .+ Build/ })).toHaveLength(0)
  fireEvent.change(search, { target: { value: 'miraidon' } })
  expect(screen.getByRole('button', { name: 'Miraidon' })).toBeInTheDocument()
  expect(screen.queryAllByRole('button', { name: /Miraidon .+ Mode/ })).toHaveLength(0)
  for (const [query, label] of [
    ['charizard', 'Charizard Mega X'],
    ['charizard', 'Charizard Gmax'],
    ['raichu', 'Raichu Alola'],
  ]) {
    fireEvent.change(search, { target: { value: query } })
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  }
  for (const query of ['koraidon-limited-build', '2']) {
    fireEvent.change(search, { target: { value: query } })
    fireEvent.submit(search.closest('form')!)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  }
})
