import { createGameMap, gameMapCategory, type GameMapCategoryGroup } from './game-map'
import rawMarkers from './kitakami-map-markers.json'

export type KitakamiCategoryId =
  | 'fast-travel'
  | 'general-store'
  | 'pokemon-center'
  | 'tm'
  | 'battle-item'
  | 'key-item'
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

export const KITAKAMI_MAP_WIDTH = 16_384
export const KITAKAMI_MAP_HEIGHT = 16_384
export const KITAKAMI_TILE_BASE_ZOOM = 15
export const KITAKAMI_TILE_ORIGIN = { x: 16_288, y: 16_288 } as const

const category = gameMapCategory<KitakamiCategoryId>

export const KITAKAMI_CATEGORY_GROUPS: GameMapCategoryGroup[] = [
  {
    id: 'locations',
    labelKey: 'maps.group.locations',
    categories: [
      category(
        'fast-travel',
        'maps.category.fastTravel',
        'maps.marker.kitakamiLocationSummary',
        10,
        '#3f7791',
        'transition',
      ),
      category(
        'general-store',
        'maps.category.generalStore',
        'maps.marker.kitakamiLocationSummary',
        1,
        '#3f7791',
        'shop',
      ),
      category(
        'pokemon-center',
        'maps.category.pokemonCenter',
        'maps.marker.kitakamiLocationSummary',
        1,
        '#3f7791',
        'pokemon-center',
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
        'maps.marker.kitakamiCollectibleSummary',
        160,
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
        'battle-item',
        'maps.category.battleItem',
        'maps.marker.kitakamiItemSummary',
        29,
        '#287f7e',
        'battle',
      ),
      category(
        'key-item',
        'maps.category.keyItem',
        'maps.marker.kitakamiItemSummary',
        1,
        '#287f7e',
        'key-item',
      ),
      category(
        'medicine',
        'maps.category.medicine',
        'maps.marker.kitakamiItemSummary',
        280,
        '#287f7e',
        'medicine',
      ),
      category(
        'other-item',
        'maps.category.otherItem',
        'maps.marker.kitakamiItemSummary',
        95,
        '#287f7e',
        'item',
      ),
      category(
        'poke-ball',
        'maps.category.pokeBall',
        'maps.marker.kitakamiItemSummary',
        79,
        '#287f7e',
        'poke-ball',
      ),
      category(
        'treasure',
        'maps.category.treasure',
        'maps.marker.kitakamiItemSummary',
        16,
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
        'maps.marker.kitakamiBattleSummary',
        47,
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
        'maps.marker.kitakamiOtherSummary',
        29,
        '#4c4e4f',
        'cave',
      ),
      category(
        'miscellaneous',
        'maps.category.miscellaneous',
        'maps.marker.kitakamiOtherSummary',
        1,
        '#4c4e4f',
        'area',
      ),
      category('npc', 'maps.category.npc', 'maps.marker.kitakamiOtherSummary', 7, '#4c4e4f', 'npc'),
    ],
  },
  {
    id: 'special-pokemon',
    labelKey: 'maps.group.specialPokemon',
    categories: [
      category(
        'legendary-pokemon',
        'maps.category.legendaryPokemon',
        'maps.marker.kitakamiPokemonSummary',
        5,
        '#b14524',
        'legendary',
      ),
      category(
        'tera-pokemon',
        'maps.category.teraPokemon',
        'maps.marker.kitakamiPokemonSummary',
        21,
        '#b14524',
        'tera-pokemon',
      ),
    ],
  },
]

const mapData = createGameMap(rawMarkers, KITAKAMI_CATEGORY_GROUPS, 'Kitakami', {
  id: 'kitakami',
  gameTitle: 'Pokémon Scarlet & Violet',
  regionName: 'Kitakami',
  titleKey: 'maps.kitakamiTitle',
  viewportLabelKey: 'maps.kitakamiViewportLabel',
  themeClassName: 'game-map-page--kitakami',
  width: KITAKAMI_MAP_WIDTH,
  height: KITAKAMI_MAP_HEIGHT,
  tileBaseZoom: KITAKAMI_TILE_BASE_ZOOM,
  tileMinZoom: 10,
  tileMaxZoom: 15,
  tileOrigin: KITAKAMI_TILE_ORIGIN,
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-scarlet-violet/kitakami-region/default-v1',
  tileExtension: 'jpg',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-scarlet-violet/maps/kitakami-region',
})
export const KITAKAMI_CATEGORIES = mapData.categories
export const KITAKAMI_MARKERS = mapData.markers
export const KITAKAMI_TOTAL = mapData.total
export const KITAKAMI_MAP = mapData.map
