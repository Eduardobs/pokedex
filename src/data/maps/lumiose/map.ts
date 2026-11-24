import { createGameMap } from '../game-map'
import { LUMIOSE_CATEGORY_GROUPS } from './categories'
import rawMarkers from './markers.json'

export const {
  categories: LUMIOSE_CATEGORIES,
  markers: LUMIOSE_MARKERS,
  map: LUMIOSE_MAP,
} = createGameMap(rawMarkers, LUMIOSE_CATEGORY_GROUPS, 'Lumiose City', {
  id: 'lumiose-city',
  gameTitle: 'Pokémon Legends: Z-A',
  regionName: 'Lumiose City',
  titleKey: 'maps.lumioseTitle',
  viewportLabelKey: 'maps.lumioseViewportLabel',
  themeClassName: 'game-map-page--lumiose',
  width: 16_384,
  height: 16_384,
  tileBaseZoom: 14,
  tileMinZoom: 8,
  tileMaxZoom: 14,
  tileOrigin: { x: 8_128, y: 8_128 },
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-legends-z-a/lumiose-city/day-v2',
  tileExtension: 'jpg',
  tileOrder: 'yx',
  sourceUrl: 'https://mapgenie.io/pokemon-legends-z-a/maps/lumiose-city',
})
