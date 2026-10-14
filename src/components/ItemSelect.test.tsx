import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ItemSelect } from './ItemSelect'

const apiBase = 'https://pokeapi.co/api/v2'
const ref = (name: string, resource: string) => ({ name, url: `${apiBase}/${resource}/1/` })
const names = Array.from({ length: 10 }, (_, index) => `test-item-${index}`)
const item = (name: string) => ({
  name,
  sprites: { default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png` },
  names: [],
  effect_entries: [{ short_effect: `Description for ${name}.`, language: ref('en', 'language') }],
  flavor_text_entries: [],
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function Show() {
  const [value, setValue] = useState('')
  return (
    <LanguageProvider>
      <ItemSelect value={value} label="Item equipado" onChange={setValue} />
    </LanguageProvider>
  )
}

it('shows item art, name and description and progressively loads the directory', async () => {
  const fetch = vi.fn((url: string) => {
    const parsed = new URL(url)
    return Promise.resolve(
      Response.json(
        parsed.searchParams.has('limit')
          ? { results: names.map((name) => ref(name, 'item')) }
          : item(parsed.pathname.split('/').at(-1)!),
      ),
    )
  })
  vi.stubGlobal('fetch', fetch)
  render(<Show />)
  fireEvent.click(screen.getByRole('button', { name: 'Item equipado' }))
  const first = await screen.findByRole('option', { name: /Test Item 0/ })
  await waitFor(() => expect(first).toHaveTextContent('Description for test-item-0.'))
  expect(first.querySelector('img')).toHaveAttribute('src', expect.stringContaining('test-item-0.png'))
  expect(screen.queryByRole('option', { name: /Test Item 8/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Carregar mais itens' }))
  expect(await screen.findByRole('option', { name: /Test Item 9/ })).toBeVisible()
  fireEvent.click(first)
  expect(screen.getByRole('button', { name: 'Item equipado' })).toHaveTextContent('Test Item 0')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Item equipado' })).toHaveTextContent('Description for test-item-0.'),
  )
})

it('searches all items and supports keyboard navigation', async () => {
  const fetch = vi.fn((url: string) => {
    const parsed = new URL(url)
    return Promise.resolve(
      Response.json(
        parsed.searchParams.has('limit')
          ? { results: names.map((name) => ref(name, 'item')) }
          : item(parsed.pathname.split('/').at(-1)!),
      ),
    )
  })
  vi.stubGlobal('fetch', fetch)
  render(<Show />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Item equipado' }), { key: 'ArrowDown' })
  expect(screen.getByRole('textbox', { name: 'Buscar item pelo nome' })).toHaveFocus()
  const search = screen.getByRole('textbox', { name: 'Buscar item pelo nome' })
  await waitFor(() => expect(screen.getByRole('option', { name: /Test Item 0/ })).toBeVisible())
  fireEvent.change(search, { target: { value: 'test item 9' } })
  const match = await screen.findByRole('option', { name: /Test Item 9/ })
  expect(screen.queryByRole('option', { name: /Test Item 0/ })).toBeNull()
  fireEvent.keyDown(search, { key: 'ArrowDown' })
  expect(screen.getByRole('option', { name: 'Nenhum' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  expect(match).toHaveFocus()
  fireEvent.keyDown(match, { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'Item equipado' })).toHaveFocus()
})

it('recovers the item directory after retry and tolerates duplicate API entries', async () => {
  const now = Date.now()
  vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000)
  const fetch = vi.fn((url: string) => {
    const parsed = new URL(url)
    if (parsed.searchParams.has('limit')) {
      const directoryAttempt = fetch.mock.calls.filter(([request]) => new URL(request).searchParams.has('limit')).length
      return Promise.resolve(
        directoryAttempt === 1
          ? new Response('{}', { status: 503 })
          : Response.json({ results: [ref('choice-scarf', 'item'), ref('choice-scarf', 'item')] }),
      )
    }
    return Promise.resolve(Response.json(item(parsed.pathname.split('/').at(-1)!)))
  })
  vi.stubGlobal('fetch', fetch)
  render(<Show />)

  fireEvent.click(screen.getByRole('button', { name: 'Item equipado' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

  expect(await screen.findByRole('option', { name: /Choice Scarf/ })).toBeVisible()
  expect(screen.getAllByRole('option', { name: /Choice Scarf/ })).toHaveLength(1)
})
