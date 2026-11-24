import { createGameMap } from '../game-map'
import { MAP_CATEGORY_GROUPS } from './categories'
import rawMarkers from './markers.json'

export const {
  categories: MAP_CATEGORIES,
  markers: KANTO_MARKERS,
  map: KANTO_MAP,
} = createGameMap(rawMarkers, MAP_CATEGORY_GROUPS, 'Kanto', {
  id: 'kanto',
  gameTitle: 'Pokémon FireRed & LeafGreen',
  regionName: 'Kanto',
  titleKey: 'maps.kantoTitle',
  viewportLabelKey: 'maps.viewportLabel',
  themeClassName: 'game-map-page--kanto',
  width: 6912,
  height: 8192,
  tileBaseZoom: 14,
  tileMinZoom: 11,
  tileMaxZoom: 16,
  tileOrigin: { x: 8134, y: 8140 },
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-firered-leafgreen/kanto/firered-v2',
  tileExtension: 'jpg',
  tileOrder: 'yx',
  sourceUrl: 'https://mapgenie.io/pokemon-firered-leafgreen/maps/kanto',
})
