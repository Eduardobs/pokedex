import type { GameMapDefinition, GameMapMarker } from '../../data/maps/game-map'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 32

const ZOOM_LEVELS = [1, 1.5, 2, 2.5, 3, 4, 6, 8, 12, 16, 24, 32] as const
const TILE_SIZE = 256

export type ViewportSize = { width: number; height: number }
export type MapTile = { key: string; x: number; y: number; size: number; url: string }
export type MarkerCluster = { key: string; x: number; y: number; markers: GameMapMarker[] }

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export function getAdjacentZoom(value: number, direction: 1 | -1) {
  if (direction === 1) {
    return ZOOM_LEVELS.find((level) => level > value) ?? MAX_ZOOM
  }

  return [...ZOOM_LEVELS].reverse().find((level) => level < value) ?? MIN_ZOOM
}

export function getFitScale(viewport: ViewportSize, map: GameMapDefinition) {
  return Math.min(viewport.width / map.width, viewport.height / map.height)
}

export function getSourceZoom(zoom: number, map: GameMapDefinition) {
  return Math.min(map.tileMaxZoom, Math.max(map.tileMinZoom, map.tileMinZoom + Math.floor(Math.log2(zoom))))
}

export function getVisibleTiles(
  map: GameMapDefinition,
  viewport: ViewportSize,
  pan: { x: number; y: number },
  scale: number,
  sourceZoom: number,
): MapTile[] {
  const left = Math.max(0, map.width / 2 + (-viewport.width / 2 - pan.x) / scale)
  const right = Math.min(map.width, map.width / 2 + (viewport.width / 2 - pan.x) / scale)
  const top = Math.max(0, map.height / 2 + (-viewport.height / 2 - pan.y) / scale)
  const bottom = Math.min(map.height, map.height / 2 + (viewport.height / 2 - pan.y) / scale)
  const factor = 2 ** (sourceZoom - map.tileBaseZoom)
  const tileLogicalSize = TILE_SIZE / factor
  const originX = map.tileOrigin.x * TILE_SIZE
  const originY = map.tileOrigin.y * TILE_SIZE
  const sourceMinX = Math.floor(map.tileOrigin.x * factor)
  const sourceMaxX = Math.ceil((map.tileOrigin.x + map.width / TILE_SIZE) * factor) - 1
  const sourceMinY = Math.floor(map.tileOrigin.y * factor)
  const sourceMaxY = Math.ceil((map.tileOrigin.y + map.height / TILE_SIZE) * factor) - 1
  const minX = Math.max(sourceMinX, Math.floor(((originX + left) * factor) / TILE_SIZE) - 1)
  const maxX = Math.min(sourceMaxX, Math.floor(((originX + right) * factor) / TILE_SIZE) + 1)
  const minY = Math.max(sourceMinY, Math.floor(((originY + top) * factor) / TILE_SIZE) - 1)
  const maxY = Math.min(sourceMaxY, Math.floor(((originY + bottom) * factor) / TILE_SIZE) + 1)
  const tiles: MapTile[] = []

  for (let tileY = minY; tileY <= maxY; tileY += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      const path = map.tileOrder === 'xy' ? `${tileX}/${tileY}` : `${tileY}/${tileX}`
      tiles.push({
        key: `${sourceZoom}-${tileX}-${tileY}`,
        x: (tileX * TILE_SIZE) / factor - originX,
        y: (tileY * TILE_SIZE) / factor - originY,
        size: tileLogicalSize,
        url: `${map.tileBaseUrl}/${sourceZoom}/${path}.${map.tileExtension}`,
      })
    }
  }

  return tiles
}

export function getMarkerClusters(
  map: GameMapDefinition,
  markers: GameMapMarker[],
  viewport: ViewportSize,
  pan: { x: number; y: number },
  scale: number,
  separateMarkers: boolean,
): MarkerCluster[] {
  const cells = new Map<string, MarkerCluster>()
  const clusterSize = separateMarkers ? 1 : 54

  markers.forEach((marker) => {
    const x = viewport.width / 2 + pan.x + (marker.x - map.width / 2) * scale
    const y = viewport.height / 2 + pan.y + (marker.y - map.height / 2) * scale
    if (x < -40 || x > viewport.width + 40 || y < -40 || y > viewport.height + 40) return

    const key = separateMarkers ? marker.id : `${Math.floor(x / clusterSize)}:${Math.floor(y / clusterSize)}`
    const cluster = cells.get(key)
    if (cluster) {
      const count = cluster.markers.length
      cluster.x = (cluster.x * count + x) / (count + 1)
      cluster.y = (cluster.y * count + y) / (count + 1)
      cluster.markers.push(marker)
    } else {
      cells.set(key, { key, x, y, markers: [marker] })
    }
  })

  return [...cells.values()]
}
