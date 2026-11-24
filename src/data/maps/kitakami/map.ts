import { createGameMap } from '../game-map'
import { KITAKAMI_CATEGORY_GROUPS } from './categories'
import rawMarkers from './markers.json'

export const {
  categories: KITAKAMI_CATEGORIES,
  markers: KITAKAMI_MARKERS,
  map: KITAKAMI_MAP,
} = createGameMap(rawMarkers, KITAKAMI_CATEGORY_GROUPS, 'Kitakami', {
  id: 'kitakami',
  gameTitle: 'Pokémon Scarlet & Violet',
  regionName: 'Kitakami',
  titleKey: 'maps.kitakamiTitle',
  viewportLabelKey: 'maps.kitakamiViewportLabel',
  themeClassName: 'game-map-page--kitakami',
  width: 16_384,
  height: 16_384,
  tileBaseZoom: 15,
  tileMinZoom: 10,
  tileMaxZoom: 15,
  tileOrigin: { x: 16_288, y: 16_288 },
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-scarlet-violet/kitakami-region/default-v1',
  tileExtension: 'jpg',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-scarlet-violet/maps/kitakami-region',
})
