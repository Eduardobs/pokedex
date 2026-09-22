import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Language, Translate } from '../../contexts/LanguageContext'
import { formatNumber, pokemonArtwork, prettyName } from '../../lib/api'
import type { EvolutionDetail, EvolutionNode } from '../../types'

const presentNumber = (value: number | null | undefined): value is number => typeof value === 'number'

function statRelation(value: EvolutionDetail['relative_physical_stats'], t: Translate) {
  if (value === 1) return t('evolution.attackHigher')
  if (value === -1) return t('evolution.defenseHigher')
  return t('evolution.statsEqual')
}

export function evolutionCondition(detail: EvolutionDetail, t: Translate, language: Language = 'pt-BR') {
  const conditions: string[] = []
  const trigger = detail.trigger?.name
  const number = (value: number) => formatNumber(value, language)

  if (trigger === 'trade') conditions.push(detail.trade_species
    ? t('evolution.tradeFor', { species: prettyName(detail.trade_species.name) })
    : t('evolution.trade'))
  if (presentNumber(detail.min_level)) conditions.push(t('evolution.level', { level: number(detail.min_level) }))
  if (detail.item) conditions.push(t('evolution.useItem', { item: prettyName(detail.item.name) }))
  if (presentNumber(detail.min_happiness)) conditions.push(t('evolution.friendship', { value: number(detail.min_happiness) }))
  if (presentNumber(detail.min_affection)) conditions.push(t('evolution.affection', { value: number(detail.min_affection) }))
  if (presentNumber(detail.min_beauty)) conditions.push(t('evolution.beauty', { value: number(detail.min_beauty) }))
  if (detail.gender === 1) conditions.push(t('evolution.female'))
  if (detail.gender === 2) conditions.push(t('evolution.male'))
  if (detail.held_item) conditions.push(t('evolution.holding', { item: prettyName(detail.held_item.name) }))
  if (detail.known_move) conditions.push(t('evolution.knownMove', { move: prettyName(detail.known_move.name) }))
  if (detail.known_move_type) conditions.push(t('evolution.knownType', { type: prettyName(detail.known_move_type.name) }))
  if (detail.location) conditions.push(t('evolution.location', { location: prettyName(detail.location.name) }))
  if (detail.time_of_day) conditions.push(t('evolution.time', { time: prettyName(String(detail.time_of_day)) }))
  if (presentNumber(detail.relative_physical_stats)) conditions.push(statRelation(detail.relative_physical_stats, t))
  if (detail.party_species) conditions.push(t('evolution.partySpecies', { species: prettyName(detail.party_species.name) }))
  if (detail.party_type) conditions.push(t('evolution.partyType', { type: prettyName(detail.party_type.name) }))
  if (detail.near_special_rock) conditions.push(t('evolution.specialRock'))
  if (detail.needs_multiplayer) conditions.push(t('evolution.multiplayer'))
  if (detail.needs_overworld_rain) conditions.push(t('evolution.rain'))
  if (detail.turn_upside_down) conditions.push(t('evolution.upsideDown'))
  if (detail.region) conditions.push(t('evolution.region', { region: prettyName(detail.region.name) }))
  if (detail.required_pokemon_form) conditions.push(t('evolution.requiredForm', { form: prettyName(detail.required_pokemon_form.name) }))
  if (detail.evolved_pokemon_form) conditions.push(t('evolution.evolvedForm', { form: prettyName(detail.evolved_pokemon_form.name) }))
  if (detail.used_move) conditions.push(presentNumber(detail.min_move_count)
    ? t('evolution.useMoveTimes', { move: prettyName(detail.used_move.name), count: number(detail.min_move_count) })
    : t('evolution.useMove', { move: prettyName(detail.used_move.name) }))
  if (presentNumber(detail.min_steps)) conditions.push(t('evolution.steps', { count: number(detail.min_steps) }))
  if (presentNumber(detail.min_damage_taken)) conditions.push(t('evolution.damageTaken', { amount: number(detail.min_damage_taken) }))
  if (detail.allowed_natures?.length) conditions.push(t('evolution.natures', { natures: detail.allowed_natures.map(({ name }) => prettyName(name)).join(', ') }))
  if (detail.condition_expression?.percentage_chance) conditions.push(t('evolution.specialChance', { chance: number(detail.condition_expression.percentage_chance) }))
  if (!conditions.length && trigger && trigger !== 'level-up') conditions.push(prettyName(trigger))
  if (!conditions.length && trigger === 'level-up') conditions.push(t('evolution.levelUp'))

  return conditions.length ? conditions.join(' · ') : t('evolution.special')
}

export function evolutionConditions(details: EvolutionDetail[], t: Translate, language: Language = 'pt-BR') {
  if (!details.length) return [t('evolution.basic')]
  return [...new Set(details.map((detail) => evolutionCondition(detail, t, language)))]
}

type Props = {
  node: EvolutionNode
  t: Translate
  language: Language
  root?: boolean
}

export function EvolutionTreeNode({ node, t, language, root = false }: Props) {
  const id = Number(node.species.url.split('/').filter(Boolean).at(-1))
  const hasBranches = node.evolves_to.length > 1

  return (
    <li className="evolution-node">
      <div className="evolution-entry">
        {!root && <span className="evolution-condition"><ChevronRight aria-hidden="true" /><span className="evolution-condition-options">{evolutionConditions(node.evolution_details, t, language).map((condition) => <small key={condition}>{condition}</small>)}</span></span>}
        <Link to={`/pokemon/${node.species.name}`} className="evolution-pokemon">
          <img src={pokemonArtwork(id)} alt={prettyName(node.species.name)} width="100" height="100" loading="lazy" decoding="async" />
          <b>{prettyName(node.species.name)}</b>
          <small>#{String(id).padStart(4, '0')}</small>
        </Link>
      </div>
      {node.evolves_to.length > 0 && (
        <ul className={`evolution-children${hasBranches ? ' is-branching' : ''}`}>
          {node.evolves_to.map((child) => <EvolutionTreeNode key={child.species.name} node={child} t={t} language={language} />)}
        </ul>
      )}
    </li>
  )
}
