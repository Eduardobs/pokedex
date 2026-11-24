import { createGameMap } from '../game-map'
import { PALDEA_CATEGORY_GROUPS } from './categories'
import rawMarkers from './markers.json'

export const {
  categories: PALDEA_CATEGORIES,
  markers: PALDEA_MARKERS,
  map: PALDEA_MAP,
} = createGameMap(rawMarkers, PALDEA_CATEGORY_GROUPS, 'Paldea', {
  id: 'paldea',
  gameTitle: 'Pokémon Scarlet & Violet',
  regionName: 'Paldea',
  titleKey: 'maps.paldeaTitle',
  viewportLabelKey: 'maps.paldeaViewportLabel',
  themeClassName: 'game-map-page--paldea',
  width: 16_384,
  height: 16_384,
  tileBaseZoom: 15,
  tileMinZoom: 10,
  tileMaxZoom: 15,
  tileOrigin: { x: 16_288, y: 16_288 },
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-scarlet-violet/paldea-region/default-v1',
  tileExtension: 'jpg',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-scarlet-violet/maps/paldea-region',
})
