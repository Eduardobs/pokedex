import {
  Accessibility,
  ArrowLeft,
  Badge,
  Box,
  CircleDot,
  CircleUserRound,
  Cross,
  Dumbbell,
  Expand,
  Gem,
  GraduationCap,
  Landmark,
  MapPin,
  MapPinned,
  Minus,
  Mountain,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCcw,
  Search,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  TowerControl,
  Utensils,
  Waves,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import type { GameMapDefinition, GameMapIconId, GameMapMarker } from '../data/game-map'
import { formatNumber, normalizeSearchText } from '../lib/api'
import { SearchField } from './SearchField'

const MIN_ZOOM = 1
const MAX_ZOOM = 32
const ZOOM_LEVELS = [1, 1.5, 2, 2.5, 3, 4, 6, 8, 12, 16, 24, 32] as const
const TILE_SIZE = 256

type ViewportSize = { width: number; height: number }
type MapTile = { key: string; x: number; y: number; size: number; url: string }
type MarkerCluster = { key: string; x: number; y: number; markers: GameMapMarker[] }

function categoryIcon(icon: GameMapIconId, size = 15) {
  const props = { size, 'aria-hidden': true as const }
  switch (icon) {
    case 'area':
      return <MapPin {...props} />
    case 'cave':
      return <Mountain {...props} />
    case 'pokemon-center':
      return <Cross {...props} />
    case 'transition':
      return <RefreshCcw {...props} />
    case 'move-tutor':
      return <GraduationCap {...props} />
    case 'npc':
      return <CircleUserRound {...props} />
    case 'shop':
      return <ShoppingBag {...props} />
    case 'clothing':
      return <Shirt {...props} />
    case 'food':
      return <Utensils {...props} />
    case 'hairdresser':
      return <Scissors {...props} />
    case 'watchtower':
      return <TowerControl {...props} />
    case 'shrine':
      return <Landmark {...props} />
    case 'collectible':
      return <CircleDot {...props} />
    case 'berry':
    case 'poke-ball':
      return <CircleDot {...props} />
    case 'item':
      return <Package {...props} />
    case 'key-item':
      return <Gem {...props} />
    case 'tm':
      return <Box {...props} />
    case 'obstacle':
      return <Dumbbell {...props} />
    case 'waterfall':
      return <Waves {...props} />
    case 'battle':
      return <Swords {...props} />
    case 'trainer':
      return <Accessibility {...props} />
    case 'mission':
      return <Badge {...props} />
    case 'medicine':
      return <Cross {...props} />
    case 'legendary':
      return <Star {...props} />
    case 'tera-pokemon':
      return <Sparkles {...props} />
  }
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function getAdjacentZoom(value: number, direction: 1 | -1) {
  if (direction === 1) {
    return ZOOM_LEVELS.find((level) => level > value) ?? MAX_ZOOM
  }
  return [...ZOOM_LEVELS].reverse().find((level) => level < value) ?? MIN_ZOOM
}

function getFitScale(viewport: ViewportSize, map: GameMapDefinition) {
  return Math.min(viewport.width / map.width, viewport.height / map.height)
}

function getSourceZoom(zoom: number, map: GameMapDefinition) {
  return Math.min(
    map.tileMaxZoom,
    Math.max(map.tileMinZoom, map.tileMinZoom + Math.floor(Math.log2(zoom))),
  )
}

function getVisibleTiles(
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

function getMarkerClusters(
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

    const key = separateMarkers
      ? marker.id
      : `${Math.floor(x / clusterSize)}:${Math.floor(y / clusterSize)}`
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

export function GameMapPage({ map }: { map: GameMapDefinition }) {
  const { language, t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1024, height: 720 })
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [selectedMarker, setSelectedMarker] = useState<GameMapMarker | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    panX: number
    panY: number
  } | null>(null)

  const query = searchParams.get('q') ?? ''
  const categoryParam = searchParams.get('categories')
  const categories = useMemo(() => map.groups.flatMap((group) => group.categories), [map.groups])
  const activeCategories = useMemo(() => {
    if (categoryParam === null) return new Set(categories.map((category) => category.id))
    if (categoryParam === 'none') return new Set<string>()
    const valid = new Set(categories.map((category) => category.id))
    return new Set(categoryParam.split(',').filter((id) => valid.has(id)))
  }, [categories, categoryParam])

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )
  const normalizedQuery = normalizeSearchText(query)
  const visibleMarkers = map.markers.filter((marker) => {
    if (!activeCategories.has(marker.category)) return false
    if (!normalizedQuery) return true
    const category = categoryById.get(marker.category)
    return normalizeSearchText(
      `${marker.name} ${marker.area} ${category ? t(category.labelKey) : ''}`,
    ).includes(normalizedQuery)
  })

  const fitScale = getFitScale(viewport, map)
  const displayScale = fitScale * zoom
  const sourceZoom = getSourceZoom(zoom, map)
  const tiles = useMemo(
    () => getVisibleTiles(map, viewport, pan, displayScale, sourceZoom),
    [displayScale, map, pan, sourceZoom, viewport],
  )
  const clusters = getMarkerClusters(
    map,
    visibleMarkers,
    viewport,
    pan,
    displayScale,
    Boolean(normalizedQuery) || zoom >= 6,
  )

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const updateSize = () => {
      const bounds = element.getBoundingClientRect()
      if (bounds.width > 0 && bounds.height > 0) {
        setViewport({ width: bounds.width, height: bounds.height })
      }
    }
    updateSize()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [filtersOpen, fullscreen])

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === viewportRef.current)
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  useEffect(() => {
    if (selectedMarker && !visibleMarkers.some((marker) => marker.id === selectedMarker.id)) {
      setSelectedMarker(null)
    }
  }, [selectedMarker, visibleMarkers])

  const updateSearchParams = (nextQuery: string, nextCategories: Set<string>) => {
    const next = new URLSearchParams()
    if (nextQuery) next.set('q', nextQuery)
    if (nextCategories.size === 0) next.set('categories', 'none')
    else if (nextCategories.size !== categories.length) {
      next.set('categories', [...nextCategories].join(','))
    }
    setSearchParams(next, { replace: true })
  }

  const toggleCategory = (id: string) => {
    const next = new Set(activeCategories)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    updateSearchParams(query, next)
  }

  const resetView = () => {
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }

  const updateZoom = (nextZoom: number, anchor?: { x: number; y: number }) => {
    const boundedZoom = clampZoom(nextZoom)
    if (boundedZoom === zoom) return
    if (anchor) {
      const oldScale = fitScale * zoom
      const nextScale = fitScale * boundedZoom
      const relativeX = anchor.x - viewport.width / 2
      const relativeY = anchor.y - viewport.height / 2
      const mapX = (relativeX - pan.x) / oldScale
      const mapY = (relativeY - pan.y) / oldScale
      setPan({ x: relativeX - mapX * nextScale, y: relativeY - mapY * nextScale })
    }
    setZoom(boundedZoom)
  }

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      element.focus({ preventScroll: true })
      const bounds = element.getBoundingClientRect()
      const nextZoom = getAdjacentZoom(zoom, event.deltaY < 0 ? 1 : -1)
      if (nextZoom === zoom) return

      const oldScale = fitScale * zoom
      const nextScale = fitScale * nextZoom
      const relativeX = event.clientX - bounds.left - viewport.width / 2
      const relativeY = event.clientY - bounds.top - viewport.height / 2
      const mapX = (relativeX - pan.x) / oldScale
      const mapY = (relativeY - pan.y) / oldScale
      setPan({ x: relativeX - mapX * nextScale, y: relativeY - mapY * nextScale })
      setZoom(nextZoom)
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [fitScale, pan.x, pan.y, viewport.height, viewport.width, zoom])

  const focusCluster = (cluster: MarkerCluster) => {
    const nextZoom = clampZoom(Math.max(zoom + 1, zoom * 1.7))
    const average = cluster.markers.reduce(
      (total, marker) => ({ x: total.x + marker.x, y: total.y + marker.y }),
      { x: 0, y: 0 },
    )
    average.x /= cluster.markers.length
    average.y /= cluster.markers.length
    const nextScale = fitScale * nextZoom
    setPan({
      x: -(average.x - map.width / 2) * nextScale,
      y: -(average.y - map.height / 2) * nextScale,
    })
    setZoom(nextZoom)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = event.shiftKey ? 96 : 48
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      updateZoom(getAdjacentZoom(zoom, 1))
    } else if (event.key === '-') {
      event.preventDefault()
      updateZoom(getAdjacentZoom(zoom, -1))
    } else if (event.key === '0') {
      event.preventDefault()
      resetView()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setPan((value) => ({ ...value, x: value.x + delta }))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setPan((value) => ({ ...value, x: value.x - delta }))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPan((value) => ({ ...value, y: value.y + delta }))
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setPan((value) => ({ ...value, y: value.y - delta }))
    }
  }

  const toggleFullscreen = async () => {
    if (!viewportRef.current) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await viewportRef.current.requestFullscreen()
  }

  return (
    <section className={`game-map-page ${map.themeClassName}`}>
      <header className="map-page-header content-width">
        <div>
          <Link to="/mapas" className="map-back-link">
            <ArrowLeft size={16} aria-hidden="true" /> {t('maps.back')}
          </Link>
          <div className="map-title-row">
            <span className="map-title-icon">
              <MapPinned aria-hidden="true" />
            </span>
            <div>
              <span className="eyebrow">{map.gameTitle}</span>
              <h1>{t(map.titleKey)}</h1>
            </div>
          </div>
        </div>
        <div className="map-header-stats" aria-label={t('maps.catalogSummary')}>
          <span>
            <b>{formatNumber(map.markers.length, language)}</b> {t('maps.points')}
          </span>
          <span>
            <b>{categories.length}</b> {t('maps.categories')}
          </span>
          <span className="map-region-chip">{map.regionName}</span>
        </div>
      </header>

      <div className={`map-explorer ${filtersOpen ? '' : 'filters-collapsed'}`}>
        <aside className="map-filters" aria-label={t('maps.filters')}>
          <div className="map-filter-heading">
            <div>
              <span>{t('maps.filters')}</span>
              <small>{t('maps.filterHint')}</small>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label={t('maps.hideFilters')}
            >
              <PanelLeftClose size={19} aria-hidden="true" />
            </button>
          </div>
          <SearchField
            value={query}
            onChange={(value) => updateSearchParams(value, activeCategories)}
            clearLabel={t('common.clear')}
            aria-label={t('maps.searchLabel')}
            placeholder={t('maps.searchPlaceholder')}
          />
          <div className="map-filter-actions">
            <button
              type="button"
              onClick={() =>
                updateSearchParams(query, new Set(categories.map((category) => category.id)))
              }
            >
              {t('maps.selectAll')}
            </button>
            <button type="button" onClick={() => updateSearchParams(query, new Set())}>
              {t('maps.clearAll')}
            </button>
          </div>
          <fieldset className="map-category-list">
            <legend className="sr-only">{t('maps.categories')}</legend>
            {map.groups.map((group) => (
              <section key={group.id} aria-labelledby={`${map.id}-map-group-${group.id}`}>
                <h2 id={`${map.id}-map-group-${group.id}`}>{t(group.labelKey)}</h2>
                {group.categories.map((category) => (
                  <label
                    key={category.id}
                    style={{ '--pin-color': category.color } as React.CSSProperties}
                  >
                    <input
                      type="checkbox"
                      checked={activeCategories.has(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    <span className="map-category-icon">{categoryIcon(category.icon)}</span>
                    <span>{t(category.labelKey)}</span>
                    <b>{formatNumber(category.count, language)}</b>
                  </label>
                ))}
              </section>
            ))}
          </fieldset>
        </aside>

        <div className="map-view-column">
          <div className="map-toolbar">
            {!filtersOpen && (
              <button
                type="button"
                className="map-show-filters"
                onClick={() => setFiltersOpen(true)}
              >
                <PanelLeftOpen size={18} aria-hidden="true" /> {t('maps.showFilters')}
              </button>
            )}
            <p role="status">
              {t('maps.visiblePins', { count: formatNumber(visibleMarkers.length, language) })}
            </p>
            <span>{t('maps.dragHint')}</span>
          </div>

          <div
            className="map-viewport"
            ref={viewportRef}
            tabIndex={0}
            aria-label={t(map.viewportLabelKey)}
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - 0"
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest('button')) return
              dragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                panX: pan.x,
                panY: pan.y,
              }
              event.currentTarget.setPointerCapture(event.pointerId)
              event.currentTarget.classList.add('is-dragging')
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current
              if (!drag || drag.pointerId !== event.pointerId) return
              setPan({
                x: drag.panX + event.clientX - drag.startX,
                y: drag.panY + event.clientY - drag.startY,
              })
            }}
            onPointerUp={(event) => {
              dragRef.current = null
              event.currentTarget.classList.remove('is-dragging')
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
          >
            <div
              className="map-canvas"
              style={{
                width: map.width,
                height: map.height,
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${displayScale})`,
              }}
              aria-hidden="true"
            >
              <div className="map-tile-layer">
                {tiles.map((tile) => (
                  <img
                    key={tile.key}
                    src={tile.url}
                    alt=""
                    draggable="false"
                    style={{ left: tile.x, top: tile.y, width: tile.size, height: tile.size }}
                  />
                ))}
              </div>
            </div>

            <div className="map-pin-layer">
              {clusters.map((cluster) => {
                if (cluster.markers.length > 1) {
                  return (
                    <button
                      type="button"
                      className="map-pin-cluster"
                      style={{ left: cluster.x, top: cluster.y }}
                      key={cluster.key}
                      onClick={() => focusCluster(cluster)}
                      aria-label={t('maps.clusterLabel', {
                        count: formatNumber(cluster.markers.length, language),
                      })}
                    >
                      {formatNumber(cluster.markers.length, language)}
                    </button>
                  )
                }

                const marker = cluster.markers[0]
                const category = categoryById.get(marker.category)!
                const selected = selectedMarker?.id === marker.id
                return (
                  <button
                    type="button"
                    className={`map-pin ${selected ? 'selected' : ''}`}
                    style={
                      {
                        '--pin-color': category.color,
                        left: cluster.x,
                        top: cluster.y,
                      } as React.CSSProperties
                    }
                    key={marker.id}
                    onClick={() => setSelectedMarker(marker)}
                    aria-label={`${t(category.labelKey)}: ${marker.name}, ${marker.area}`}
                    aria-pressed={selected}
                  >
                    {categoryIcon(category.icon, 14)}
                  </button>
                )
              })}
            </div>

            <div className="map-zoom-controls" aria-label={t('maps.zoomControls')}>
              <button
                type="button"
                onClick={() => updateZoom(getAdjacentZoom(zoom, 1))}
                disabled={zoom === MAX_ZOOM}
                aria-label={t('maps.zoomIn')}
              >
                <Plus aria-hidden="true" />
              </button>
              <output aria-label={t('maps.zoomLevel')}>{Math.round(zoom * 100)}%</output>
              <button
                type="button"
                onClick={() => updateZoom(getAdjacentZoom(zoom, -1))}
                disabled={zoom === MIN_ZOOM}
                aria-label={t('maps.zoomOut')}
              >
                <Minus aria-hidden="true" />
              </button>
              <button type="button" onClick={resetView} aria-label={t('maps.resetView')}>
                <RefreshCcw aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label={fullscreen ? t('maps.exitFullscreen') : t('maps.fullscreen')}
              >
                <Expand aria-hidden="true" />
              </button>
            </div>

            {selectedMarker && (
              <article className="map-marker-detail" aria-live="polite">
                <button
                  type="button"
                  className="map-marker-close"
                  onClick={() => setSelectedMarker(null)}
                  aria-label={t('maps.closeDetails')}
                >
                  <X size={17} aria-hidden="true" />
                </button>
                <span
                  className="map-marker-kind"
                  style={
                    {
                      '--pin-color': categoryById.get(selectedMarker.category)?.color,
                    } as React.CSSProperties
                  }
                >
                  {categoryIcon(categoryById.get(selectedMarker.category)!.icon)}
                  {t(categoryById.get(selectedMarker.category)!.labelKey)}
                </span>
                <h2>{selectedMarker.name}</h2>
                <p className="map-marker-area">
                  <MapPin size={14} aria-hidden="true" /> {selectedMarker.area}
                </p>
                <p>{t(categoryById.get(selectedMarker.category)!.summaryKey)}</p>
              </article>
            )}

            {!visibleMarkers.length && (
              <div className="map-empty">
                <Search aria-hidden="true" />
                <h2>{t('maps.emptyTitle')}</h2>
                <p>{t('maps.emptyDescription')}</p>
                <button
                  type="button"
                  onClick={() =>
                    updateSearchParams('', new Set(categories.map((category) => category.id)))
                  }
                >
                  {t('maps.resetFilters')}
                </button>
              </div>
            )}
          </div>

          <p className="map-attribution">
            <MapPinned size={14} aria-hidden="true" /> {t('maps.mapSource')}{' '}
            <a href={map.sourceUrl} target="_blank" rel="noopener noreferrer">
              MapGenie
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
