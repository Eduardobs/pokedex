import { createGameMap, gameMapCategory, type GameMapCategoryGroup } from './game-map'
import rawMarkers from './lumiose-map-markers.json'

export type LumioseCategoryId =
  | 'holovator'
  | 'point-of-interest'
  | 'wild-zone'
  | 'boutique'
  | 'cafe'
  | 'hair-salon'
  | 'pokemon-center'
  | 'restaurant'
  | 'colorful-screw'
  | 'mega-stone'
  | 'tm'
  | 'key-item'
  | 'medicine'
  | 'other-item'
  | 'poke-ball'
  | 'treasure'
  | 'main-mission'
  | 'side-mission'
  | 'promotion-match'
  | 'ladder'
  | 'miscellaneous'
  | 'npc'
  | 'alpha-pokemon'
  | 'mega-pokemon'

export const LUMIOSE_MAP_WIDTH = 16_384
export const LUMIOSE_MAP_HEIGHT = 16_384
export const LUMIOSE_TILE_BASE_ZOOM = 14
export const LUMIOSE_TILE_ORIGIN = { x: 8_128, y: 8_128 } as const

const category = gameMapCategory<LumioseCategoryId>

export const LUMIOSE_CATEGORY_GROUPS: GameMapCategoryGroup[] = [
  {
    id: 'locations',
    labelKey: 'maps.group.locations',
    categories: [
      category(
        'holovator',
        'maps.category.holovator',
        'maps.marker.lumioseLocationSummary',
        23,
        '#3f7791',
        'transition',
      ),
      category(
        'point-of-interest',
        'maps.category.pointOfInterest',
        'maps.marker.lumioseLocationSummary',
        27,
        '#3f7791',
        'area',
      ),
      category(
        'wild-zone',
        'maps.category.wildZone',
        'maps.marker.lumioseLocationSummary',
        20,
        '#3f7791',
        'area',
      ),
    ],
  },
  {
    id: 'services',
    labelKey: 'maps.group.services',
    categories: [
      category(
        'boutique',
        'maps.category.boutique',
        'maps.marker.lumioseServiceSummary',
        41,
        '#418f71',
        'clothing',
      ),
      category(
        'cafe',
        'maps.category.cafe',
        'maps.marker.lumioseServiceSummary',
        17,
        '#418f71',
        'food',
      ),
      category(
        'hair-salon',
        'maps.category.hairSalon',
        'maps.marker.lumioseServiceSummary',
        5,
        '#418f71',
        'hairdresser',
      ),
      category(
        'pokemon-center',
        'maps.category.pokemonCenter',
        'maps.marker.lumioseServiceSummary',
        9,
        '#418f71',
        'pokemon-center',
      ),
      category(
        'restaurant',
        'maps.category.restaurant',
        'maps.marker.lumioseServiceSummary',
        4,
        '#418f71',
        'food',
      ),
    ],
  },
  {
    id: 'collectibles',
    labelKey: 'maps.group.collectibles',
    categories: [
      category(
        'colorful-screw',
        'maps.category.colorfulScrew',
        'maps.marker.lumioseCollectibleSummary',
        100,
        '#89418f',
        'collectible',
      ),
      category(
        'mega-stone',
        'maps.category.megaStone',
        'maps.marker.lumioseCollectibleSummary',
        63,
        '#89418f',
        'key-item',
      ),
      category(
        'tm',
        'maps.category.tm',
        'maps.marker.lumioseCollectibleSummary',
        107,
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
        'key-item',
        'maps.category.keyItem',
        'maps.marker.lumioseItemSummary',
        15,
        '#46a3a2',
        'key-item',
      ),
      category(
        'medicine',
        'maps.category.medicine',
        'maps.marker.lumioseItemSummary',
        394,
        '#46a3a2',
        'medicine',
      ),
      category(
        'other-item',
        'maps.category.otherItem',
        'maps.marker.lumioseItemSummary',
        316,
        '#46a3a2',
        'item',
      ),
      category(
        'poke-ball',
        'maps.category.pokeBall',
        'maps.marker.lumioseItemSummary',
        314,
        '#46a3a2',
        'poke-ball',
      ),
      category(
        'treasure',
        'maps.category.treasure',
        'maps.marker.lumioseItemSummary',
        65,
        '#46a3a2',
        'key-item',
      ),
    ],
  },
  {
    id: 'missions',
    labelKey: 'maps.group.missions',
    categories: [
      category(
        'main-mission',
        'maps.category.mainMission',
        'maps.marker.lumioseMissionSummary',
        41,
        '#cfab3e',
        'mission',
      ),
      category(
        'side-mission',
        'maps.category.sideMission',
        'maps.marker.lumioseMissionSummary',
        119,
        '#cfab3e',
        'mission',
      ),
    ],
  },
  {
    id: 'battles',
    labelKey: 'maps.group.battles',
    categories: [
      category(
        'promotion-match',
        'maps.category.promotionMatch',
        'maps.marker.lumioseBattleSummary',
        10,
        '#827168',
        'battle',
      ),
    ],
  },
  {
    id: 'other',
    labelKey: 'maps.group.other',
    categories: [
      category(
        'ladder',
        'maps.category.ladder',
        'maps.marker.lumioseOtherSummary',
        160,
        '#4c4e4f',
        'transition',
      ),
      category(
        'miscellaneous',
        'maps.category.miscellaneous',
        'maps.marker.lumioseOtherSummary',
        14,
        '#4c4e4f',
        'item',
      ),
      category('npc', 'maps.category.npc', 'maps.marker.lumioseOtherSummary', 35, '#4c4e4f', 'npc'),
    ],
  },
  {
    id: 'special-pokemon',
    labelKey: 'maps.group.specialPokemon',
    categories: [
      category(
        'alpha-pokemon',
        'maps.category.alphaPokemon',
        'maps.marker.lumiosePokemonSummary',
        64,
        '#b14524',
        'sparkles',
      ),
      category(
        'mega-pokemon',
        'maps.category.megaPokemon',
        'maps.marker.lumiosePokemonSummary',
        16,
        '#b14524',
        'sparkles',
      ),
    ],
  },
]

const mapData = createGameMap(rawMarkers, LUMIOSE_CATEGORY_GROUPS, 'Lumiose City', {
  id: 'lumiose-city',
  gameTitle: 'Pokémon Legends: Z-A',
  regionName: 'Lumiose City',
  titleKey: 'maps.lumioseTitle',
  viewportLabelKey: 'maps.lumioseViewportLabel',
  themeClassName: 'game-map-page--lumiose',
  width: LUMIOSE_MAP_WIDTH,
  height: LUMIOSE_MAP_HEIGHT,
  tileBaseZoom: LUMIOSE_TILE_BASE_ZOOM,
  tileMinZoom: 8,
  tileMaxZoom: 14,
  tileOrigin: LUMIOSE_TILE_ORIGIN,
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-legends-z-a/lumiose-city/day-v2',
  tileExtension: 'jpg',
  tileOrder: 'yx',
  sourceUrl: 'https://mapgenie.io/pokemon-legends-z-a/maps/lumiose-city',
})
export const LUMIOSE_CATEGORIES = mapData.categories
export const LUMIOSE_MARKERS = mapData.markers
export const LUMIOSE_TOTAL = mapData.total
export const LUMIOSE_MAP = mapData.map
