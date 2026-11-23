import { act, cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '../config/app'
import { FavoritesProvider, useFavoritesData, useFavoritesNotice } from '../contexts/FavoritesContext'
import { sortPokemonList } from './pokemon-sort'
import { sortByLocalizedLabel } from './alphabetical-sort'
import { apiFetch, clearApiCache } from './api-client'
import type { PokemonListItem } from '../types'
import type { Team } from './teams'

afterEach(() => {
  cleanup()
  clearApiCache()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('catalog performance invariants', () => {
  it('resolves each localized label only once per sort', () => {
    let reads = 0
    const values = Array.from({ length: 1025 }, (_, index) => (index * 7919) % 1025)
    const original = [...values]
    const sorted = sortByLocalizedLabel(
      values,
      (value) => {
        reads += 1
        return `Move ${value}`
      },
      'en',
    )
    expect(reads).toBe(values.length)
    expect(values).toEqual(original)
    expect(sorted[0]).toBe(0)
    expect(sorted.at(-1)).toBe(1024)
  })

  it('reads each stat array at most once per numeric sort', () => {
    let reads = 0
    const catalog: PokemonListItem[] = Array.from({ length: 1025 }, (_, index) => ({
      id: index + 1,
      name: `pokemon-${index}`,
      url: '',
    }))
    const details = Object.fromEntries(
      catalog.map(({ name, id }) => [
        name,
        {
          get stats() {
            reads += 1
            return [{ base_stat: (id * 7919) % 251, effort: 0, stat: { name: 'hp', url: '' } }]
          },
        },
      ]),
    )
    const sorted = sortPokemonList(catalog, 'total', 'desc', details, 'en')
    expect(reads).toBe(1025)
    expect(sorted).toHaveLength(1025)
  })

  it('caches REST responses using measured byte size without re-serializing payloads', async () => {
    const payload = JSON.stringify({ name: 'pikachu', id: 25 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(payload, { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const stringifySpy = vi.spyOn(JSON, 'stringify')

    const result = await apiFetch<{ name: string; id: number }>('pokemon/pikachu')
    expect(result).toEqual({ name: 'pikachu', id: 25 })
    expect(stringifySpy).not.toHaveBeenCalled()
  })

  it('does not re-render favorites data consumers when the toast notice clears', () => {
    let dataRenders = 0
    let toggleFavorite!: (name: string) => void
    let dismissNotice!: () => void

    function DataConsumer() {
      dataRenders += 1
      const { toggle, isFavorite } = useFavoritesData()
      toggleFavorite = toggle
      return createElement('span', null, isFavorite('pikachu') ? 'yes' : 'no')
    }

    function NoticeConsumer() {
      const { notice, clearNotice } = useFavoritesNotice()
      dismissNotice = clearNotice
      return createElement('span', null, notice?.action ?? 'none')
    }

    render(createElement(FavoritesProvider, null, createElement(DataConsumer), createElement(NoticeConsumer)))
    expect(dataRenders).toBe(1)

    act(() => toggleFavorite('pikachu'))
    expect(dataRenders).toBe(2)

    act(() => dismissNotice())
    expect(dataRenders).toBe(2)
  })

  it('loads the Metronome move pool only when a battle roster includes Metronome', async () => {
    const ref = (resource: string, name: string) => ({ name, url: `${API_BASE_URL}/${resource}/${name}/` })
    const makeTeam = (move: string): Team => ({
      id: 'team-1',
      name: 'Test Team',
      competitiveFormat: 'singles-6v6',
      members: [
        {
          id: 'member-1',
          pokemon: 'pikachu',
          level: 100,
          friendship: 255,
          shiny: false,
          gender: 'male',
          tera: 'electric',
          ability: 'static',
          nature: 'timid',
          item: '',
          moves: [move, 'tackle', 'tackle', 'tackle'],
          evs: [0, 0, 0, 252, 4, 252],
          ivs: [31, 31, 31, 31, 31, 31],
          abilityActive: false,
          itemActive: false,
        },
      ],
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/pokemon/pikachu')) {
        return Response.json({
          id: 25,
          name: 'pikachu',
          species: ref('pokemon-species', 'pikachu'),
          types: [{ slot: 1, type: ref('type', 'electric') }],
          stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name) => ({
            base_stat: 50,
            stat: ref('stat', name),
          })),
          abilities: [{ ability: ref('ability', 'static') }],
          moves: [{ move: ref('move', 'tackle') }, { move: ref('move', 'metronome') }],
        })
      }
      if (url.includes('/move/')) {
        const moveName = url.split('/move/')[1]
        return Response.json({
          name: moveName,
          type: ref('type', 'normal'),
          damage_class: ref('move-damage-class', moveName === 'metronome' ? 'status' : 'physical'),
          power: moveName === 'metronome' ? null : 40,
          accuracy: moveName === 'metronome' ? null : 100,
          priority: 0,
          pp: 10,
          target: ref('move-target', 'selected-pokemon'),
          effect_chance: null,
          meta: null,
          stat_changes: [],
          flavor_text_entries: [],
        })
      }
      return Response.json({ name: 'static', names: [], effect_entries: [], flavor_text_entries: [] })
    })

    const { metronomeMovePool } = await import('./battle-metronome')
    const { loadBattleRoster } = await import('./battle-data')

    await loadBattleRoster(makeTeam('tackle'))
    expect(metronomeMovePool()).toHaveLength(0)

    await loadBattleRoster(makeTeam('metronome'))
    expect(metronomeMovePool().length).toBeGreaterThan(500)
  })
})
