import { gameMapCategory, type GameMapCategoryGroup } from '../game-map'

type TerrariumCategoryId =
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

const category = gameMapCategory<TerrariumCategoryId>

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
    categories: [category('tm', 'maps.category.tm', 'maps.marker.terrariumCollectibleSummary', 110, '#89418f', 'tm')],
  },
  {
    id: 'items',
    labelKey: 'maps.group.items',
    categories: [
      category('medicine', 'maps.category.medicine', 'maps.marker.terrariumItemSummary', 103, '#287f7e', 'medicine'),
      category('other-item', 'maps.category.otherItem', 'maps.marker.terrariumItemSummary', 199, '#287f7e', 'item'),
      category('poke-ball', 'maps.category.pokeBall', 'maps.marker.terrariumItemSummary', 69, '#287f7e', 'poke-ball'),
      category('treasure', 'maps.category.treasure', 'maps.marker.terrariumItemSummary', 145, '#287f7e', 'key-item'),
    ],
  },
  {
    id: 'battles',
    labelKey: 'maps.group.battles',
    categories: [
      category('trainer', 'maps.category.trainer', 'maps.marker.terrariumBattleSummary', 60, '#827168', 'trainer'),
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
      category('npc', 'maps.category.npc', 'maps.marker.terrariumOtherSummary', 6, '#4c4e4f', 'npc'),
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
