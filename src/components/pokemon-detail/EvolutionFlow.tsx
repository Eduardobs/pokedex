import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Maximize, Minus, Plus, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Language, Translate } from '../../contexts/LanguageContext'
import type { EvolutionNode } from '../../types'
import { formatNumber, idFromUrl, pokemonArtwork, prettyName } from '../../lib/api'
import { defaultPokemonNameForSpecies } from '../../lib/pokemon-species'
import {
  layoutEvolutionFlow,
  type FlowBox,
  type FlowMeasurements,
  type EvolutionFlowNode,
} from '../../lib/evolution-flow'
import { EvolutionRules } from '../EvolutionRules'
import { evolutionCondition } from './evolution-conditions'

type Props = { node: EvolutionNode; t: Translate; language: Language; currentSpecies?: string }
const position = (box: FlowBox): CSSProperties => ({ left: box.x, top: box.y, width: box.width })

function FlowBranch({
  item,
  items,
  currentSpecies,
  t,
  language,
}: {
  item: EvolutionFlowNode
  items: EvolutionFlowNode[]
  currentSpecies?: string
  t: Translate
  language: Language
}) {
  const { node, box, label, key } = item
  const id = idFromUrl(node.species.url),
    current = currentSpecies === node.species.name
  const methods = [
    ...new Map(
      node.evolution_details.map((detail) => {
        const condition = evolutionCondition(detail, t, language)
        return [`${condition}:${detail.condition_expression?.expression ?? ''}`, { detail, condition }]
      }),
    ).values(),
  ]
  const children = items.filter((child) => child.parentKey === key)
  return (
    <li className="evolution-flow-branch">
      <Link
        className={`evolution-flow-node${current ? ' is-current' : ''}`}
        data-flow-key={key}
        data-flow-part="node"
        style={position(box)}
        to={`/pokemon/${encodeURIComponent(defaultPokemonNameForSpecies(node.species.name))}`}
        aria-current={current ? 'page' : undefined}
      >
        <span className="evolution-flow-stage">
          {t('evolution.stage', { stage: formatNumber(item.depth + 1, language) })}
        </span>
        <img
          src={pokemonArtwork(id)}
          alt={prettyName(node.species.name)}
          width="80"
          height="80"
          loading="lazy"
          decoding="async"
        />
        <small>#{String(id).padStart(4, '0')}</small>
        <strong>{prettyName(node.species.name)}</strong>
        {current && <span className="evolution-flow-current">{t('evolution.viewing')}</span>}
      </Link>
      {label && (
        <div className="evolution-flow-conditions" data-flow-key={key} data-flow-part="label" style={position(label)}>
          <span className="evolution-flow-relation">
            {t('evolution.from', { name: prettyName(item.parentName ?? '') })}
          </span>
          <span className="sr-only">{t('evolution.requirements')}</span>
          {methods.length ? (
            methods.map(({ detail, condition }, index) => (
              <Fragment key={`${condition}:${index}`}>
                {index > 0 && <span className="evolution-flow-or">{t('evolution.or')}</span>}
                <div className="evolution-flow-method">
                  <p>{condition}</p>
                  {detail.condition_expression?.expression && <EvolutionRules detail={detail} />}
                </div>
              </Fragment>
            ))
          ) : (
            <p className="evolution-flow-method">{t('evolution.special')}</p>
          )}
        </div>
      )}
      {children.length > 0 && (
        <ul className="evolution-flow-descendants" data-branching={children.length > 1}>
          {children.map((child) => (
            <FlowBranch
              key={child.key}
              item={child}
              items={items}
              currentSpecies={currentSpecies}
              t={t}
              language={language}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function EvolutionFlow({ node, t, language, currentSpecies }: Props) {
  const viewport = useRef<HTMLDivElement>(null),
    scene = useRef<HTMLDivElement>(null)
  const marker = `evolution-arrow-${useId().replaceAll(':', '')}`
  const [width, setWidth] = useState(900),
    [vertical, setVertical] = useState(false)
  const [measurements, setMeasurements] = useState<FlowMeasurements>({}),
    [scale, setScale] = useState(1)
  const layout = useMemo(
    () => layoutEvolutionFlow(node, { vertical, width, measurements }),
    [node, vertical, width, measurements],
  )
  const centered = useRef('')
  useLayoutEffect(() => {
    const container = viewport.current
    if (!container) return
    const update = () => {
      const nextWidth = container.clientWidth
      if (nextWidth) setWidth(nextWidth)
      setVertical(window.innerWidth <= 720)
      const next: FlowMeasurements = {}
      scene.current?.querySelectorAll<HTMLElement>('[data-flow-part]').forEach((element) => {
        const key = element.dataset.flowKey!,
          part = element.dataset.flowPart as 'node' | 'label'
        next[key] ??= {}
        if (element.offsetHeight) next[key][part] = element.offsetHeight
      })
      setMeasurements((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next))
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(container)
    scene.current?.querySelectorAll<HTMLElement>('[data-flow-part]').forEach((element) => observer.observe(element))
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [node, language, vertical])
  useLayoutEffect(() => {
    const key = `${node.species.name}:${vertical}`
    if (centered.current === key) return
    centered.current = key
    setScale(1)
    const container = viewport.current
    if (container) {
      container.scrollLeft = 0
      container.scrollTop = vertical
        ? 0
        : Math.max(0, layout.nodes[0].box.y - container.clientHeight / 2 + layout.nodes[0].box.height / 2)
    }
  }, [node.species.name, vertical, layout])
  const zoom = (next: number) => {
    const container = viewport.current
    const bounded = Math.max(0.2, Math.min(1.5, next))
    const x = container ? (container.scrollLeft + container.clientWidth / 2) / scale : 0
    const y = container ? (container.scrollTop + container.clientHeight / 2) / scale : 0
    setScale(bounded)
    requestAnimationFrame(() =>
      container?.scrollTo({
        left: Math.max(0, x * bounded - container.clientWidth / 2),
        top: Math.max(0, y * bounded - container.clientHeight / 2),
        behavior: 'instant',
      }),
    )
  }
  const fit = () => {
    const container = viewport.current
    if (!container) return
    setScale(
      Math.max(
        0.01,
        Math.min(1, (container.clientWidth - 16) / layout.width, (container.clientHeight - 16) / layout.height),
      ),
    )
    requestAnimationFrame(() => container.scrollTo({ left: 0, top: 0, behavior: 'instant' }))
  }
  return (
    <div className="evolution-flowchart">
      <div className="evolution-flow-toolbar" role="group" aria-label={t('evolution.flowControls')}>
        <div>
          <button
            type="button"
            aria-label={t('evolution.zoomOut')}
            disabled={scale <= 0.2}
            onClick={() => zoom(scale - 0.15)}
          >
            <Minus size={18} aria-hidden="true" />
          </button>
          <output aria-live="polite">{formatNumber(Math.round(scale * 100), language)}%</output>
          <button
            type="button"
            aria-label={t('evolution.zoomIn')}
            disabled={scale >= 1.5}
            onClick={() => zoom(scale + 0.15)}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <button type="button" onClick={fit}>
          <Maximize size={16} aria-hidden="true" />
          {t('evolution.fitFlow')}
        </button>
        <button type="button" onClick={() => zoom(1)} aria-label={t('evolution.resetZoom')}>
          <RotateCcw size={16} aria-hidden="true" />
          100%
        </button>
      </div>
      <p className="evolution-flow-hint" id={`${marker}-hint`}>
        {t('evolution.flowHint')}
      </p>
      <div
        className="evolution-flow-viewport"
        ref={viewport}
        role="region"
        aria-label={t('evolution.flowDiagram')}
        aria-describedby={`${marker}-hint`}
        tabIndex={0}
      >
        <div className="evolution-flow-size" style={{ width: layout.width * scale, height: layout.height * scale }}>
          <div
            className="evolution-flow-scene"
            ref={scene}
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${scale})`,
              left: Math.max(0, (width - layout.width * scale) / 2),
            }}
          >
            <svg
              className="evolution-flow-lines"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
              </defs>
              {layout.edges.map((edge) => (
                <path
                  key={edge.to}
                  data-flow-from={edge.from}
                  data-flow-to={edge.to}
                  d={edge.path}
                  markerEnd={`url(#${marker})`}
                />
              ))}
            </svg>
            <ul className="evolution-flow" aria-label={t('detail.evolution')}>
              <FlowBranch
                item={layout.nodes[0]}
                items={layout.nodes}
                currentSpecies={currentSpecies}
                t={t}
                language={language}
              />
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
