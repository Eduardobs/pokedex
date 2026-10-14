import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { LanguageProvider } from '../contexts/LanguageContext'
import { MoveSelect } from './MoveSelect'

const ref = (name: string, path: string) => ({ name, url: `https://pokeapi.co/api/v2/${path}/1/` })
const move = (name: string) => ({
  name,
  names: [],
  type: ref('fire', 'type'),
  damage_class: ref('special', 'move-damage-class'),
  power: 40,
  accuracy: 100,
  pp: 25,
  priority: 0,
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})
function Show({ options }: { options: string[] }) {
  const [value, setValue] = useState('')
  return (
    <LanguageProvider>
      <MoveSelect label="Move" options={options} value={value} onChange={setValue} />
    </LanguageProvider>
  )
}
it('shows move data in options, supports keyboard selection, clearing and escape', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => Promise.resolve(Response.json(move(url.split('/').at(-1)!)))),
  )
  render(<Show options={['ember', 'flamethrower']} />)
  const trigger = screen.getByRole('button', { name: 'Move' })
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const search = screen.getByRole('textbox', { name: 'Buscar golpe pelo nome' })
  expect(search).toHaveFocus()
  const option = await screen.findByRole('option', { name: /Ember/ })
  await waitFor(() => expect(option).toHaveTextContent('Poder40'))
  expect(option).toHaveTextContent('Precisão100')
  expect(option).toHaveTextContent('PP25')
  expect(within(option).getByLabelText(/Especial/)).toBeVisible()
  fireEvent.keyDown(search, { key: 'ArrowDown' })
  expect(screen.getByRole('option', { name: 'Nenhum' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  expect(option).toHaveFocus()
  fireEvent.click(option)
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveTextContent('Ember')
  expect(screen.queryByRole('listbox')).toBeNull()
  fireEvent.click(trigger)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } })
  expect(screen.getByRole('status')).toHaveTextContent('Nenhum golpe')
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('option', { name: 'Nenhum' }))
  expect(trigger).toHaveTextContent('Nenhum')
})
it('loads only the visible page and searches the entire compatible list', async () => {
  const fetch = vi.fn((url: string) => Promise.resolve(Response.json(move(url.split('/').at(-1)!))))
  vi.stubGlobal('fetch', fetch)
  const options = Array.from({ length: 8 }, (_, i) => `test-move-${i}`)
  render(<Show options={options} />)
  expect(fetch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6))
  fireEvent.click(screen.getByRole('button', { name: 'Carregar mais golpes' }))
  await screen.findByRole('option', { name: /Test Move 7/ })
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(8))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test move 7' } })
  await screen.findByRole('option', { name: /Test Move 7/ })
  expect(screen.queryByRole('option', { name: /Test Move 0/ })).toBeNull()
  fireEvent.blur(screen.getByRole('textbox'), { relatedTarget: document.body })
  expect(screen.queryByRole('listbox')).toBeNull()
})

it('loads the next move batch when the scroll sentinel becomes visible', async () => {
  let callback: IntersectionObserverCallback | undefined
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(value: IntersectionObserverCallback) {
        callback = value
      }
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = () => []
      root = null
      rootMargin = ''
      thresholds = [0]
    },
  )
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => Promise.resolve(Response.json(move(url.split('/').at(-1)!)))),
  )
  render(<Show options={Array.from({ length: 8 }, (_, index) => `scroll-move-${index}`)} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))
  await screen.findByRole('option', { name: /Scroll Move 5/ })
  expect(screen.queryByRole('option', { name: /Scroll Move 6/ })).toBeNull()
  await waitFor(() => expect(callback).toBeTypeOf('function'))
  act(() => callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
  expect(await screen.findByRole('option', { name: /Scroll Move 7/ })).toBeVisible()
})
it('allows retry after a failed move response', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { status: 503 }))
    .mockResolvedValue(Response.json(move('retry-move')))
  vi.stubGlobal('fetch', fetch)
  render(<Show options={['retry-move']} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))
  await screen.findByText('Dados do golpe indisponíveis.')
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(screen.getByRole('option', { name: /Retry Move/ })).toHaveTextContent('Poder40'))
})
