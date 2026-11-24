import { summarizeMapCategories, gameMapCategory, type GameMapCategoryGroup } from '../game-map'

type MapCategoryId =
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

const category = gameMapCategory<MapCategoryId>

export const MAP_CATEGORY_GROUPS: GameMapCategoryGroup[] = [
  {
    id: 'locations',
    labelKey: 'maps.group.locations',
    categories: [
      category('area', 'maps.category.area', 'maps.marker.areaSummary', 115, '#2c87c8', 'area'),
      category('cave', 'maps.category.cave', 'maps.marker.caveSummary', 44, '#7254a4', 'cave'),
      category(
        'pokemon-center',
        'maps.category.pokemonCenter',
        'maps.marker.centerSummary',
        20,
        '#df3c4b',
        'pokemon-center',
      ),
      category('transition', 'maps.category.transition', 'maps.marker.transitionSummary', 586, '#4b6978', 'transition'),
    ],
  },
  {
    id: 'npcs',
    labelKey: 'maps.group.npcs',
    categories: [
      category('move-tutor', 'maps.category.moveTutor', 'maps.marker.tutorSummary', 16, '#d96c28', 'move-tutor'),
      category('notable-npc', 'maps.category.notableNpc', 'maps.marker.npcSummary', 11, '#b43685', 'npc'),
      category('shop', 'maps.category.shop', 'maps.marker.shopSummary', 28, '#168f83', 'shop'),
      category('trader', 'maps.category.trader', 'maps.marker.traderSummary', 9, '#446bc1', 'npc'),
    ],
  },
  {
    id: 'items',
    labelKey: 'maps.group.items',
    categories: [
      category('berry', 'maps.category.berry', 'maps.marker.berrySummary', 47, '#cc536e', 'berry'),
      category('hm', 'maps.category.hm', 'maps.marker.hmSummary', 7, '#3c8bd4', 'tm'),
      category('item', 'maps.category.item', 'maps.marker.itemSummary', 266, '#df8c19', 'item'),
      category('key-item', 'maps.category.keyItem', 'maps.marker.keyItemSummary', 30, '#9b6acb', 'key-item'),
      category('poke-ball', 'maps.category.pokeBall', 'maps.marker.pokeBallSummary', 32, '#d9363e', 'poke-ball'),
      category('tm', 'maps.category.tm', 'maps.marker.tmSummary', 54, '#3b9e70', 'tm'),
    ],
  },
  {
    id: 'obstacles',
    labelKey: 'maps.group.obstacles',
    categories: [
      category(
        'movable-boulder',
        'maps.category.movableBoulder',
        'maps.marker.obstacleSummary',
        48,
        '#73574a',
        'obstacle',
      ),
      category('small-plant', 'maps.category.smallPlant', 'maps.marker.obstacleSummary', 49, '#4f9d43', 'obstacle'),
      category(
        'smashable-rock',
        'maps.category.smashableRock',
        'maps.marker.obstacleSummary',
        97,
        '#7c695e',
        'obstacle',
      ),
      category('waterfall', 'maps.category.waterfall', 'maps.marker.waterfallSummary', 1, '#288dcc', 'waterfall'),
    ],
  },
  {
    id: 'battles',
    labelKey: 'maps.group.battles',
    categories: [
      category('elite-four', 'maps.category.eliteFour', 'maps.marker.eliteSummary', 5, '#873ca0', 'battle'),
      category('gym-leader', 'maps.category.gymLeader', 'maps.marker.gymSummary', 8, '#e44b38', 'battle'),
      category('trainer', 'maps.category.trainer', 'maps.marker.battleSummary', 490, '#ca3151', 'trainer'),
    ],
  },
]

export const MAP_TOTAL = summarizeMapCategories(MAP_CATEGORY_GROUPS).total
