import { createGameMap } from '../game-map'
import { HISUI_CATEGORY_GROUPS } from './categories'
import rawMarkers from './markers.json'

export const {
  categories: HISUI_CATEGORIES,
  markers: HISUI_MARKERS,
  map: HISUI_MAP,
} = createGameMap(rawMarkers, HISUI_CATEGORY_GROUPS, 'Hisui', {
  id: 'hisui-region',
  gameTitle: 'Pokémon Legends: Arceus',
  regionName: 'Hisui',
  titleKey: 'maps.hisuiTitle',
  viewportLabelKey: 'maps.hisuiViewportLabel',
  themeClassName: 'game-map-page--hisui',
  width: 16_384,
  height: 16_384,
  tileBaseZoom: 14,
  tileMinZoom: 9,
  tileMaxZoom: 14,
  tileOrigin: { x: 8_128, y: 8_128 },
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-legends-arceus/hisui-region/default-v3',
  tileExtension: 'png',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-legends-arceus/maps/hisui-region',
})
