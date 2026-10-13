import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { MoveComparisonPage } from './MoveComparisonPage'

const ref = (name: string, endpoint = 'type') => ({ name, url: `https://pokeapi.co/api/v2/${endpoint}/1/` })
const move = {
  name: 'thunderbolt',
  type: ref('electric'),
  damage_class: ref('special', 'move-damage-class'),
  power: 90,
  accuracy: 100,
  pp: 15,
  priority: 0,
  effect_chance: 10,
  effect_entries: [{ effect: 'Chance: $effect_chance%.', language: ref('en', 'language') }],
  meta: { ailment_chance: 10 },
  past_values: [{ version_group: ref('x-y', 'version-group'), power: 95, pp: null }],
}
function Probe() {
  return <output data-testid="url">{useLocation().search}</output>
}
function show(entry = '/') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <LanguageProvider>
        <MoveComparisonPage />
        <Probe />
      </LanguageProvider>
    </MemoryRouter>,
  )
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('MoveComparisonPage', () => {
  it('loads independent moves and preserves the selection in the URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            Response.json(url.includes('ember') ? { ...move, name: 'ember', power: 40, past_values: [] } : move),
          ),
        ),
    )
    show('/?left=thunderbolt')
    expect(await screen.findByRole('heading', { name: 'Thunderbolt' })).toBeVisible()
    fireEvent.click(screen.getByText('Efeitos', { selector: 'summary' }))
    expect(screen.getByText('Chance: 10%.')).toBeVisible()
    fireEvent.click(screen.getByText('Alterações históricas', { selector: 'summary' }))
    expect(screen.getByText('95')).toBeVisible()
    fireEvent.change(screen.getByRole('combobox', { name: 'Segundo golpe' }), { target: { value: 'Ember' } })
    const right = screen.getByRole('heading', { name: 'Segundo golpe' }).closest('section')!
    fireEvent.click(within(right).getByRole('button', { name: 'Selecionar golpe' }))
    expect(await screen.findByRole('heading', { name: 'Ember' })).toBeVisible()
    expect(screen.getByTestId('url')).toHaveTextContent('left=thunderbolt&right=ember')
    const ember = screen.getByRole('heading', { name: 'Ember' }).closest('section')!
    fireEvent.click(within(ember).getByText('Alterações históricas', { selector: 'summary' }))
    expect(screen.getByText('Nenhuma alteração histórica informada.')).toBeVisible()
    expect(screen.getByRole('row', { name: /Poder Valores diferentes 90 40/ })).toBeVisible()
    expect(screen.getByRole('table', { name: 'Comparação por atributo' })).toBeVisible()
  })
  it('rejects unsafe identifiers and retries failed requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('{}', { status: 503 }))
        .mockResolvedValueOnce(Response.json({ ...move, name: 'retry-move' })),
    )
    show('/?left=retry-move')
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Retry Move' })).toBeVisible()
    fireEvent.change(screen.getByRole('combobox', { name: 'Segundo golpe' }), { target: { value: '../pokemon' } })
    const right = screen.getByRole('heading', { name: 'Segundo golpe' }).closest('section')!
    fireEvent.click(within(right).getByRole('button', { name: 'Selecionar golpe' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Use um nome da API ou número válido.')
  })
})
