import { createGameMap } from '../game-map'
import { TERRARIUM_CATEGORY_GROUPS } from './categories'
import rawMarkers from './markers.json'

export const {
  categories: TERRARIUM_CATEGORIES,
  markers: TERRARIUM_MARKERS,
  map: TERRARIUM_MAP,
} = createGameMap(rawMarkers, TERRARIUM_CATEGORY_GROUPS, 'Terrarium', {
  id: 'terrarium',
  gameTitle: 'Pokémon Scarlet & Violet',
  regionName: 'Terarium',
  titleKey: 'maps.terrariumTitle',
  viewportLabelKey: 'maps.terrariumViewportLabel',
  themeClassName: 'game-map-page--terrarium',
  width: 16_384,
  height: 16_384,
  tileBaseZoom: 15,
  tileMinZoom: 10,
  tileMaxZoom: 15,
  tileOrigin: { x: 16_288, y: 16_288 },
  tileBaseUrl: 'https://tiles.mapgenie.io/games/pokemon-scarlet-violet/terrarium/default-v1',
  tileExtension: 'jpg',
  tileOrder: 'xy',
  sourceUrl: 'https://mapgenie.io/pokemon-scarlet-violet/maps/terrarium',
})
