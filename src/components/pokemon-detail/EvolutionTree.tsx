import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Translate } from '../../contexts/LanguageContext'
import { pokemonArtwork, prettyName } from '../../lib/api'
import type { EvolutionNode } from '../../types'

function resourceName(detail: Record<string, unknown>, key: string) {
  return (detail[key] as { name?: string } | null)?.name
}

function evolutionCondition(detail: Record<string, unknown>, t: Translate) {
  const conditions: string[] = []
  const trigger = resourceName(detail, 'trigger')
  const item = resourceName(detail, 'item')
  const heldItem = resourceName(detail, 'held_item')
  const knownMove = resourceName(detail, 'known_move')
  const knownMoveType = resourceName(detail, 'known_move_type')
  const location = resourceName(detail, 'location')

  if (trigger === 'trade') conditions.push(t('evolution.trade'))
  if (detail.min_level) conditions.push(t('evolution.level', { level: String(detail.min_level) }))
  if (item) conditions.push(prettyName(item))
  if (detail.min_happiness) conditions.push(t('evolution.friendship', { value: String(detail.min_happiness) }))
  if (heldItem) conditions.push(t('evolution.holding', { item: prettyName(heldItem) }))
  if (knownMove) conditions.push(t('evolution.knownMove', { move: prettyName(knownMove) }))
  if (knownMoveType) conditions.push(t('evolution.knownType', { type: prettyName(knownMoveType) }))
  if (location) conditions.push(t('evolution.location', { location: prettyName(location) }))
  if (detail.time_of_day) conditions.push(t('evolution.time', { time: prettyName(String(detail.time_of_day)) }))
  if (detail.needs_overworld_rain) conditions.push(t('evolution.rain'))
  if (detail.turn_upside_down) conditions.push(t('evolution.upsideDown'))
  if (!conditions.length && trigger && trigger !== 'level-up') conditions.push(prettyName(trigger))

  return conditions.length ? conditions.join(' · ') : t('evolution.special')
}

function evolutionConditions(details: Array<Record<string, unknown>>, t: Translate) {
  if (!details.length) return t('evolution.basic')
  return [...new Set(details.map((detail) => evolutionCondition(detail, t)))].join(' / ')
}

type Props = {
  node: EvolutionNode
  t: Translate
  root?: boolean
}

export function EvolutionTreeNode({ node, t, root = false }: Props) {
  const id = Number(node.species.url.split('/').filter(Boolean).at(-1))

  return (
    <li>
      {!root && <span className="evolution-condition"><ChevronRight /><small>{evolutionConditions(node.evolution_details, t)}</small></span>}
      <Link to={`/pokemon/${node.species.name}`} className="evolution-pokemon">
        <img src={pokemonArtwork(id)} alt={prettyName(node.species.name)} width="100" height="100" loading="lazy" decoding="async" />
        <b>{prettyName(node.species.name)}</b>
        <small>#{String(id).padStart(4, '0')}</small>
      </Link>
      {node.evolves_to.length > 0 && (
        <ul>{node.evolves_to.map((child) => <EvolutionTreeNode key={child.species.name} node={child} t={t} />)}</ul>
      )}
    </li>
  )
}
