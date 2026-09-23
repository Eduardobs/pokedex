import { describe, expect, it } from 'vitest'
import { createGameMapCatalog, gameMapCategory, parseGameMapMarkers } from './game-map'

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
    expect(() => parseGameMapMarkers(markers, categories, bounds, 'Paldea')).toThrow(
      /Invalid Paldea marker/,
    )
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
