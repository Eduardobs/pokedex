import { expect, type Page } from '@playwright/test'
import { allResources } from '../../src/data/resources'
import { API_BASE_PATH, API_BASE_URL, GRAPHQL_API_URL } from './api-config'
import { mockEvolutionFamilies } from './evolution'

export const presentationResources = allResources.map(({ endpoint }) => endpoint)
const ref = (endpoint: string, name: string, id = 1) => ({ name, url: `${API_BASE_URL}/${endpoint}/${id}/` })
export const resourceName = (endpoint: string) =>
  ({
    pokemon: 'eevee',
    'pokemon-species': 'eevee',
    type: 'electric',
    gender: 'female',
    'move-damage-class': 'special',
    move: 'thunderbolt',
    ability: 'lightning-rod',
    item: 'leftovers',
    berry: 'cheri',
    'pokemon-form': 'raichu-alola',
  })[endpoint] ?? 'reference-record'

export async function mockPresentation(page: Page) {
  await mockEvolutionFamilies(page)
  await page.route(GRAPHQL_API_URL, (route) => {
    const request = route.request().postDataJSON() as { operationName?: string }
    if (request.operationName === 'MoveListDetails')
      return route.fulfill({
        json: {
          data: {
            move: [
              {
                id: 1,
                name: 'thunderbolt',
                power: 90,
                accuracy: 100,
                pp: 15,
                type: { name: 'electric' },
                movedamageclass: { name: 'special' },
                movenames: [],
              },
            ],
          },
        },
      })
    if (request.operationName === 'AbilityListDetails')
      return route.fulfill({
        json: {
          data: {
            ability: [
              {
                id: 1,
                name: 'lightning-rod',
                abilityeffecttexts: [
                  {
                    short_effect:
                      'Descrição completa com informações suficientes para avaliar o comportamento deste recurso.',
                    language: { name: 'pt-br' },
                  },
                ],
              },
            ],
          },
        },
      })
    return route.fulfill({
      json: {
        data: {
          pokemonform: [
            {
              name: 'raichu-alola',
              is_battle_only: false,
              pokemon: { id: 10100, name: 'raichu-alola', pokemontypes: [{ slot: 1, type: { name: 'electric' } }] },
            },
          ],
        },
      },
    })
  })
  await page.route('https://pokemon-3d-api.onrender.com/**', (route) => route.fulfill({ json: [] }))
  await page.route('https://*.mapgenie.io/**', (route) => route.abort())
  await page.route('https://tiles.mapgenie.io/**', (route) => route.abort())
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const url = new URL(route.request().url())
    const [endpoint, identifier] = url.pathname.slice(`${API_BASE_PATH}/`.length).split('/').filter(Boolean)
    if (endpoint === 'pokemon' && identifier === '133' && url.pathname.endsWith('/encounters')) {
      return route.fulfill({
        json: [
          {
            location_area: ref('location-area', 'celadon-city'),
            version_details: [
              {
                version: ref('version', 'red'),
                max_chance: 25,
                encounter_details: [
                  {
                    min_level: 10,
                    max_level: 12,
                    chance: 25,
                    method: ref('encounter-method', 'walk'),
                    condition_values: [],
                  },
                ],
              },
            ],
          },
        ],
      })
    }
    if (endpoint === 'pokemon' && ['133', 'eevee'].includes(identifier)) {
      return route.fulfill({
        json: {
          id: 133,
          name: 'eevee',
          species: ref('pokemon-species', 'eevee', 133),
          height: 3,
          weight: 65,
          base_experience: 65,
          order: 133,
          is_default: true,
          sprites: {
            front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png',
            front_shiny: null,
          },
          types: [{ slot: 1, type: ref('type', 'normal', 1) }],
          stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name, i) => ({
            stat: ref('stat', name, i + 1),
            base_stat: 50 + i * 5,
            effort: 0,
          })),
          abilities: [{ ability: ref('ability', 'lightning-rod'), is_hidden: false, slot: 1 }],
          moves: [
            {
              move: ref('move', 'thunderbolt'),
              version_group_details: [
                {
                  level_learned_at: 5,
                  move_learn_method: ref('move-learn-method', 'level-up'),
                  version_group: ref('version-group', 'scarlet-violet'),
                },
              ],
            },
          ],
          forms: [],
          game_indices: [],
          held_items: [],
          location_area_encounters: `${API_BASE_URL}/pokemon/133/encounters`,
        },
      })
    }
    if (
      endpoint === 'pokemon' ||
      endpoint === 'pokemon-species' ||
      endpoint === 'evolution-chain' ||
      endpoint === 'type'
    ) {
      if (endpoint === 'pokemon' && identifier && /^\d+$/.test(identifier) && Number(identifier) !== 133) {
        return route.fulfill({ json: { id: Number(identifier), name: 'eevee' } })
      }
      if (identifier && !(endpoint === 'evolution-chain' && !/^\d+$/.test(identifier))) return route.fallback()
    }
    if (!identifier) {
      const name = resourceName(endpoint)
      return route.fulfill({
        json: {
          count: 1,
          next: null,
          previous: null,
          results: [
            ref(
              endpoint,
              name,
              endpoint === 'pokemon-form' ? 10001 : ['pokemon', 'pokemon-species'].includes(endpoint) ? 133 : 1,
            ),
          ],
        },
      })
    }
    const name = resourceName(endpoint)
    const json: Record<string, unknown> = {
      id: 1,
      name,
      names: [
        { name: 'Registro de referência detalhado', language: { name: 'pt-br' } },
        { name: 'Detailed reference record', language: { name: 'en' } },
        { name: 'Registro de referencia detallado', language: { name: 'es' } },
      ],
      effect_entries: [
        {
          short_effect: 'Descrição completa com informações suficientes para avaliar o comportamento deste recurso.',
          effect: 'Descrição completa do comportamento deste recurso.',
          language: { name: 'pt-br' },
        },
      ],
      flavor_text_entries: [],
      generation: ref('generation', 'generation-ix', 9),
      is_main_series: true,
      power: 90,
      accuracy: 100,
      pp: 15,
      priority: 0,
      effect_chance: 10,
      type: ref('type', 'electric', 13),
      damage_class: ref('move-damage-class', 'special', 3),
      target: ref('move-target', 'selected-pokemon'),
      meta: {
        ailment: ref('move-ailment', 'paralysis'),
        ailment_chance: 10,
        healing: 0,
        min_hits: null,
        max_hits: null,
      },
      stat_changes: [],
      past_values: [],
      pokemon_species: [ref('pokemon-species', 'eevee', 133)],
      chain: { is_baby: false, species: ref('pokemon-species', 'eevee', 133), evolves_to: [], evolution_details: [] },
      game_indices: [
        { game_index: 23, version: ref('version', 'scarlet') },
        { game_index: 24, version: ref('version', 'violet') },
      ],
    }
    if (endpoint === 'pokemon-form')
      Object.assign(json, {
        name: 'raichu-alola',
        pokemon: ref('pokemon', 'raichu-alola', 10100),
        is_battle_only: false,
        form_name: 'alola',
        is_default: true,
        types: [{ slot: 1, type: ref('type', 'electric', 13) }],
      })
    return route.fulfill({ json })
  })
}

/** Check rendered words and clip boundaries, rather than merely testing CSS declarations. */
export async function expectReadablePresentation(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  )
  const failures = await page.locator('main').evaluate((root) => {
    const failures: string[] = []
    const ignored =
      '.sr-only, [aria-hidden="true"]:not(.native-value-copy):not(.record-cell-label), .map-canvas, .map-pin-layer, .type-chart-scroll, .evolution-flow-viewport, .evolution-tree-viewport, .responsive-record-table thead, .comparison-lanes thead, svg, model-viewer'
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const el = node.parentElement
      if (
        !el ||
        !node.textContent?.trim() ||
        el.closest(ignored) ||
        !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
      )
        continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const text = node.textContent.trim()
      const rect = range.getBoundingClientRect()
      if (!rect.width || !rect.height) continue
      // Popovers own their frame; scrollable lists may extend beyond their viewport.
      let inFlow = true
      for (let parent: HTMLElement | null = el; parent && parent !== root; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        const bounds = parent.getBoundingClientRect()
        const framed =
          ['block', 'flex', 'grid', 'inline-flex', 'inline-block', 'inline-grid'].includes(style.display) &&
          (parseFloat(style.borderTopWidth) > 0 ||
            parseFloat(style.borderLeftWidth) > 0 ||
            !['rgba(0, 0, 0, 0)', 'transparent'].includes(style.backgroundColor))
        if (
          framed &&
          inFlow &&
          parent.clientWidth > 0 &&
          !['auto', 'scroll'].includes(style.overflowX) &&
          (rect.left < bounds.left - 2 || rect.right > bounds.right + 2)
        ) {
          failures.push(`Outside component horizontally: ${text.slice(0, 80)} (${parent.className})`)
        }
        if (
          framed &&
          inFlow &&
          parent.clientHeight > 0 &&
          !['auto', 'scroll'].includes(style.overflowY) &&
          (rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2)
        ) {
          failures.push(`Outside component vertically: ${text.slice(0, 80)} (${parent.className})`)
        }
        if (['hidden', 'clip'].includes(style.overflowX) && parent.clientWidth > 0) {
          const bounds = parent.getBoundingClientRect()
          if (rect.left < bounds.left - 2 || rect.right > bounds.right + 2)
            failures.push(`Clipped: ${text.slice(0, 80)} (${parent.className})`)
        }
        if (['absolute', 'fixed'].includes(style.position)) inFlow = false
      }
      for (const match of node.textContent.matchAll(/[\p{L}\p{N}]{3,}/gu)) {
        range.setStart(node, match.index!)
        range.setEnd(node, match.index! + match[0].length)
        const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
        if (lines.size > 1) failures.push(`Split word: ${match[0]} (${el.className})`)
      }
    }
    return [...new Set(failures)]
  })
  expect(failures).toEqual([])
}
