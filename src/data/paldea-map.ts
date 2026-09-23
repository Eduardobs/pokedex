import { createGameMap, gameMapCategory, type GameMapCategoryGroup } from './game-map'
import rawMarkers from './paldea-map-markers.json'

export type PaldeaCategoryId =
  | 'chansey-supply'
  | 'clothing-store'
  | 'delibird-presents'
  | 'fast-travel'
  | 'food-store'
  | 'hairdresser'
  | 'location'
  | 'pokemon-center'
  | 'shrine'
  | 'watchtower'
  | 'gimmighoul-roaming'
  | 'ominous-stake'
  | 'tm'
  | 'battle-item'
  | 'herba-mystica'
  | 'medicine'
  | 'other-item'
  | 'poke-ball'
  | 'treasure'
  | 'path-of-legends'
  | 'side-mission'
  | 'starfall-street'
  | 'victory-road'
  | 'gym-leader'
  | 'team-star-boss'
  | 'trainer'
  | 'cave-entrance'
  | 'miscellaneous'
  | 'npc'
  | 'gimmighoul-chest'
  | 'legendary-pokemon'
  | 'tera-pokemon'

export const PALDEA_MAP_WIDTH = 16_384
export const PALDEA_MAP_HEIGHT = 16_384
export const PALDEA_TILE_BASE_ZOOM = 15
export const PALDEA_TILE_ORIGIN = { x: 16_288, y: 16_288 } as const

const category = gameMapCategory<PaldeaCategoryId>

export const PALDEA_CATEGORY_GROUPS: GameMapCategoryGroup[] = [
  {
    id: 'locations',
    labelKey: 'maps.group.locations',
    categories: [
      category(
        'chansey-supply',
        'maps.category.chanseySupply',
        'maps.marker.paldeaLocationSummary',
        6,
        '#3f7791',
        'medicine',
      ),
      category(
        'clothing-store',
        'maps.category.clothingStore',
        'maps.marker.paldeaLocationSummary',
        17,
        '#3f7791',
        'clothing',
      ),
      category(
        'delibird-presents',
        'maps.category.delibirdPresents',
        'maps.marker.paldeaLocationSummary',
        6,
        '#3f7791',
        'shop',
      ),
      category(
        'fast-travel',
        'maps.category.fastTravel',
        'maps.marker.paldeaLocationSummary',
        35,
        '#3f7791',
        'transition',
      ),
      category(
        'food-store',
        'maps.category.foodStore',
        'maps.marker.paldeaLocationSummary',
        78,
        '#3f7791',
        'food',
      ),
      category(
        'hairdresser',
        'maps.category.hairdresser',
        'maps.marker.paldeaLocationSummary',
        3,
        '#3f7791',
        'hairdresser',
      ),
      category(
        'location',
        'maps.category.location',
        'maps.marker.paldeaLocationSummary',
        15,
        '#3f7791',
        'area',
      ),
      category(
        'pokemon-center',
        'maps.category.pokemonCenter',
        'maps.marker.paldeaLocationSummary',
        34,
        '#3f7791',
        'pokemon-center',
      ),
      category(
        'shrine',
        'maps.category.shrine',
        'maps.marker.paldeaLocationSummary',
        4,
        '#3f7791',
        'shrine',
      ),
      category(
        'watchtower',
        'maps.category.watchtower',
        'maps.marker.paldeaLocationSummary',
        14,
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
        'gimmighoul-roaming',
        'maps.category.gimmighoulRoaming',
        'maps.marker.paldeaCollectibleSummary',
        297,
        '#89418f',
        'collectible',
      ),
      category(
        'ominous-stake',
        'maps.category.ominousStake',
        'maps.marker.paldeaCollectibleSummary',
        32,
        '#89418f',
        'key-item',
      ),
      category(
        'tm',
        'maps.category.tm',
        'maps.marker.paldeaCollectibleSummary',
        566,
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
        'maps.marker.paldeaItemSummary',
        189,
        '#287f7e',
        'battle',
      ),
      category(
        'herba-mystica',
        'maps.category.herbaMystica',
        'maps.marker.paldeaItemSummary',
        5,
        '#287f7e',
        'berry',
      ),
      category(
        'medicine',
        'maps.category.medicine',
        'maps.marker.paldeaItemSummary',
        1103,
        '#287f7e',
        'medicine',
      ),
      category(
        'other-item',
        'maps.category.otherItem',
        'maps.marker.paldeaItemSummary',
        525,
        '#287f7e',
        'item',
      ),
      category(
        'poke-ball',
        'maps.category.pokeBall',
        'maps.marker.paldeaItemSummary',
        390,
        '#287f7e',
        'poke-ball',
      ),
      category(
        'treasure',
        'maps.category.treasure',
        'maps.marker.paldeaItemSummary',
        136,
        '#287f7e',
        'key-item',
      ),
    ],
  },
  {
    id: 'missions',
    labelKey: 'maps.group.missions',
    categories: [
      category(
        'path-of-legends',
        'maps.category.pathOfLegends',
        'maps.marker.paldeaMissionSummary',
        8,
        '#9a7921',
        'mission',
      ),
      category(
        'side-mission',
        'maps.category.sideMission',
        'maps.marker.paldeaMissionSummary',
        19,
        '#9a7921',
        'mission',
      ),
      category(
        'starfall-street',
        'maps.category.starfallStreet',
        'maps.marker.paldeaMissionSummary',
        6,
        '#9a7921',
        'mission',
      ),
      category(
        'victory-road',
        'maps.category.victoryRoad',
        'maps.marker.paldeaMissionSummary',
        10,
        '#9a7921',
        'mission',
      ),
    ],
  },
  {
    id: 'battles',
    labelKey: 'maps.group.battles',
    categories: [
      category(
        'gym-leader',
        'maps.category.gymLeader',
        'maps.marker.paldeaBattleSummary',
        8,
        '#827168',
        'battle',
      ),
      category(
        'team-star-boss',
        'maps.category.teamStarBoss',
        'maps.marker.paldeaBattleSummary',
        5,
        '#827168',
        'battle',
      ),
      category(
        'trainer',
        'maps.category.trainer',
        'maps.marker.paldeaBattleSummary',
        286,
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
        'maps.marker.paldeaOtherSummary',
        40,
        '#4c4e4f',
        'cave',
      ),
      category(
        'miscellaneous',
        'maps.category.miscellaneous',
        'maps.marker.paldeaOtherSummary',
        3,
        '#4c4e4f',
        'area',
      ),
      category('npc', 'maps.category.npc', 'maps.marker.paldeaOtherSummary', 22, '#4c4e4f', 'npc'),
    ],
  },
  {
    id: 'special-pokemon',
    labelKey: 'maps.group.specialPokemon',
    categories: [
      category(
        'gimmighoul-chest',
        'maps.category.gimmighoulChest',
        'maps.marker.paldeaPokemonSummary',
        25,
        '#b14524',
        'collectible',
      ),
      category(
        'legendary-pokemon',
        'maps.category.legendaryPokemon',
        'maps.marker.paldeaPokemonSummary',
        30,
        '#b14524',
        'legendary',
      ),
      category(
        'tera-pokemon',
        'maps.category.teraPokemon',
        'maps.marker.paldeaPokemonSummary',
        68,
        '#b14524',
        'tera-pokemon',
      ),
    ],
  },
]

const mapData = createGameMap(rawMarkers, PALDEA_CATEGORY_GROUPS, 'Paldea', {
  id: 'paldea',
  gameTitle: 'Pokémon Scarlet & Violet',
  regionName: 'Paldea',
  titleKey: 'maps.paldeaTitle',
  viewportLabelKey: 'maps.paldeaViewportLabel',
  themeClassName: 'game-map-page--paldea',
  width: PALDEA_MAP_WIDTH,
  height: PALDEA_MAP_HEIGHT,
  tileBaseZoom: PALDEA_TILE_BASE_ZOOM,
  tileMinZoom: 10,
  tileMaxZoom: 15,
  tileOrigin: PALDEA_TILE_ORIGIN,
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-scarlet-violet/paldea-region/default-v1',
  tileExtension: 'jpg',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-scarlet-violet/maps/paldea-region',
})
export const PALDEA_CATEGORIES = mapData.categories
export const PALDEA_MARKERS = mapData.markers
export const PALDEA_TOTAL = mapData.total
export const PALDEA_MAP = mapData.map
