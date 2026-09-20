import { useId } from 'react'

type Stat = {
  base_stat: number
  stat: { name: string }
}

type BaseStatsRadarProps = {
  stats: Stat[]
  statNames: Record<string, string>
  label: string
}

const CENTER_X = 190
const CENTER_Y = 160
const CHART_RADIUS = 104
const LABEL_RADIUS = 137
const MAX_STAT = 255

function pointAt(index: number, count: number, radius: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
  }
}

function pointsFor(count: number, radiusAt: (index: number) => number) {
  return Array.from({ length: count }, (_, index) => {
    const point = pointAt(index, count, radiusAt(index))
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
  }).join(' ')
}

export function BaseStatsRadar({ stats, statNames, label }: BaseStatsRadarProps) {
  const titleId = useId()
  const descriptionId = useId()
  const statSummary = stats
    .map(({ base_stat, stat }) => `${statNames[stat.name] ?? stat.name}: ${base_stat}`)
    .join(', ')

  if (stats.length < 3) return null

  const gridPoints = [0.25, 0.5, 0.75, 1].map((level) =>
    pointsFor(stats.length, () => CHART_RADIUS * level))
  const valuePoints = pointsFor(stats.length, (index) =>
    CHART_RADIUS * Math.min(stats[index].base_stat / MAX_STAT, 1))

  return (
    <figure className="stats-radar">
      <svg
        viewBox="0 0 380 325"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{label}</title>
        <desc id={descriptionId}>{statSummary}</desc>

        <g className="radar-grid">
          {gridPoints.map((points, index) => <polygon key={index} points={points} />)}
          {stats.map((_, index) => {
            const edge = pointAt(index, stats.length, CHART_RADIUS)
            return <line key={index} x1={CENTER_X} y1={CENTER_Y} x2={edge.x} y2={edge.y} />
          })}
        </g>

        <polygon className="radar-area" points={valuePoints} />
        <g className="radar-points">
          {stats.map(({ base_stat }, index) => {
            const point = pointAt(index, stats.length, CHART_RADIUS * Math.min(base_stat / MAX_STAT, 1))
            return <circle key={index} cx={point.x} cy={point.y} r="3.5" />
          })}
        </g>

        <g className="radar-labels">
          {stats.map(({ base_stat, stat }, index) => {
            const point = pointAt(index, stats.length, LABEL_RADIUS)
            const anchor = point.x < CENTER_X - 10 ? 'end' : point.x > CENTER_X + 10 ? 'start' : 'middle'
            return (
              <text key={stat.name} x={point.x} y={point.y} textAnchor={anchor}>
                <tspan x={point.x}>{statNames[stat.name] ?? stat.name}</tspan>
                <tspan className="radar-value" x={point.x} dy="15">{base_stat}</tspan>
              </text>
            )
          })}
        </g>
      </svg>
    </figure>
  )
}
