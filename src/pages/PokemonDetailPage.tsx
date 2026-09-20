import { ArrowLeft, ChevronRight, Heart, MapPin, Ruler, Sparkles, Weight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { BaseStatsRadar } from '../components/BaseStatsRadar'
import { Loading } from '../components/Loading'
import { MoveCard } from '../components/MoveCard'
import { PokemonForms } from '../components/PokemonForms'
import { AbilityBadge, GenderRatio } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { Translate, useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { localizedText, pokemonArtwork, prettyName } from '../lib/api'
import type { Encounter, EvolutionChain, EvolutionNode, Pokemon, Species } from '../types'

function evolutionCondition(details: Array<Record<string, unknown>>, t: Translate) {
  const detail = details[0]
  if (!detail) return t('evolution.basic')
  if (detail.min_level) return t('evolution.level', { level: String(detail.min_level) })
  if ((detail.item as { name?: string })?.name) return prettyName((detail.item as { name: string }).name)
  if ((detail.trigger as { name?: string })?.name === 'trade') return t('evolution.trade')
  if (detail.min_happiness) return t('evolution.friendship', { value: String(detail.min_happiness) })
  if ((detail.held_item as { name?: string })?.name) return t('evolution.holding', { item: prettyName((detail.held_item as { name: string }).name) })
  return (detail.trigger as { name?: string })?.name ? prettyName((detail.trigger as { name: string }).name) : t('evolution.special')
}

function flattenEvolution(node: EvolutionNode, t: Translate, result: { name: string; id: number; condition: string }[] = []) {
  result.push({ name: node.species.name, id: Number(node.species.url.split('/').filter(Boolean).at(-1)), condition: evolutionCondition(node.evolution_details, t) })
  node.evolves_to.forEach((child) => flattenEvolution(child, t, result))
  return result
}

export function PokemonDetailPage() {
  const { apiLanguage, t } = useLanguage()
  const { name = '' } = useParams()
  const [tab, setTab] = useState<'about' | 'moves' | 'encounters'>('about')
  const [shiny, setShiny] = useState(false)
  const { data: pokemon, loading, error } = useApi<Pokemon>(`pokemon/${encodeURIComponent(name)}`)
  const { data: species } = useApi<Species>(pokemon?.species.url ?? null)
  const { data: evolution } = useApi<EvolutionChain>(species?.evolution_chain?.url ?? null)
  const { data: encounters } = useApi<Encounter[]>(tab === 'encounters' ? pokemon?.location_area_encounters ?? null : null)
  const { isFavorite, toggle } = useFavoritesContext()
  const evolutions = useMemo(() => evolution ? flattenEvolution(evolution.chain, t) : [], [evolution, t])
  if (loading) return <Loading label={t('detail.loading')} />
  if (error || !pokemon) return <ErrorState title={t('detail.notFound')} message={t('detail.notFoundDesc', { name })} />

  const artwork = shiny
    ? pokemon.sprites.other?.['official-artwork']?.front_shiny
    : pokemon.sprites.other?.['official-artwork']?.front_default
  const description = species ? localizedText(species.flavor_text_entries, undefined, apiLanguage) : ''
  const genus = species?.genera.find((entry) => entry.language.name === apiLanguage)?.genus ?? species?.genera.find((entry) => entry.language.name === 'en')?.genus
  const statNames: Record<string, string> = { hp: 'HP', attack: t('stats.attack'), defense: t('stats.defense'), 'special-attack': t('stats.specialAttack'), 'special-defense': t('stats.specialDefense'), speed: t('stats.speed') }
  const previous = pokemon.id > 1 ? pokemon.id - 1 : null
  const next = pokemon.id + 1

  return (
    <section className={`pokemon-detail type-theme-${pokemon.types[0]?.type.name ?? 'normal'}`}>
      <div className="detail-hero content-width">
        <div className="detail-nav">
          <Link to="/pokemon" className="back-link"><ArrowLeft /> Pokédex</Link>
          <div>{previous && <Link to={`/pokemon/${previous}`}>#{String(previous).padStart(4, '0')} <ArrowLeft /></Link>}<Link to={`/pokemon/${next}`}><ChevronRight /> #{String(next).padStart(4, '0')}</Link></div>
        </div>
        <div className="detail-showcase">
          <div className="detail-copy">
            <span className="pokemon-number">#{String(pokemon.id).padStart(4, '0')}</span>
            <h1>{prettyName(pokemon.name)}</h1>
            <p className="genus">{genus ?? 'Pokémon'}</p>
            <div className="type-row">{pokemon.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />)}</div>
            <p className="description">{description || t('detail.loadingSpecies')}</p>
            <div className="physical-stats"><span><Ruler /> <b>{pokemon.height / 10} m</b><small>{t('detail.height')}</small></span><span><Weight /> <b>{pokemon.weight / 10} kg</b><small>{t('detail.weight')}</small></span><span><Sparkles /> <b>{pokemon.base_experience ?? '—'}</b><small>{t('detail.baseExp')}</small></span></div>
          </div>
          <div className="detail-art"><span className="giant-number">{String(pokemon.id).padStart(3, '0')}</span><span className="detail-orb" /><img src={artwork ?? pokemonArtwork(pokemon.id)} alt={prettyName(pokemon.name)} width="420" height="420" decoding="async" fetchPriority="high" /><button className={`shiny-toggle ${shiny ? 'active' : ''}`} onClick={() => setShiny((value) => !value)}><Sparkles size={16} /> {shiny ? t('detail.shinyVersion') : t('detail.showShiny')}</button></div>
          <button className={`detail-favorite ${isFavorite(pokemon.name) ? 'selected' : ''}`} onClick={() => toggle(pokemon.name)} aria-label={t('favorite.action')}><Heart fill={isFavorite(pokemon.name) ? 'currentColor' : 'none'} /></button>
        </div>
      </div>

      <div className="detail-body content-width">
        <nav className="tabs"><button className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>{t('detail.overview')}</button><button className={tab === 'moves' ? 'active' : ''} onClick={() => setTab('moves')}>{t('detail.moves')} <span>{pokemon.moves.length}</span></button><button className={tab === 'encounters' ? 'active' : ''} onClick={() => setTab('encounters')}>{t('detail.encounters')} <span>{encounters?.length ?? 0}</span></button></nav>
        {tab === 'about' && <div className="about-grid">
          <article className="info-card stats-card"><header><h2>{t('detail.baseStats')}</h2><span>{t('detail.total')} <b>{pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</b></span></header><div className="stats-visualization"><BaseStatsRadar stats={pokemon.stats} statNames={statNames} label={t('detail.baseStats')} /><div className="stats-list">{pokemon.stats.map(({ base_stat, stat }) => <div className="stat-row" key={stat.name}><span>{statNames[stat.name] ?? prettyName(stat.name)}</span><b>{base_stat}</b><div><i style={{ width: `${Math.min(100, base_stat / 1.8)}%` }} /></div></div>)}</div></div></article>
          <article className="info-card"><h2>{t('detail.biology')}</h2><dl><div><dt>{t('detail.generation')}</dt><dd>{prettyName(species?.generation.name ?? '—')}</dd></div><div><dt>{t('detail.habitat')}</dt><dd>{species?.habitat?.name ? prettyName(species.habitat.name) : t('detail.unknown')}</dd></div><div><dt>{t('detail.growth')}</dt><dd>{prettyName(species?.growth_rate.name ?? '—')}</dd></div><div><dt>{t('detail.captureRate')}</dt><dd>{species?.capture_rate ?? '—'} / 255</dd></div><div><dt>{t('detail.baseHappiness')}</dt><dd>{species?.base_happiness ?? '—'}</dd></div><div><dt>{t('detail.eggGroups')}</dt><dd>{species?.egg_groups.map((group) => prettyName(group.name)).join(', ') ?? '—'}</dd></div></dl>{species && <GenderRatio rate={species.gender_rate} />}<div className="rarity-tags">{species?.is_baby && <span>{t('detail.baby')}</span>}{species?.is_legendary && <span>{t('detail.legendary')}</span>}{species?.is_mythical && <span>{t('detail.mythical')}</span>}</div></article>
          <article className="info-card abilities-card"><h2>{t('detail.abilities')}</h2>{pokemon.abilities.map(({ ability, is_hidden }) => <Link key={ability.name} to={`/explorar/ability/${ability.name}`}><div><b>{prettyName(ability.name)}</b><AbilityBadge hidden={is_hidden} /></div><ChevronRight /></Link>)}</article>
          <article className="info-card evolution-card"><h2>{t('detail.evolution')}</h2>{evolutions.length ? <div className="evolution-line">{evolutions.map((item, index) => <div className="evolution-step" key={`${item.name}-${index}`}>{index > 0 && <span className="evolution-arrow"><ChevronRight /><small>{item.condition}</small></span>}<Link to={`/pokemon/${item.name}`}><img src={pokemonArtwork(item.id)} alt={item.name} width="100" height="100" loading="lazy" decoding="async" /><b>{prettyName(item.name)}</b><small>#{String(item.id).padStart(4, '0')}</small></Link></div>)}</div> : <p className="muted">{t('detail.noEvolution')}</p>}</article>
          {species && <PokemonForms species={species} currentPokemon={pokemon} />}
        </div>}
        {tab === 'moves' && <article className="info-card wide-card"><div className="table-heading"><div><h2>{t('detail.compatibleMoves')}</h2><p>{t('detail.movesDesc')}</p></div><div className="damage-legend"><span><i className="physical" />{t('damage.physical')}</span><span><i className="special" />{t('damage.special')}</span><span><i className="status" />{t('damage.status')}</span></div></div><div className="moves-grid">{pokemon.moves.map(({ move, version_group_details }) => { const detail = version_group_details.at(-1); return <MoveCard key={move.name} move={move} method={detail?.move_learn_method.name ?? 'unknown'} level={detail?.level_learned_at ?? 0} /> })}</div></article>}
        {tab === 'encounters' && <article className="info-card wide-card"><h2>{t('detail.encounterAreas')}</h2>{encounters?.length ? <div className="encounter-list">{encounters.map((entry) => <Link to={`/explorar/location-area/${entry.location_area.name}`} key={entry.location_area.name}><MapPin /><b>{prettyName(entry.location_area.name)}</b><span>{t('detail.chance', { chance: Math.max(...entry.version_details.map((detail) => detail.max_chance)) })}</span><ChevronRight /></Link>)}</div> : <div className="empty"><MapPin /><h3>{t('detail.noEncounters')}</h3></div>}</article>}
      </div>
    </section>
  )
}
