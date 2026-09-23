import { createGameMap, gameMapCategory, type GameMapCategoryGroup } from './game-map'
import rawMarkers from './hisui-map-markers.json'

export type HisuiCategoryId =
  | 'area'
  | 'arena'
  | 'camp'
  | 'cave'
  | 'fast-travel'
  | 'game'
  | 'point-of-interest'
  | 'transition'
  | 'clothier'
  | 'craftworks'
  | 'general-store'
  | 'hairdresser'
  | 'photo-studio'
  | 'quarters'
  | 'trading-post'
  | 'training-grounds'
  | 'vendor'
  | 'old-verse'
  | 'wisp'
  | 'request'
  | 'story-mission'
  | 'character'
  | 'miscellaneous'
  | 'alpha-pokemon'
  | 'event-pokemon'
  | 'noble-pokemon'
  | 'pokemon-area'
  | 'rare-pokemon'
  | 'unown-pokemon'
  | 'pokemon'
  | 'material'

export const HISUI_MAP_WIDTH = 16_384
export const HISUI_MAP_HEIGHT = 16_384
export const HISUI_TILE_BASE_ZOOM = 14
export const HISUI_TILE_ORIGIN = { x: 8_128, y: 8_128 } as const

const category = gameMapCategory<HisuiCategoryId>

export const HISUI_CATEGORY_GROUPS: GameMapCategoryGroup[] = [
  {
    id: 'locations',
    labelKey: 'maps.group.locations',
    categories: [
      category('area', 'maps.category.area', 'maps.marker.hisuiLocationSummary', 74, '#3f7791', 'area'),
      category('arena', 'maps.category.arena', 'maps.marker.hisuiLocationSummary', 10, '#3f7791', 'battle'),
      category('camp', 'maps.category.camp', 'maps.marker.hisuiLocationSummary', 11, '#3f7791', 'pokemon-center'),
      category('cave', 'maps.category.cave', 'maps.marker.hisuiLocationSummary', 14, '#3f7791', 'cave'),
      category(
        'fast-travel',
        'maps.category.fastTravel',
        'maps.marker.hisuiLocationSummary',
        5,
        '#3f7791',
        'transition',
      ),
      category('game', 'maps.category.game', 'maps.marker.hisuiLocationSummary', 4, '#3f7791', 'battle'),
      category(
        'point-of-interest',
        'maps.category.pointOfInterest',
        'maps.marker.hisuiLocationSummary',
        12,
        '#3f7791',
        'area',
      ),
      category(
        'transition',
        'maps.category.transition',
        'maps.marker.hisuiLocationSummary',
        7,
        '#3f7791',
        'transition',
      ),
    ],
  },
  {
    id: 'services',
    labelKey: 'maps.group.services',
    categories: [
      category('clothier', 'maps.category.clothier', 'maps.marker.hisuiServiceSummary', 1, '#418f71', 'clothing'),
      category('craftworks', 'maps.category.craftworks', 'maps.marker.hisuiServiceSummary', 2, '#418f71', 'shop'),
      category('general-store', 'maps.category.generalStore', 'maps.marker.hisuiServiceSummary', 1, '#418f71', 'shop'),
      category(
        'hairdresser',
        'maps.category.hairdresser',
        'maps.marker.hisuiServiceSummary',
        1,
        '#418f71',
        'hairdresser',
      ),
      category('photo-studio', 'maps.category.photoStudio', 'maps.marker.hisuiServiceSummary', 1, '#418f71', 'area'),
      category('quarters', 'maps.category.quarters', 'maps.marker.hisuiServiceSummary', 2, '#418f71', 'area'),
      category('trading-post', 'maps.category.tradingPost', 'maps.marker.hisuiServiceSummary', 1, '#418f71', 'shop'),
      category(
        'training-grounds',
        'maps.category.trainingGrounds',
        'maps.marker.hisuiServiceSummary',
        2,
        '#418f71',
        'trainer',
      ),
      category('vendor', 'maps.category.vendor', 'maps.marker.hisuiServiceSummary', 1, '#418f71', 'shop'),
    ],
  },
  {
    id: 'collectibles',
    labelKey: 'maps.group.collectibles',
    categories: [
      category(
        'old-verse',
        'maps.category.oldVerse',
        'maps.marker.hisuiCollectibleSummary',
        20,
        '#89418f',
        'collectible',
      ),
      category('wisp', 'maps.category.wisp', 'maps.marker.hisuiCollectibleSummary', 107, '#89418f', 'collectible'),
    ],
  },
  {
    id: 'missions',
    labelKey: 'maps.group.missions',
    categories: [
      category('request', 'maps.category.request', 'maps.marker.hisuiQuestSummary', 95, '#cfab3e', 'mission'),
      category(
        'story-mission',
        'maps.category.storyMission',
        'maps.marker.hisuiQuestSummary',
        27,
        '#cfab3e',
        'mission',
      ),
    ],
  },
  {
    id: 'other',
    labelKey: 'maps.group.other',
    categories: [
      category('character', 'maps.category.character', 'maps.marker.hisuiOtherSummary', 43, '#4c4e4f', 'npc'),
      category('miscellaneous', 'maps.category.miscellaneous', 'maps.marker.hisuiOtherSummary', 8, '#4c4e4f', 'area'),
    ],
  },
  {
    id: 'special-pokemon',
    labelKey: 'maps.group.specialPokemon',
    categories: [
      category(
        'alpha-pokemon',
        'maps.category.alphaPokemon',
        'maps.marker.hisuiPokemonSummary',
        90,
        '#b14524',
        'legendary',
      ),
      category(
        'event-pokemon',
        'maps.category.eventPokemon',
        'maps.marker.hisuiPokemonSummary',
        22,
        '#b14524',
        'sparkles',
      ),
      category(
        'noble-pokemon',
        'maps.category.noblePokemon',
        'maps.marker.hisuiPokemonSummary',
        5,
        '#b14524',
        'legendary',
      ),
      category('pokemon-area', 'maps.category.pokemonArea', 'maps.marker.hisuiPokemonSummary', 73, '#b14524', 'area'),
      category(
        'rare-pokemon',
        'maps.category.rarePokemon',
        'maps.marker.hisuiPokemonSummary',
        18,
        '#b14524',
        'legendary',
      ),
      category(
        'unown-pokemon',
        'maps.category.unownPokemon',
        'maps.marker.hisuiPokemonSummary',
        28,
        '#b14524',
        'collectible',
      ),
    ],
  },
  {
    id: 'pokemon',
    labelKey: 'maps.group.pokemon',
    categories: [
      category('pokemon', 'maps.category.pokemon', 'maps.marker.hisuiPokemonSummary', 196, '#b14524', 'poke-ball'),
    ],
  },
  {
    id: 'materials',
    labelKey: 'maps.group.materials',
    categories: [
      category('material', 'maps.category.material', 'maps.marker.hisuiMaterialSummary', 1_644, '#827168', 'item'),
    ],
  },
]

const mapData = createGameMap(rawMarkers, HISUI_CATEGORY_GROUPS, 'Hisui', {
  id: 'hisui-region',
  gameTitle: 'Pokémon Legends: Arceus',
  regionName: 'Hisui',
  titleKey: 'maps.hisuiTitle',
  viewportLabelKey: 'maps.hisuiViewportLabel',
  themeClassName: 'game-map-page--hisui',
  width: HISUI_MAP_WIDTH,
  height: HISUI_MAP_HEIGHT,
  tileBaseZoom: HISUI_TILE_BASE_ZOOM,
  tileMinZoom: 9,
  tileMaxZoom: 14,
  tileOrigin: HISUI_TILE_ORIGIN,
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-legends-arceus/hisui-region/default-v3',
  tileExtension: 'png',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-legends-arceus/maps/hisui-region',
})
export const HISUI_CATEGORIES = mapData.categories
export const HISUI_MARKERS = mapData.markers
export const HISUI_TOTAL = mapData.total
export const HISUI_MAP = mapData.map
