import { describe, expect, it } from 'vitest'
import { createGameMap, createGameMapCatalog, gameMapCategory, parseGameMapMarkers } from './game-map'

const categories = new Set(['location'])
const bounds = { width: 100, height: 100 }

describe('parseGameMapMarkers', () => {
  it('accepts a bounded marker catalog', () => {
    expect(
      parseGameMapMarkers(
        [{ id: '1', name: 'Mesagoza', area: 'Paldea', category: 'location', x: 50, y: 25 }],
        categories,
        bounds,
        'Paldea',
      ),
    ).toEqual([{ id: '1', name: 'Mesagoza', area: 'Paldea', category: 'location', x: 50, y: 25 }])
  })

  it.each([
    {
      markers: [{ id: '1', name: 'A', area: 'Paldea', category: 'unknown', x: 50, y: 25 }],
    },
    {
      markers: [{ id: '1', name: 'A', area: 'Paldea', category: 'location', x: 101, y: 25 }],
    },
    {
      markers: [
        { id: '1', name: 'A', area: 'Paldea', category: 'location', x: 10, y: 25 },
        { id: '1', name: 'B', area: 'Paldea', category: 'location', x: 20, y: 30 },
      ],
    },
  ])('rejects malformed marker catalogs', ({ markers }) => {
    expect(() => parseGameMapMarkers(markers, categories, bounds, 'Paldea')).toThrow(/Invalid Paldea marker/)
  })
})

describe('createGameMapCatalog', () => {
  it('derives categories, validated markers and total from one definition', () => {
    const location = gameMapCategory(
      'location',
      'maps.category.location',
      'maps.marker.paldeaLocationSummary',
      1,
      '#123456',
      'area',
    )
    const marker = {
      id: '1',
      name: 'Mesagoza',
      area: 'Paldea',
      category: 'location',
      x: 50,
      y: 25,
    }

    expect(
      createGameMapCatalog(
        [marker],
        [{ id: 'locations', labelKey: 'maps.group.locations', categories: [location] }],
        bounds,
        'Paldea',
      ),
    ).toEqual({ categories: [location], markers: [marker], total: 1 })
  })
})

describe('createGameMap', () => {
  it('uses one definition for catalog bounds and the rendered map', () => {
    const location = gameMapCategory(
      'location',
      'maps.category.location',
      'maps.marker.paldeaLocationSummary',
      1,
      '#123456',
      'area',
    )
    const groups = [{ id: 'locations', labelKey: 'maps.group.locations' as const, categories: [location] }]
    const marker = {
      id: '1',
      name: 'Mesagoza',
      area: 'Paldea',
      category: 'location',
      x: 50,
      y: 25,
    }

    const result = createGameMap([marker], groups, 'Paldea', {
      id: 'paldea',
      gameTitle: 'Pokémon Scarlet & Violet',
      regionName: 'Paldea',
      titleKey: 'maps.paldeaTitle',
      viewportLabelKey: 'maps.paldeaViewportLabel',
      themeClassName: 'game-map-page--paldea',
      width: 100,
      height: 100,
      tileBaseZoom: 15,
      tileMinZoom: 10,
      tileMaxZoom: 15,
      tileOrigin: { x: 0, y: 0 },
      tileBaseUrl: 'https://tiles.example.test/paldea',
      tileExtension: 'jpg',
      tileOrder: 'xy',
      sourceUrl: 'https://example.test/paldea',
    })

    expect(result).toMatchObject({ categories: [location], markers: [marker], total: 1 })
    expect(result.map).toMatchObject({ width: 100, height: 100, groups, markers: [marker] })
  })
})
