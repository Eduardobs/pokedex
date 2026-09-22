import type { TranslationKey } from '../contexts/LanguageContext'
import rawMarkers from './kanto-map-markers.json'

export type MapCategoryId =
  | 'area'
  | 'cave'
  | 'pokemon-center'
  | 'transition'
  | 'move-tutor'
  | 'notable-npc'
  | 'shop'
  | 'trader'
  | 'berry'
  | 'hm'
  | 'item'
  | 'key-item'
  | 'poke-ball'
  | 'tm'
  | 'movable-boulder'
  | 'small-plant'
  | 'smashable-rock'
  | 'waterfall'
  | 'elite-four'
  | 'gym-leader'
  | 'trainer'

export type MapCategory = {
  id: MapCategoryId
  labelKey: TranslationKey
  count: number
  color: string
}

export type MapCategoryGroup = {
  id: 'locations' | 'npcs' | 'items' | 'obstacles' | 'battles'
  labelKey: TranslationKey
  categories: MapCategory[]
}

export type KantoMarker = {
  id: string
  name: string
  area: string
  category: MapCategoryId
  x: number
  y: number
  summaryKey: TranslationKey
}

export const KANTO_MAP_WIDTH = 6912
export const KANTO_MAP_HEIGHT = 8192
export const KANTO_TILE_BASE_ZOOM = 14
export const KANTO_TILE_ORIGIN = { x: 8134, y: 8140 } as const

export const MAP_CATEGORY_GROUPS: MapCategoryGroup[] = [
  {
    id: 'locations',
    labelKey: 'maps.group.locations',
    categories: [
      { id: 'area', labelKey: 'maps.category.area', count: 115, color: '#2c87c8' },
      { id: 'cave', labelKey: 'maps.category.cave', count: 44, color: '#7254a4' },
      {
        id: 'pokemon-center',
        labelKey: 'maps.category.pokemonCenter',
        count: 20,
        color: '#df3c4b',
      },
      {
        id: 'transition',
        labelKey: 'maps.category.transition',
        count: 586,
        color: '#4b6978',
      },
    ],
  },
  {
    id: 'npcs',
    labelKey: 'maps.group.npcs',
    categories: [
      {
        id: 'move-tutor',
        labelKey: 'maps.category.moveTutor',
        count: 16,
        color: '#d96c28',
      },
      {
        id: 'notable-npc',
        labelKey: 'maps.category.notableNpc',
        count: 11,
        color: '#b43685',
      },
      { id: 'shop', labelKey: 'maps.category.shop', count: 28, color: '#168f83' },
      { id: 'trader', labelKey: 'maps.category.trader', count: 9, color: '#446bc1' },
    ],
  },
  {
    id: 'items',
    labelKey: 'maps.group.items',
    categories: [
      { id: 'berry', labelKey: 'maps.category.berry', count: 47, color: '#cc536e' },
      { id: 'hm', labelKey: 'maps.category.hm', count: 7, color: '#3c8bd4' },
      { id: 'item', labelKey: 'maps.category.item', count: 266, color: '#df8c19' },
      { id: 'key-item', labelKey: 'maps.category.keyItem', count: 30, color: '#9b6acb' },
      { id: 'poke-ball', labelKey: 'maps.category.pokeBall', count: 32, color: '#d9363e' },
      { id: 'tm', labelKey: 'maps.category.tm', count: 54, color: '#3b9e70' },
    ],
  },
  {
    id: 'obstacles',
    labelKey: 'maps.group.obstacles',
    categories: [
      {
        id: 'movable-boulder',
        labelKey: 'maps.category.movableBoulder',
        count: 48,
        color: '#73574a',
      },
      {
        id: 'small-plant',
        labelKey: 'maps.category.smallPlant',
        count: 49,
        color: '#4f9d43',
      },
      {
        id: 'smashable-rock',
        labelKey: 'maps.category.smashableRock',
        count: 97,
        color: '#7c695e',
      },
      { id: 'waterfall', labelKey: 'maps.category.waterfall', count: 1, color: '#288dcc' },
    ],
  },
  {
    id: 'battles',
    labelKey: 'maps.group.battles',
    categories: [
      {
        id: 'elite-four',
        labelKey: 'maps.category.eliteFour',
        count: 5,
        color: '#873ca0',
      },
      {
        id: 'gym-leader',
        labelKey: 'maps.category.gymLeader',
        count: 8,
        color: '#e44b38',
      },
      { id: 'trainer', labelKey: 'maps.category.trainer', count: 490, color: '#ca3151' },
    ],
  },
]

export const MAP_CATEGORIES = MAP_CATEGORY_GROUPS.flatMap((group) => group.categories)

const categoryIds = new Set<string>(MAP_CATEGORIES.map((category) => category.id))

function isMapCategoryId(value: string): value is MapCategoryId {
  return categoryIds.has(value)
}

function summaryKeyFor(category: MapCategoryId): TranslationKey {
  switch (category) {
    case 'area':
      return 'maps.marker.areaSummary'
    case 'cave':
      return 'maps.marker.caveSummary'
    case 'pokemon-center':
      return 'maps.marker.centerSummary'
    case 'transition':
      return 'maps.marker.transitionSummary'
    case 'move-tutor':
      return 'maps.marker.tutorSummary'
    case 'notable-npc':
      return 'maps.marker.npcSummary'
    case 'shop':
      return 'maps.marker.shopSummary'
    case 'trader':
      return 'maps.marker.traderSummary'
    case 'berry':
      return 'maps.marker.berrySummary'
    case 'hm':
      return 'maps.marker.hmSummary'
    case 'key-item':
      return 'maps.marker.keyItemSummary'
    case 'poke-ball':
      return 'maps.marker.pokeBallSummary'
    case 'tm':
      return 'maps.marker.tmSummary'
    case 'movable-boulder':
    case 'small-plant':
    case 'smashable-rock':
      return 'maps.marker.obstacleSummary'
    case 'waterfall':
      return 'maps.marker.waterfallSummary'
    case 'elite-four':
      return 'maps.marker.eliteSummary'
    case 'gym-leader':
      return 'maps.marker.gymSummary'
    case 'trainer':
      return 'maps.marker.battleSummary'
    case 'item':
      return 'maps.marker.itemSummary'
  }
}

export const KANTO_MARKERS: KantoMarker[] = rawMarkers.map((marker) => {
  if (!isMapCategoryId(marker.category)) {
    throw new Error(`Unknown Kanto map category: ${marker.category}`)
  }

  return {
    ...marker,
    category: marker.category,
    summaryKey: summaryKeyFor(marker.category),
  }
})

export const MAP_TOTAL = MAP_CATEGORIES.reduce((total, category) => total + category.count, 0)
