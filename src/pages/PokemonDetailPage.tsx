import { ArrowLeft, ChevronRight, Database, ExternalLink, Gamepad2, Heart, History, Image, MapPin, PackageOpen, Ruler, ShieldAlert, Sparkles, Volume2, Weight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { BaseStatsRadar } from '../components/BaseStatsRadar'
import { Loading } from '../components/Loading'
import { MoveCard, moveLearningMethodLabel } from '../components/MoveCard'
import { PokemonForms } from '../components/PokemonForms'
import { ResourceValue } from '../components/ResourceValue'
import { AbilityBadge, GenderRatio } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { Translate, useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { API_BASE, formatNumber, localizedText, pokemonArtwork, prettyName } from '../lib/api'
import { groupMovesByLearningMethod } from '../lib/move-learning'
import { calculateImmunities, calculateResistances, calculateWeaknesses } from '../lib/type-effectiveness'
import type { Encounter, EvolutionChain, EvolutionNode, Pokemon, PokemonType, Species } from '../types'

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

function PokemonDataTab({ pokemon }: { pokemon: Pokemon }) {
  const { t } = useLanguage()
  const sprites = [
    { label: `${t('detail.front')} · ${t('detail.normal')}`, url: pokemon.sprites.front_default },
    { label: `${t('detail.front')} · ${t('detail.shiny')}`, url: pokemon.sprites.front_shiny },
    { label: `${t('detail.back')} · ${t('detail.normal')}`, url: pokemon.sprites.back_default },
    { label: `${t('detail.back')} · ${t('detail.shiny')}`, url: pokemon.sprites.back_shiny },
  ].filter((sprite): sprite is { label: string; url: string } => Boolean(sprite.url))
  const cries = [
    { label: t('detail.latestCry'), url: pokemon.cries?.latest },
    { label: t('detail.legacyCry'), url: pokemon.cries?.legacy },
  ].filter((cry): cry is { label: string; url: string } => Boolean(cry.url))

  return (
    <div className="technical-data-grid" style={{ '--resource-color': 'var(--theme)' } as React.CSSProperties}>
      <article className="info-card technical-card registry-card">
        <h2><Database />{t('detail.registry')}</h2>
        <dl>
          <div><dt>ID</dt><dd>#{String(pokemon.id).padStart(4, '0')}</dd></div>
          <div><dt>{t('detail.apiOrder')}</dt><dd>{pokemon.order}</dd></div>
          <div><dt>{t('detail.defaultForm')}</dt><dd>{t(pokemon.is_default ? 'common.yes' : 'common.no')}</dd></div>
          <div><dt>{t('detail.species')}</dt><dd><ResourceValue value={pokemon.species} /></dd></div>
          <div><dt>{t('detail.forms')}</dt><dd>{pokemon.forms.length}</dd></div>
        </dl>
      </article>

      <article className="info-card technical-card">
        <h2><Volume2 />{t('detail.cries')}</h2>
        {cries.length ? <div className="cry-list">{cries.map((cry) => <label key={cry.label}><span>{cry.label}</span><audio controls preload="none" src={cry.url} /></label>)}</div> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card sprites-card">
        <h2><Image />{t('detail.sprites')}</h2>
        <div className="sprite-grid">{sprites.map((sprite) => <figure key={sprite.label}><img src={sprite.url} alt={sprite.label} width="96" height="96" loading="lazy" /><figcaption>{sprite.label}</figcaption></figure>)}</div>
      </article>

      <article className="info-card technical-card">
        <h2><PackageOpen />{t('detail.heldItems')}</h2>
        {pokemon.held_items?.length ? <ResourceValue value={pokemon.held_items} /> : <p className="muted">{t('detail.noHeldItems')}</p>}
      </article>

      <article className="info-card technical-card">
        <h2><Gamepad2 />{t('detail.gameIndices')}</h2>
        {pokemon.game_indices.length ? <ResourceValue value={pokemon.game_indices} /> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card">
        <h2><History />{t('detail.pastAbilities')}</h2>
        {pokemon.past_abilities?.length ? <ResourceValue value={pokemon.past_abilities} /> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card">
        <h2><History />{t('detail.pastTypes')}</h2>
        {pokemon.past_types?.length ? <ResourceValue value={pokemon.past_types} /> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card api-source-card">
        <h2><ExternalLink />{t('detail.apiSource')}</h2>
        <p>{t('detail.apiDataDesc')}</p>
        <a className="button secondary" href={`${API_BASE}/pokemon/${encodeURIComponent(pokemon.name)}`} target="_blank" rel="noopener noreferrer">JSON <ExternalLink size={15} /></a>
      </article>
    </div>
  )
}

export function PokemonDetailPage() {
  const { apiLanguage, language, t } = useLanguage()
  const { name = '' } = useParams()
  const [tab, setTab] = useState<'about' | 'moves' | 'encounters' | 'data'>('about')
  const [shiny, setShiny] = useState(false)
  const { data: pokemon, loading, error } = useApi<Pokemon>(`pokemon/${encodeURIComponent(name)}`)
  const { data: species } = useApi<Species>(pokemon?.species.url ?? null)
  const { data: evolution } = useApi<EvolutionChain>(species?.evolution_chain?.url ?? null)
  const { data: encounters } = useApi<Encounter[]>(tab === 'encounters' ? pokemon?.location_area_encounters ?? null : null)
  const previousId = pokemon && pokemon.id > 1 ? pokemon.id - 1 : null
  const nextId = pokemon ? pokemon.id + 1 : null
  const { data: previousPokemon } = useApi<Pokemon>(previousId ? `pokemon/${previousId}` : null)
  const { data: nextPokemon } = useApi<Pokemon>(nextId ? `pokemon/${nextId}` : null)
  const { data: primaryType, error: primaryTypeError } = useApi<PokemonType>(pokemon?.types[0] ? `type/${encodeURIComponent(pokemon.types[0].type.name)}` : null)
  const { data: secondaryType, error: secondaryTypeError } = useApi<PokemonType>(pokemon?.types[1] ? `type/${encodeURIComponent(pokemon.types[1].type.name)}` : null)
  const { isFavorite, toggle } = useFavoritesContext()
  const evolutions = useMemo(() => evolution ? flattenEvolution(evolution.chain, t) : [], [evolution, t])
  const loadedTypes = [primaryType, secondaryType]
  const currentTypeRelations = (pokemon?.types ?? [])
    .map(({ type }) => loadedTypes.find((loadedType) => loadedType?.name === type.name)?.damage_relations)
    .filter((relations): relations is PokemonType['damage_relations'] => Boolean(relations))
  const typeRelationsReady = Boolean(pokemon && currentTypeRelations.length === pokemon.types.length)
  const typeRelationsError = primaryTypeError || (pokemon?.types[1] ? secondaryTypeError : null)
  const weaknesses = calculateWeaknesses(currentTypeRelations)
  const resistances = calculateResistances(currentTypeRelations)
  const immunities = calculateImmunities(currentTypeRelations)
  if (loading) return <Loading label={t('detail.loading')} />
  if (error || !pokemon) return <ErrorState title={t('detail.notFound')} message={t('detail.notFoundDesc', { name })} />
  if (name !== pokemon.name) return <Navigate to={`/pokemon/${encodeURIComponent(pokemon.name)}`} replace />

  const artwork = shiny
    ? pokemon.sprites.other?.['official-artwork']?.front_shiny
    : pokemon.sprites.other?.['official-artwork']?.front_default
  const description = species ? localizedText(species.flavor_text_entries, undefined, apiLanguage) : ''
  const genus = species?.genera.find((entry) => entry.language.name === apiLanguage)?.genus ?? species?.genera.find((entry) => entry.language.name === 'en')?.genus
  const statNames: Record<string, string> = { hp: 'HP', attack: t('stats.attack'), defense: t('stats.defense'), 'special-attack': t('stats.specialAttack'), 'special-defense': t('stats.specialDefense'), speed: t('stats.speed') }
  const moveGroups = groupMovesByLearningMethod(pokemon.moves)
  return (
    <section className={`pokemon-detail type-theme-${pokemon.types[0]?.type.name ?? 'normal'}`}>
      <div className="detail-hero content-width">
        <div className="detail-nav">
          <Link to="/pokemon" className="back-link"><ArrowLeft /> Pokédex</Link>
          <div>{previousPokemon && <Link to={`/pokemon/${previousPokemon.name}`}>#{String(previousPokemon.id).padStart(4, '0')} <ArrowLeft /></Link>}{nextPokemon && <Link to={`/pokemon/${nextPokemon.name}`}><ChevronRight /> #{String(nextPokemon.id).padStart(4, '0')}</Link>}</div>
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
        <nav className="tabs"><button className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>{t('detail.overview')}</button><button className={tab === 'moves' ? 'active' : ''} onClick={() => setTab('moves')}>{t('detail.moves')} <span>{pokemon.moves.length}</span></button><button className={tab === 'encounters' ? 'active' : ''} onClick={() => setTab('encounters')}>{t('detail.encounters')} <span>{encounters?.length ?? 0}</span></button><button className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>{t('detail.data')}</button></nav>
        {tab === 'about' && <div className="about-grid">
          <article className="info-card stats-card"><header><h2>{t('detail.baseStats')}</h2><span>{t('detail.total')} <b>{pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</b></span></header><div className="stats-visualization"><BaseStatsRadar stats={pokemon.stats} statNames={statNames} label={t('detail.baseStats')} /><div className="stats-list">{pokemon.stats.map(({ base_stat, stat }) => <div className="stat-row" key={stat.name}><span>{statNames[stat.name] ?? prettyName(stat.name)}</span><b>{base_stat}</b><div><i style={{ width: `${Math.min(100, base_stat / 1.8)}%` }} /></div></div>)}</div></div></article>
          <article className="info-card"><h2>{t('detail.biology')}</h2><dl><div><dt>{t('detail.generation')}</dt><dd>{prettyName(species?.generation.name ?? '—')}</dd></div><div><dt>{t('detail.habitat')}</dt><dd>{species?.habitat?.name ? prettyName(species.habitat.name) : t('detail.unknown')}</dd></div><div><dt>{t('detail.growth')}</dt><dd>{prettyName(species?.growth_rate.name ?? '—')}</dd></div><div><dt>{t('detail.captureRate')}</dt><dd>{species?.capture_rate ?? '—'} / 255</dd></div><div><dt>{t('detail.baseHappiness')}</dt><dd>{species?.base_happiness ?? '—'}</dd></div><div><dt>{t('detail.eggGroups')}</dt><dd>{species?.egg_groups.map((group) => prettyName(group.name)).join(', ') ?? '—'}</dd></div></dl>{species && <GenderRatio rate={species.gender_rate} />}<div className="rarity-tags">{species?.is_baby && <span>{t('detail.baby')}</span>}{species?.is_legendary && <span>{t('detail.legendary')}</span>}{species?.is_mythical && <span>{t('detail.mythical')}</span>}</div></article>
          <article className="info-card abilities-card"><h2>{t('detail.abilities')}</h2>{pokemon.abilities.map(({ ability, is_hidden }) => <Link key={ability.name} to={`/explorar/ability/${ability.name}`}><div><b>{prettyName(ability.name)}</b><AbilityBadge hidden={is_hidden} /></div><ChevronRight /></Link>)}</article>
          <article className="info-card weaknesses-card">
            <h2><ShieldAlert />{t('detail.typeEffectiveness')}</h2>
            {!typeRelationsReady && !typeRelationsError && <p className="muted">{t('common.loading')}</p>}
            {typeRelationsError && <p className="muted">{t('detail.weaknessesUnavailable')}</p>}
            {typeRelationsReady && !typeRelationsError && <>
              <p>{t('detail.weaknessesDesc')}</p>
              <div className="effectiveness-groups">
                <section>
                  <h3>{t('detail.weaknesses')}</h3>
                  {weaknesses.length ? <div className="effectiveness-list">{weaknesses.map(({ type, multiplier }) => <span className="effectiveness-item" key={type}><TypeBadge type={type} /><b>{formatNumber(multiplier, language)}×</b></span>)}</div> : <p className="muted">{t('detail.noWeaknesses')}</p>}
                </section>
                <section>
                  <h3>{t('detail.resistances')}</h3>
                  {resistances.length ? <div className="effectiveness-list">{resistances.map(({ type, multiplier }) => <span className="effectiveness-item resistance" key={type}><TypeBadge type={type} /><b>{formatNumber(multiplier, language)}×</b></span>)}</div> : <p className="muted">{t('detail.noResistances')}</p>}
                </section>
                <section>
                  <h3>{t('detail.immunities')}</h3>
                  {immunities.length ? <div className="effectiveness-list">{immunities.map(({ type, multiplier }) => <span className="effectiveness-item immunity" key={type}><TypeBadge type={type} /><b>{formatNumber(multiplier, language)}×</b></span>)}</div> : <p className="muted">{t('detail.noImmunities')}</p>}
                </section>
              </div>
            </>}
          </article>
          <article className="info-card evolution-card"><h2>{t('detail.evolution')}</h2>{evolutions.length ? <div className="evolution-line">{evolutions.map((item, index) => <div className="evolution-step" key={`${item.name}-${index}`}>{index > 0 && <span className="evolution-arrow"><ChevronRight /><small>{item.condition}</small></span>}<Link to={`/pokemon/${item.name}`}><img src={pokemonArtwork(item.id)} alt={item.name} width="100" height="100" loading="lazy" decoding="async" /><b>{prettyName(item.name)}</b><small>#{String(item.id).padStart(4, '0')}</small></Link></div>)}</div> : <p className="muted">{t('detail.noEvolution')}</p>}</article>
          {species && <PokemonForms species={species} currentPokemon={pokemon} />}
        </div>}
        {tab === 'moves' && <article className="info-card wide-card"><div className="table-heading"><div><h2>{t('detail.compatibleMoves')}</h2><p>{t('detail.movesDesc')}</p></div><div className="damage-legend"><span><i className="physical" />{t('damage.physical')}</span><span><i className="special" />{t('damage.special')}</span><span><i className="status" />{t('damage.status')}</span></div></div><div className="move-groups">{moveGroups.map((group) => <section className="move-group" key={group.method}><header><h3>{moveLearningMethodLabel(group.method, t)}</h3><span>{t('move.count', { count: group.moves.length })}</span></header><div className="moves-grid">{group.moves.map(({ move, method, level }) => <MoveCard key={move.name} move={move} method={method} level={level} />)}</div></section>)}</div></article>}
        {tab === 'encounters' && <article className="info-card wide-card"><h2>{t('detail.encounterAreas')}</h2>{encounters?.length ? <div className="encounter-list">{encounters.map((entry) => <Link to={`/explorar/location-area/${entry.location_area.name}`} key={entry.location_area.name}><MapPin /><b>{prettyName(entry.location_area.name)}</b><span>{t('detail.chance', { chance: Math.max(...entry.version_details.map((detail) => detail.max_chance)) })}</span><ChevronRight /></Link>)}</div> : <div className="empty"><MapPin /><h3>{t('detail.noEncounters')}</h3></div>}</article>}
        {tab === 'data' && <PokemonDataTab pokemon={pokemon} />}
      </div>
    </section>
  )
}
