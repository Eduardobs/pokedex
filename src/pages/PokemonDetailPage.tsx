import { ArrowLeft, ChevronRight, Heart, MapPin, Ruler, Sparkles, Weight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { MoveCard } from '../components/MoveCard'
import { AbilityBadge, GenderRatio } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useApi } from '../hooks/useApi'
import { localizedText, pokemonArtwork, prettyName } from '../lib/api'
import type { Encounter, EvolutionChain, EvolutionNode, Pokemon, Species } from '../types'

const statNames: Record<string, string> = { hp: 'HP', attack: 'Ataque', defense: 'Defesa', 'special-attack': 'Atq. especial', 'special-defense': 'Def. especial', speed: 'Velocidade' }

function evolutionCondition(details: Array<Record<string, unknown>>) {
  const detail = details[0]
  if (!detail) return 'Forma básica'
  if (detail.min_level) return `Nível ${detail.min_level}`
  if ((detail.item as { name?: string })?.name) return prettyName((detail.item as { name: string }).name)
  if ((detail.trigger as { name?: string })?.name === 'trade') return 'Troca'
  if (detail.min_happiness) return `Amizade ${detail.min_happiness}+`
  if ((detail.held_item as { name?: string })?.name) return `Segurando ${prettyName((detail.held_item as { name: string }).name)}`
  return prettyName((detail.trigger as { name?: string })?.name ?? 'Condição especial')
}

function flattenEvolution(node: EvolutionNode, result: { name: string; id: number; condition: string }[] = []) {
  result.push({ name: node.species.name, id: Number(node.species.url.split('/').filter(Boolean).at(-1)), condition: evolutionCondition(node.evolution_details) })
  node.evolves_to.forEach((child) => flattenEvolution(child, result))
  return result
}

export function PokemonDetailPage() {
  const { name = '' } = useParams()
  const [tab, setTab] = useState<'about' | 'moves' | 'encounters'>('about')
  const [shiny, setShiny] = useState(false)
  const { data: pokemon, loading, error } = useApi<Pokemon>(`pokemon/${name}`)
  const { data: species } = useApi<Species>(pokemon?.species.url ?? null)
  const { data: evolution } = useApi<EvolutionChain>(species?.evolution_chain?.url ?? null)
  const { data: encounters } = useApi<Encounter[]>(pokemon?.location_area_encounters ?? null)
  const { isFavorite, toggle } = useFavoritesContext()
  const evolutions = useMemo(() => evolution ? flattenEvolution(evolution.chain) : [], [evolution])
  if (loading) return <Loading label="Consultando a Pokédex..." />
  if (error || !pokemon) return <ErrorState title="Pokémon não encontrado" message={`Não encontramos “${name}” na Pokédex.`} />

  const artwork = shiny
    ? pokemon.sprites.other?.['official-artwork']?.front_shiny
    : pokemon.sprites.other?.['official-artwork']?.front_default
  const description = species ? localizedText(species.flavor_text_entries) : ''
  const genus = species?.genera.find((entry) => entry.language.name === 'en')?.genus
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
            <p className="description">{description || 'Carregando informações da espécie...'}</p>
            <div className="physical-stats"><span><Ruler /> <b>{pokemon.height / 10} m</b><small>Altura</small></span><span><Weight /> <b>{pokemon.weight / 10} kg</b><small>Peso</small></span><span><Sparkles /> <b>{pokemon.base_experience ?? '—'}</b><small>Exp. base</small></span></div>
          </div>
          <div className="detail-art"><span className="giant-number">{String(pokemon.id).padStart(3, '0')}</span><span className="detail-orb" /><img src={artwork ?? pokemonArtwork(pokemon.id)} alt={prettyName(pokemon.name)} /><button className={`shiny-toggle ${shiny ? 'active' : ''}`} onClick={() => setShiny((value) => !value)}><Sparkles size={16} /> {shiny ? 'Versão shiny' : 'Ver shiny'}</button></div>
          <button className={`detail-favorite ${isFavorite(pokemon.name) ? 'selected' : ''}`} onClick={() => toggle(pokemon.name)} aria-label="Favoritar"><Heart fill={isFavorite(pokemon.name) ? 'currentColor' : 'none'} /></button>
        </div>
      </div>

      <div className="detail-body content-width">
        <nav className="tabs"><button className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>Visão geral</button><button className={tab === 'moves' ? 'active' : ''} onClick={() => setTab('moves')}>Golpes <span>{pokemon.moves.length}</span></button><button className={tab === 'encounters' ? 'active' : ''} onClick={() => setTab('encounters')}>Encontros <span>{encounters?.length ?? 0}</span></button></nav>
        {tab === 'about' && <div className="about-grid">
          <article className="info-card stats-card"><header><h2>Atributos base</h2><span>Total <b>{pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</b></span></header>{pokemon.stats.map(({ base_stat, stat }) => <div className="stat-row" key={stat.name}><span>{statNames[stat.name] ?? prettyName(stat.name)}</span><b>{base_stat}</b><div><i style={{ width: `${Math.min(100, base_stat / 1.8)}%` }} /></div></div>)}</article>
          <article className="info-card"><h2>Biologia</h2><dl><div><dt>Geração</dt><dd>{prettyName(species?.generation.name ?? '—')}</dd></div><div><dt>Habitat</dt><dd>{prettyName(species?.habitat?.name ?? 'Desconhecido')}</dd></div><div><dt>Crescimento</dt><dd>{prettyName(species?.growth_rate.name ?? '—')}</dd></div><div><dt>Taxa de captura</dt><dd>{species?.capture_rate ?? '—'} / 255</dd></div><div><dt>Felicidade base</dt><dd>{species?.base_happiness ?? '—'}</dd></div><div><dt>Grupos de ovos</dt><dd>{species?.egg_groups.map((group) => prettyName(group.name)).join(', ') ?? '—'}</dd></div></dl>{species && <GenderRatio rate={species.gender_rate} />}<div className="rarity-tags">{species?.is_baby && <span>Bebê</span>}{species?.is_legendary && <span>Lendário</span>}{species?.is_mythical && <span>Mítico</span>}</div></article>
          <article className="info-card abilities-card"><h2>Habilidades</h2>{pokemon.abilities.map(({ ability, is_hidden }) => <Link key={ability.name} to={`/explorar/ability/${ability.name}`}><div><b>{prettyName(ability.name)}</b><AbilityBadge hidden={is_hidden} /></div><ChevronRight /></Link>)}</article>
          <article className="info-card evolution-card"><h2>Linha evolutiva</h2>{evolutions.length ? <div className="evolution-line">{evolutions.map((item, index) => <div className="evolution-step" key={`${item.name}-${index}`}>{index > 0 && <span className="evolution-arrow"><ChevronRight /><small>{item.condition}</small></span>}<Link to={`/pokemon/${item.name}`}><img src={pokemonArtwork(item.id)} alt={item.name} /><b>{prettyName(item.name)}</b><small>#{String(item.id).padStart(4, '0')}</small></Link></div>)}</div> : <p className="muted">Nenhuma evolução conhecida.</p>}</article>
        </div>}
        {tab === 'moves' && <article className="info-card wide-card"><div className="table-heading"><div><h2>Golpes compatíveis</h2><p>Tipo, classe de dano, poder, precisão e método mais recente de aprendizado.</p></div><div className="damage-legend"><span><i className="physical" />Físico</span><span><i className="special" />Especial</span><span><i className="status" />Status</span></div></div><div className="moves-grid">{pokemon.moves.map(({ move, version_group_details }) => { const detail = version_group_details.at(-1); return <MoveCard key={move.name} move={move} method={detail?.move_learn_method.name ?? 'unknown'} level={detail?.level_learned_at ?? 0} /> })}</div></article>}
        {tab === 'encounters' && <article className="info-card wide-card"><h2>Áreas de encontro</h2>{encounters?.length ? <div className="encounter-list">{encounters.map((entry) => <Link to={`/explorar/location-area/${entry.location_area.name}`} key={entry.location_area.name}><MapPin /><b>{prettyName(entry.location_area.name)}</b><span>Até {Math.max(...entry.version_details.map((detail) => detail.max_chance))}% de chance</span><ChevronRight /></Link>)}</div> : <div className="empty"><MapPin /><h3>Nenhum encontro selvagem registrado</h3></div>}</article>}
      </div>
    </section>
  )
}
