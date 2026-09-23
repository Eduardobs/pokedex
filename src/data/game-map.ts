import type { TranslationKey } from '../contexts/LanguageContext'

export type GameMapIconId =
  | 'area'
  | 'battle'
  | 'berry'
  | 'cave'
  | 'clothing'
  | 'collectible'
  | 'food'
  | 'hairdresser'
  | 'item'
  | 'key-item'
  | 'legendary'
  | 'medicine'
  | 'mission'
  | 'move-tutor'
  | 'npc'
  | 'obstacle'
  | 'poke-ball'
  | 'pokemon-center'
  | 'shop'
  | 'shrine'
  | 'sparkles'
  | 'tera-pokemon'
  | 'tm'
  | 'trainer'
  | 'transition'
  | 'watchtower'
  | 'waterfall'

export type GameMapCategory = {
  id: string
  labelKey: TranslationKey
  summaryKey: TranslationKey
  count: number
  color: string
  icon: GameMapIconId
}

export type GameMapCategoryGroup = {
  id: string
  labelKey: TranslationKey
  categories: GameMapCategory[]
}

export type GameMapMarker = {
  id: string
  name: string
  area: string
  category: string
  x: number
  y: number
}

export type GameMapDefinition = {
  id: string
  gameTitle: string
  regionName: string
  titleKey: TranslationKey
  viewportLabelKey: TranslationKey
  themeClassName: string
  width: number
  height: number
  tileBaseZoom: number
  tileMinZoom: number
  tileMaxZoom: number
  tileOrigin: { x: number; y: number }
  tileBaseUrl: string
  tileExtension: 'jpg' | 'png'
  tileOrder: 'xy' | 'yx'
  sourceUrl: string
  groups: GameMapCategoryGroup[]
  markers: GameMapMarker[]
}

type MarkerBounds = { width: number; height: number }

export function gameMapCategory<CategoryId extends string>(
  id: CategoryId,
  labelKey: TranslationKey,
  summaryKey: TranslationKey,
  count: number,
  color: string,
  icon: GameMapIconId,
): GameMapCategory {
  return { id, labelKey, summaryKey, count, color, icon }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseGameMapMarkers(
  raw: unknown,
  categoryIds: ReadonlySet<string>,
  bounds: MarkerBounds,
  mapName: string,
): GameMapMarker[] {
  if (!Array.isArray(raw) || raw.length > 10_000) {
    throw new Error(`Invalid ${mapName} marker catalog`)
  }

  const seenIds = new Set<string>()
  return raw.map((value, index) => {
    if (!isRecord(value)) throw new Error(`Invalid ${mapName} marker at index ${index}`)

    const { id, name, area, category, x, y } = value
    if (
      typeof id !== 'string' ||
      !id ||
      id.length > 40 ||
      seenIds.has(id) ||
      typeof name !== 'string' ||
      !name ||
      name.length > 180 ||
      typeof area !== 'string' ||
      !area ||
      area.length > 180 ||
      typeof category !== 'string' ||
      !categoryIds.has(category) ||
      typeof x !== 'number' ||
      !Number.isFinite(x) ||
      x < 0 ||
      x > bounds.width ||
      typeof y !== 'number' ||
      !Number.isFinite(y) ||
      y < 0 ||
      y > bounds.height
    ) {
      throw new Error(`Invalid ${mapName} marker at index ${index}`)
    }

    seenIds.add(id)
    return { id, name, area, category, x, y }
  })
}

export function createGameMapCatalog(
  rawMarkers: unknown,
  groups: GameMapCategoryGroup[],
  bounds: MarkerBounds,
  mapName: string,
) {
  const categories = groups.flatMap((group) => group.categories)
  const categoryIds = new Set(categories.map((category) => category.id))
  const markers = parseGameMapMarkers(rawMarkers, categoryIds, bounds, mapName)
  const total = categories.reduce((sum, category) => sum + category.count, 0)

  return { categories, markers, total }
}

export function createGameMap(
  rawMarkers: unknown,
  groups: GameMapCategoryGroup[],
  mapName: string,
  definition: Omit<GameMapDefinition, 'groups' | 'markers'>,
) {
  const catalog = createGameMapCatalog(
    rawMarkers,
    groups,
    { width: definition.width, height: definition.height },
    mapName,
  )

  return {
    ...catalog,
    map: defineGameMap({ ...definition, groups, markers: catalog.markers }),
  }
}

export function defineGameMap(definition: GameMapDefinition): GameMapDefinition {
  const categories = definition.groups.flatMap((group) => group.categories)
  const categoryIds = new Set(categories.map((category) => category.id))
  if (categoryIds.size !== categories.length) {
    throw new Error(`Duplicate category in ${definition.id} map`)
  }

  const actualCounts = new Map<string, number>()
  definition.markers.forEach((marker) => {
    if (!categoryIds.has(marker.category)) {
      throw new Error(`Unknown ${definition.id} map category: ${marker.category}`)
    }
    actualCounts.set(marker.category, (actualCounts.get(marker.category) ?? 0) + 1)
  })

  categories.forEach((category) => {
    if ((actualCounts.get(category.id) ?? 0) !== category.count) {
      throw new Error(`Incorrect ${definition.id} map count for ${category.id}`)
    }
  })

  return definition
}
