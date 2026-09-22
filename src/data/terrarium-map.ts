import type { TranslationKey } from '../contexts/LanguageContext'
import {
  defineGameMap,
  parseGameMapMarkers,
  type GameMapCategory,
  type GameMapCategoryGroup,
} from './game-map'
import rawMarkers from './terrarium-map-markers.json'

export type TerrariumCategoryId =
  | 'fast-travel'
  | 'watchtower'
  | 'tm'
  | 'medicine'
  | 'other-item'
  | 'poke-ball'
  | 'treasure'
  | 'trainer'
  | 'cave-entrance'
  | 'miscellaneous'
  | 'npc'
  | 'legendary-pokemon'
  | 'tera-pokemon'

export const TERRARIUM_MAP_WIDTH = 16_384
export const TERRARIUM_MAP_HEIGHT = 16_384
export const TERRARIUM_TILE_BASE_ZOOM = 15
export const TERRARIUM_TILE_ORIGIN = { x: 16_288, y: 16_288 } as const

const category = (
  id: TerrariumCategoryId,
  labelKey: TranslationKey,
  summaryKey: TranslationKey,
  count: number,
  color: string,
  icon: GameMapCategory['icon'],
): GameMapCategory => ({ id, labelKey, summaryKey, count, color, icon })

export const TERRARIUM_CATEGORY_GROUPS: GameMapCategoryGroup[] = [
  {
    id: 'locations',
    labelKey: 'maps.group.locations',
    categories: [
      category(
        'fast-travel',
        'maps.category.fastTravel',
        'maps.marker.terrariumLocationSummary',
        1,
        '#3f7791',
        'transition',
      ),
      category(
        'watchtower',
        'maps.category.watchtower',
        'maps.marker.terrariumLocationSummary',
        16,
        '#3f7791',
        'watchtower',
      ),
    ],
  },
  {
    id: 'collectibles',
    labelKey: 'maps.group.collectibles',
    categories: [
      category(
        'tm',
        'maps.category.tm',
        'maps.marker.terrariumCollectibleSummary',
        110,
        '#89418f',
        'tm',
      ),
    ],
  },
  {
    id: 'items',
    labelKey: 'maps.group.items',
    categories: [
      category(
        'medicine',
        'maps.category.medicine',
        'maps.marker.terrariumItemSummary',
        103,
        '#287f7e',
        'medicine',
      ),
      category(
        'other-item',
        'maps.category.otherItem',
        'maps.marker.terrariumItemSummary',
        199,
        '#287f7e',
        'item',
      ),
      category(
        'poke-ball',
        'maps.category.pokeBall',
        'maps.marker.terrariumItemSummary',
        69,
        '#287f7e',
        'poke-ball',
      ),
      category(
        'treasure',
        'maps.category.treasure',
        'maps.marker.terrariumItemSummary',
        145,
        '#287f7e',
        'key-item',
      ),
    ],
  },
  {
    id: 'battles',
    labelKey: 'maps.group.battles',
    categories: [
      category(
        'trainer',
        'maps.category.trainer',
        'maps.marker.terrariumBattleSummary',
        60,
        '#827168',
        'trainer',
      ),
    ],
  },
  {
    id: 'other',
    labelKey: 'maps.group.other',
    categories: [
      category(
        'cave-entrance',
        'maps.category.caveEntrance',
        'maps.marker.terrariumOtherSummary',
        38,
        '#4c4e4f',
        'cave',
      ),
      category(
        'miscellaneous',
        'maps.category.miscellaneous',
        'maps.marker.terrariumOtherSummary',
        1,
        '#4c4e4f',
        'area',
      ),
      category(
        'npc',
        'maps.category.npc',
        'maps.marker.terrariumOtherSummary',
        6,
        '#4c4e4f',
        'npc',
      ),
    ],
  },
  {
    id: 'special-pokemon',
    labelKey: 'maps.group.specialPokemon',
    categories: [
      category(
        'legendary-pokemon',
        'maps.category.legendaryPokemon',
        'maps.marker.terrariumPokemonSummary',
        1,
        '#b14524',
        'legendary',
      ),
      category(
        'tera-pokemon',
        'maps.category.teraPokemon',
        'maps.marker.terrariumPokemonSummary',
        34,
        '#b14524',
        'tera-pokemon',
      ),
    ],
  },
]

export const TERRARIUM_CATEGORIES = TERRARIUM_CATEGORY_GROUPS.flatMap((group) => group.categories)
const categoryIds = new Set(TERRARIUM_CATEGORIES.map((item) => item.id))

export const TERRARIUM_MARKERS = parseGameMapMarkers(
  rawMarkers,
  categoryIds,
  { width: TERRARIUM_MAP_WIDTH, height: TERRARIUM_MAP_HEIGHT },
  'Terrarium',
)

export const TERRARIUM_TOTAL = TERRARIUM_CATEGORIES.reduce((total, item) => total + item.count, 0)

export const TERRARIUM_MAP = defineGameMap({
  id: 'terrarium',
  gameTitle: 'Pokémon Scarlet & Violet',
  regionName: 'Terarium',
  titleKey: 'maps.terrariumTitle',
  viewportLabelKey: 'maps.terrariumViewportLabel',
  themeClassName: 'game-map-page--terrarium',
  width: TERRARIUM_MAP_WIDTH,
  height: TERRARIUM_MAP_HEIGHT,
  tileBaseZoom: TERRARIUM_TILE_BASE_ZOOM,
  tileMinZoom: 10,
  tileMaxZoom: 15,
  tileOrigin: TERRARIUM_TILE_ORIGIN,
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-scarlet-violet/terrarium/default-v1',
  tileExtension: 'jpg',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-scarlet-violet/maps/terrarium',
  groups: TERRARIUM_CATEGORY_GROUPS,
  markers: TERRARIUM_MARKERS,
})
