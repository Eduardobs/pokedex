import { ArrowLeft, ChevronRight, Database, ExternalLink, Gamepad2, Heart, History, Image, MapPin, PackageOpen, Ruler, Search, ShieldAlert, Sparkles, Volume2, Weight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { BaseStatsRadar } from '../components/BaseStatsRadar'
import { Loading } from '../components/Loading'
import { MoveCard, moveLearningMethodLabel } from '../components/MoveCard'
import { PokemonForms } from '../components/PokemonForms'
import { ResourceValue } from '../components/ResourceValue'
import { AbilityBadge, GenderRatio } from '../components/SemanticBadges'
import { TypeBadge, typeLabel } from '../components/TypeBadge'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { Translate, useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { API_BASE, formatDecimal, formatNumber, localizedApiTerm, localizedTextResult, normalizeSearchText, pokemonArtwork, prettyName } from '../lib/api'
import { groupMovesByLearningMethod } from '../lib/move-learning'
import { BATTLE_TYPES, type BattleType } from '../lib/type-chart'
import { calculateImmunities, calculateResistances, calculateWeaknesses } from '../lib/type-effectiveness'
import type { Encounter, EvolutionChain, EvolutionNode, Pokemon, PokemonType, Species } from '../types'

function evolutionCondition(detail: Record<string, unknown>, t: Translate) {
  const conditions: string[] = []
  const resourceName = (key: string) => (detail[key] as { name?: string } | null)?.name
  const trigger = resourceName('trigger')
  if (trigger === 'trade') conditions.push(t('evolution.trade'))
  if (detail.min_level) conditions.push(t('evolution.level', { level: String(detail.min_level) }))
  if (resourceName('item')) conditions.push(prettyName(resourceName('item')!))
  if (detail.min_happiness) conditions.push(t('evolution.friendship', { value: String(detail.min_happiness) }))
  if (resourceName('held_item')) conditions.push(t('evolution.holding', { item: prettyName(resourceName('held_item')!) }))
  if (resourceName('known_move')) conditions.push(t('evolution.knownMove', { move: prettyName(resourceName('known_move')!) }))
  if (resourceName('known_move_type')) conditions.push(t('evolution.knownType', { type: prettyName(resourceName('known_move_type')!) }))
  if (resourceName('location')) conditions.push(t('evolution.location', { location: prettyName(resourceName('location')!) }))
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

function EvolutionTreeNode({ node, t, root = false }: { node: EvolutionNode; t: Translate; root?: boolean }) {
  const id = Number(node.species.url.split('/').filter(Boolean).at(-1))
  return (
    <li>
      {!root && <span className="evolution-condition"><ChevronRight /><small>{evolutionConditions(node.evolution_details, t)}</small></span>}
      <Link to={`/pokemon/${node.species.name}`} className="evolution-pokemon">
        <img src={pokemonArtwork(id)} alt={prettyName(node.species.name)} width="100" height="100" loading="lazy" decoding="async" />
        <b>{prettyName(node.species.name)}</b><small>#{String(id).padStart(4, '0')}</small>
      </Link>
      {node.evolves_to.length > 0 && <ul>{node.evolves_to.map((child) => <EvolutionTreeNode key={child.species.name} node={child} t={t} />)}</ul>}
    </li>
  )
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
  const [moveQuery, setMoveQuery] = useState('')
  const [moveMethod, setMoveMethod] = useState('all')
  const [moveType, setMoveType] = useState<BattleType | 'all'>('all')
  const { data: pokemon, loading, error, retry } = useApi<Pokemon>(`pokemon/${encodeURIComponent(name)}`)
  const { data: species, loading: speciesLoading, error: speciesError } = useApi<Species>(pokemon?.species.url ?? null)
  const { data: evolution, loading: evolutionLoading, error: evolutionError } = useApi<EvolutionChain>(species?.evolution_chain?.url ?? null)
  const { data: encounters, loading: encountersLoading, error: encountersError, retry: retryEncounters } = useApi<Encounter[]>(tab === 'encounters' ? pokemon?.location_area_encounters ?? null : null)
  const previousId = pokemon && pokemon.id > 1 ? pokemon.id - 1 : null
  const nextId = pokemon ? pokemon.id + 1 : null
  const { data: previousPokemon } = useApi<Pokemon>(previousId ? `pokemon/${previousId}` : null)
  const { data: nextPokemon } = useApi<Pokemon>(nextId ? `pokemon/${nextId}` : null)
  const { data: primaryType, error: primaryTypeError } = useApi<PokemonType>(pokemon?.types[0] ? `type/${encodeURIComponent(pokemon.types[0].type.name)}` : null)
  const { data: secondaryType, error: secondaryTypeError } = useApi<PokemonType>(pokemon?.types[1] ? `type/${encodeURIComponent(pokemon.types[1].type.name)}` : null)
  const { data: selectedMoveType, loading: moveTypeLoading, error: moveTypeError, retry: retryMoveType } = useApi<PokemonType & { moves: Array<{ name: string }> }>(tab === 'moves' && moveType !== 'all' ? `type/${moveType}` : null)
  const { isFavorite, toggle } = useFavoritesContext()
  useEffect(() => {
    setTab('about')
    setShiny(false)
    setMoveQuery('')
    setMoveMethod('all')
    setMoveType('all')
  }, [name])
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
  if (error || !pokemon) return <ErrorState title={t('detail.notFound')} message={t('detail.notFoundDesc', { name })} retry={retry} />
  if (name !== pokemon.name) return <Navigate to={`/pokemon/${encodeURIComponent(pokemon.name)}`} replace />

  const artwork = shiny
    ? pokemon.sprites.other?.['official-artwork']?.front_shiny
    : pokemon.sprites.other?.['official-artwork']?.front_default
  const descriptionResult = species ? localizedTextResult(species.flavor_text_entries, undefined, apiLanguage) : { text: '', language: apiLanguage, fallback: false }
  const description = descriptionResult.text
  const localizedGenus = species?.genera.find((entry) => entry.language.name === apiLanguage)
  const fallbackGenus = species?.genera.find((entry) => entry.language.name === 'en')
  const genus = localizedGenus?.genus ?? fallbackGenus?.genus
  const statNames: Record<string, string> = { hp: 'HP', attack: t('stats.attack'), defense: t('stats.defense'), 'special-attack': t('stats.specialAttack'), 'special-defense': t('stats.specialDefense'), speed: t('stats.speed') }
  const moveGroups = groupMovesByLearningMethod(pokemon.moves)
  const moveMethods = moveGroups.map((group) => group.method)
  const moveNamesForType = moveType === 'all' ? null : new Set(selectedMoveType?.moves.map((move) => move.name) ?? [])
  const filteredMoveGroups = moveGroups
    .filter((group) => moveMethod === 'all' || group.method === moveMethod)
    .map((group) => ({ ...group, moves: group.moves.filter(({ move }) => normalizeSearchText(move.name).includes(normalizeSearchText(moveQuery)) && (!moveNamesForType || moveNamesForType.has(move.name))) }))
    .filter((group) => group.moves.length)
  const tabOrder = ['about', 'moves', 'encounters', 'data'] as const
  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, current: typeof tabOrder[number]) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = tabOrder.indexOf(current)
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabOrder.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabOrder.length) % tabOrder.length
    setTab(tabOrder[nextIndex])
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons?.[nextIndex]?.focus()
  }
  return (
    <section className={`pokemon-detail type-theme-${pokemon.types[0]?.type.name ?? 'normal'}`}>
      <div className="detail-hero content-width">
        <div className="detail-nav">
          <Link to="/pokemon" className="back-link"><ArrowLeft /> Pokédex</Link>
          <div>{previousPokemon && <Link to={`/pokemon/${previousPokemon.name}`} aria-label={`${prettyName(previousPokemon.name)} #${previousPokemon.id}`}><ArrowLeft /> #{String(previousPokemon.id).padStart(4, '0')}</Link>}{nextPokemon && <Link to={`/pokemon/${nextPokemon.name}`} aria-label={`${prettyName(nextPokemon.name)} #${nextPokemon.id}`}>#{String(nextPokemon.id).padStart(4, '0')} <ChevronRight /></Link>}</div>
        </div>
        <div className="detail-showcase">
          <div className="detail-copy">
            <span className="pokemon-number">#{String(pokemon.id).padStart(4, '0')}</span>
            <h1>{prettyName(pokemon.name)}</h1>
            <p className="genus">{genus ?? 'Pokémon'}</p>
            <div className="type-row">{pokemon.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />)}</div>
            <p className="description">{description || (speciesError ? t('detail.speciesUnavailable') : t('detail.loadingSpecies'))}</p>
            {descriptionResult.fallback && language !== 'en' && <small className="language-fallback">{t('detail.fallbackLanguage')}</small>}
            <div className="physical-stats"><span><Ruler /> <b>{formatDecimal(pokemon.height / 10, language)} m</b><small>{t('detail.height')}</small></span><span><Weight /> <b>{formatDecimal(pokemon.weight / 10, language)} kg</b><small>{t('detail.weight')}</small></span><span><Sparkles /> <b>{pokemon.base_experience ?? '—'}</b><small>{t('detail.baseExp')}</small></span></div>
          </div>
          <div className="detail-art"><span className="giant-number">{String(pokemon.id).padStart(3, '0')}</span><span className="detail-orb" /><img src={artwork ?? pokemonArtwork(pokemon.id)} alt={`${prettyName(pokemon.name)}${shiny ? ` — ${t('detail.shiny')}` : ''}`} width="420" height="420" decoding="async" fetchPriority="high" /><button type="button" aria-pressed={shiny} className={`shiny-toggle ${shiny ? 'active' : ''}`} onClick={() => setShiny((value) => !value)}><Sparkles size={16} /> {shiny ? t('detail.shinyVersion') : t('detail.showShiny')}</button></div>
          <button type="button" className={`detail-favorite ${isFavorite(pokemon.name) ? 'selected' : ''}`} onClick={() => toggle(pokemon.name)} aria-label={t(isFavorite(pokemon.name) ? 'favorite.remove' : 'favorite.add', { name: prettyName(pokemon.name) })}><Heart fill={isFavorite(pokemon.name) ? 'currentColor' : 'none'} /></button>
        </div>
      </div>

      <div className="detail-body content-width">
        <nav className="tabs" role="tablist" aria-label={prettyName(pokemon.name)}>{([
          ['about', t('detail.overview'), null],
          ['moves', t('detail.moves'), pokemon.moves.length],
          ['encounters', t('detail.encounters'), encounters?.length],
          ['data', t('detail.data'), null],
        ] as const).map(([value, label, count]) => <button type="button" role="tab" id={`tab-${value}`} aria-selected={tab === value} aria-controls={`panel-${value}`} tabIndex={tab === value ? 0 : -1} className={tab === value ? 'active' : ''} onKeyDown={(event) => handleTabKey(event, value)} onClick={() => setTab(value)} key={value}>{label} {count !== null && count !== undefined && <span>{count}</span>}</button>)}</nav>
        {tab === 'about' && <div className="about-grid" role="tabpanel" id="panel-about" aria-labelledby="tab-about">
          <article className="info-card stats-card"><header><h2>{t('detail.baseStats')}</h2><span>{t('detail.total')} <b>{pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</b></span></header><div className="stats-visualization"><BaseStatsRadar stats={pokemon.stats} statNames={statNames} label={t('detail.baseStats')} /><div className="stats-list">{pokemon.stats.map(({ base_stat, stat }) => <div className="stat-row" key={stat.name}><span>{statNames[stat.name] ?? prettyName(stat.name)}</span><b>{base_stat}</b><div><i style={{ width: `${Math.min(100, base_stat / 1.8)}%` }} /></div></div>)}</div></div></article>
          <article className="info-card"><h2>{t('detail.biology')}</h2>{speciesLoading ? <p className="muted">{t('detail.loadingSpecies')}</p> : speciesError || !species ? <p className="muted">{t('detail.speciesUnavailable')}</p> : <><dl><div><dt>{t('detail.generation')}</dt><dd>{localizedApiTerm(species.generation.name, language)}</dd></div><div><dt>{t('detail.habitat')}</dt><dd>{species.habitat?.name ? localizedApiTerm(species.habitat.name, language) : t('detail.unknown')}</dd></div><div><dt>{t('detail.growth')}</dt><dd>{localizedApiTerm(species.growth_rate.name, language)}</dd></div><div><dt>{t('detail.captureRate')}</dt><dd>{species.capture_rate} / 255</dd></div><div><dt>{t('detail.baseHappiness')}</dt><dd>{species.base_happiness}</dd></div><div><dt>{t('detail.eggGroups')}</dt><dd>{species.egg_groups.map((group) => localizedApiTerm(group.name, language)).join(', ')}</dd></div></dl><GenderRatio rate={species.gender_rate} /><div className="rarity-tags">{species.is_baby && <span>{t('detail.baby')}</span>}{species.is_legendary && <span>{t('detail.legendary')}</span>}{species.is_mythical && <span>{t('detail.mythical')}</span>}</div></>}</article>
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
          <article className="info-card evolution-card"><h2>{t('detail.evolution')}</h2>{evolutionLoading ? <p className="muted">{t('common.loading')}</p> : evolutionError ? <p className="muted">{t('detail.evolutionUnavailable')}</p> : evolution ? <ul className="evolution-tree"><EvolutionTreeNode node={evolution.chain} t={t} root /></ul> : <p className="muted">{t('detail.noEvolution')}</p>}</article>
          {species && <PokemonForms species={species} currentPokemon={pokemon} />}
        </div>}
        {tab === 'moves' && <article className="info-card wide-card" role="tabpanel" id="panel-moves" aria-labelledby="tab-moves">
          <div className="table-heading"><div><h2>{t('detail.compatibleMoves')}</h2><p>{t('detail.movesDesc')}</p></div><div className="damage-legend"><span><i className="physical" />{t('damage.physical')}</span><span><i className="special" />{t('damage.special')}</span><span><i className="status" />{t('damage.status')}</span></div></div>
          <div className="move-toolbar">
            <div className="search-field"><Search size={18} /><input aria-label={t('detail.movesSearch')} value={moveQuery} onChange={(event) => setMoveQuery(event.target.value)} placeholder={t('detail.movesSearch')} />{moveQuery && <button className="search-clear" type="button" onClick={() => setMoveQuery('')} aria-label={t('common.clear')}>×</button>}</div>
            <label className="sort-field"><span>{t('move.learning')}</span><select aria-label={t('move.learning')} value={moveMethod} onChange={(event) => setMoveMethod(event.target.value)}><option value="all">{t('detail.allMethods')}</option>{moveMethods.map((method) => <option value={method} key={method}>{moveLearningMethodLabel(method, t)}</option>)}</select></label>
            <label className="sort-field"><span>{t('detail.moveType')}</span><select aria-label={t('detail.moveType')} value={moveType} onChange={(event) => setMoveType(event.target.value as BattleType | 'all')}><option value="all">{t('detail.allTypes')}</option>{BATTLE_TYPES.map((type) => <option value={type} key={type}>{typeLabel(type, language)}</option>)}</select></label>
          </div>
          {moveTypeLoading && <p className="sort-status" role="status">{t('common.loading')}</p>}
          {moveTypeError && <div className="inline-error"><p>{t('error.message')}</p><button className="button secondary" type="button" onClick={retryMoveType}>{t('common.retry')}</button></div>}
          <div className="move-groups">{!moveTypeLoading && !moveTypeError && filteredMoveGroups.map((group) => <section className="move-group" key={group.method}><header><h3>{moveLearningMethodLabel(group.method, t)}</h3><span>{group.moves.length === 1 ? t('move.countOne') : t('move.count', { count: group.moves.length })}</span></header><div className="moves-grid">{group.moves.map(({ move, method, level }) => <MoveCard key={move.name} move={move} method={method} level={level} />)}</div></section>)}</div>
          {!moveTypeLoading && !moveTypeError && !filteredMoveGroups.length && <div className="empty compact-empty"><Search /><h3>{t('pokedex.empty')}</h3></div>}
        </article>}
        {tab === 'encounters' && <article className="info-card wide-card" role="tabpanel" id="panel-encounters" aria-labelledby="tab-encounters"><h2>{t('detail.encounterAreas')}</h2>{encountersLoading ? <Loading /> : encountersError ? <div className="inline-error"><p>{t('error.message')}</p><button className="button secondary" type="button" onClick={retryEncounters}>{t('common.retry')}</button></div> : encounters?.length ? <div className="encounter-list">{encounters.map((entry) => <Link to={`/explorar/location-area/${entry.location_area.name}`} key={entry.location_area.name}><MapPin /><b>{prettyName(entry.location_area.name)}</b><span>{t('detail.chance', { chance: Math.max(...entry.version_details.map((detail) => detail.max_chance)) })}</span><ChevronRight /></Link>)}</div> : <div className="empty"><MapPin /><h3>{t('detail.noEncounters')}</h3></div>}</article>}
        {tab === 'data' && <div role="tabpanel" id="panel-data" aria-labelledby="tab-data"><PokemonDataTab pokemon={pokemon} /></div>}
      </div>
    </section>
  )
}
