import { ArrowLeft, ChevronRight, Heart, MapPin, Ruler, Search, ShieldAlert, Sparkles, Weight } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { BaseStatsRadar } from '../components/BaseStatsRadar'
import { Loading } from '../components/Loading'
import { MoveCard, moveLearningMethodLabel } from '../components/MoveCard'
import { PokemonForms } from '../components/PokemonForms'
import { EvolutionTreeNode } from '../components/pokemon-detail/EvolutionTree'
import { PokemonDataTab } from '../components/pokemon-detail/PokemonDataTab'
import { SearchField } from '../components/SearchField'
import { AbilityBadge, GenderRatio } from '../components/SemanticBadges'
import { TypeBadge, typeLabel } from '../components/TypeBadge'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { formatDecimal, formatNumber, idFromUrl, localizedApiTerm, localizedTextResult, normalizeSearchText, pokemonArtwork, prettyName } from '../lib/api'
import { groupMovesByLearningMethod } from '../lib/move-learning'
import { level100StatRange } from '../lib/pokemon-stats'
import { BATTLE_TYPES, type BattleType } from '../lib/type-chart'
import { calculateImmunities, calculateResistances, calculateWeaknesses } from '../lib/type-effectiveness'
import type { ApiList, Encounter, EvolutionChain, Pokemon, PokemonType, Species } from '../types'

export function PokemonDetailPage() {
  const { apiLanguage, language, t } = useLanguage()
  const { name = '' } = useParams()
  const [tab, setTab] = useState<'about' | 'moves' | 'encounters' | 'data'>('about')
  const [shiny, setShiny] = useState(false)
  const [moveQuery, setMoveQuery] = useState('')
  const [moveMethod, setMoveMethod] = useState('all')
  const [moveType, setMoveType] = useState<BattleType | 'all'>('all')
  const [secondaryDataReady, setSecondaryDataReady] = useState(false)
  const { data: pokemon, loading, error, retry } = useApi<Pokemon>(`pokemon/${encodeURIComponent(name)}`)
  const { data: species, loading: speciesLoading, error: speciesError } = useApi<Species>(pokemon?.species.url ?? null)
  const { data: evolution, loading: evolutionLoading, error: evolutionError } = useApi<EvolutionChain>(secondaryDataReady ? species?.evolution_chain?.url ?? null : null)
  const { data: encounters, loading: encountersLoading, error: encountersError, retry: retryEncounters } = useApi<Encounter[]>(tab === 'encounters' ? pokemon?.location_area_encounters ?? null : null)
  const previousId = pokemon && pokemon.id > 1 ? pokemon.id - 1 : null
  const nextId = pokemon ? pokemon.id + 1 : null
  const neighborOffset = Math.max(0, (pokemon?.id ?? 1) - 2)
  const { data: neighbors } = useApi<ApiList>(secondaryDataReady && pokemon ? `pokemon?limit=3&offset=${neighborOffset}` : null)
  const previousResource = previousId ? neighbors?.results.find((entry) => idFromUrl(entry.url) === previousId) : null
  const nextResource = nextId ? neighbors?.results.find((entry) => idFromUrl(entry.url) === nextId) : null
  const previousPokemon = previousResource && previousId ? { ...previousResource, id: previousId } : null
  const nextPokemon = nextResource && nextId ? { ...nextResource, id: nextId } : null
  const { data: primaryType, error: primaryTypeError } = useApi<PokemonType>(secondaryDataReady && pokemon?.types[0] ? `type/${encodeURIComponent(pokemon.types[0].type.name)}` : null)
  const { data: secondaryType, error: secondaryTypeError } = useApi<PokemonType>(secondaryDataReady && pokemon?.types[1] ? `type/${encodeURIComponent(pokemon.types[1].type.name)}` : null)
  const { data: selectedMoveType, loading: moveTypeLoading, error: moveTypeError, retry: retryMoveType } = useApi<PokemonType & { moves: Array<{ name: string }> }>(tab === 'moves' && moveType !== 'all' ? `type/${moveType}` : null)
  const { isFavorite, toggle } = useFavoritesContext()
  const deferredMoveQuery = useDeferredValue(moveQuery)
  const moveGroups = useMemo(() => groupMovesByLearningMethod(pokemon?.moves ?? []), [pokemon?.moves])
  const moveMethods = useMemo(() => moveGroups.map((group) => group.method), [moveGroups])
  const moveNamesForType = useMemo(
    () => moveType === 'all' ? null : new Set(selectedMoveType?.moves.map((move) => move.name) ?? []),
    [moveType, selectedMoveType],
  )
  const normalizedMoveQuery = useMemo(() => normalizeSearchText(deferredMoveQuery), [deferredMoveQuery])
  const filteredMoveGroups = useMemo(() => moveGroups
    .filter((group) => moveMethod === 'all' || group.method === moveMethod)
    .map((group) => ({
      ...group,
      moves: group.moves.filter(({ move }) => normalizeSearchText(move.name).includes(normalizedMoveQuery) && (!moveNamesForType || moveNamesForType.has(move.name))),
    }))
    .filter((group) => group.moves.length), [moveGroups, moveMethod, moveNamesForType, normalizedMoveQuery])

  useEffect(() => {
    setSecondaryDataReady(false)
    setTab('about')
    setShiny(false)
    setMoveQuery('')
    setMoveMethod('all')
    setMoveType('all')
  }, [name])

  useEffect(() => {
    setSecondaryDataReady(false)
    if (!pokemon) return

    const enableSecondaryData = () => setSecondaryDataReady(true)
    const scheduleIdle = window.requestIdleCallback?.bind(window)
    if (typeof scheduleIdle === 'function') {
      const idleId = scheduleIdle(enableSecondaryData, { timeout: 1_200 })
      return () => window.cancelIdleCallback(idleId)
    }
    const timeoutId = window.setTimeout(enableSecondaryData, 200)
    return () => window.clearTimeout(timeoutId)
  }, [pokemon])

  const currentTypeRelations = useMemo(() => {
    const loadedTypes = [primaryType, secondaryType]
    return (pokemon?.types ?? [])
      .map(({ type }) => loadedTypes.find((loadedType) => loadedType?.name === type.name)?.damage_relations)
      .filter((relations): relations is PokemonType['damage_relations'] => Boolean(relations))
  }, [pokemon, primaryType, secondaryType])
  const typeRelationsReady = Boolean(pokemon && currentTypeRelations.length === pokemon.types.length)
  const typeRelationsError = primaryTypeError || (pokemon?.types[1] ? secondaryTypeError : null)
  const weaknesses = useMemo(() => calculateWeaknesses(currentTypeRelations), [currentTypeRelations])
  const resistances = useMemo(() => calculateResistances(currentTypeRelations), [currentTypeRelations])
  const immunities = useMemo(() => calculateImmunities(currentTypeRelations), [currentTypeRelations])
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
          <div>
            {previousPokemon && <Link className="detail-nav-pokemon previous" to={`/pokemon/${previousPokemon.name}`} aria-label={`${prettyName(previousPokemon.name)} #${previousPokemon.id}`}><ArrowLeft /><span><strong>{prettyName(previousPokemon.name)}</strong><small>#{String(previousPokemon.id).padStart(4, '0')}</small></span></Link>}
            {nextPokemon && <Link className="detail-nav-pokemon next" to={`/pokemon/${nextPokemon.name}`} aria-label={`${prettyName(nextPokemon.name)} #${nextPokemon.id}`}><span><strong>{prettyName(nextPokemon.name)}</strong><small>#{String(nextPokemon.id).padStart(4, '0')}</small></span><ChevronRight /></Link>}
          </div>
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
          <article className="info-card stats-card">
            <header><h2>{t('detail.baseStats')}</h2><span>{t('detail.total')} <b>{pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</b></span></header>
            <div className="stats-visualization">
              <BaseStatsRadar stats={pokemon.stats} statNames={statNames} label={t('detail.baseStats')} baseLabel={t('detail.base')} />
              <div className="stats-list">
                <div className="stat-list-heading" aria-hidden="true"><span /><b>{t('detail.base')}</b><span /><b>{t('detail.level100')}</b></div>
                {pokemon.stats.map(({ base_stat, stat }) => {
                  const range = level100StatRange(base_stat, stat.name, pokemon.name)
                  const rangeLabel = range.minimum === range.maximum ? String(range.minimum) : `${range.minimum}–${range.maximum}`
                  return <div className="stat-row" key={stat.name}><span>{statNames[stat.name] ?? prettyName(stat.name)}</span><b>{base_stat}</b><div><i style={{ width: `${Math.min(100, base_stat / 1.8)}%` }} /></div><strong aria-label={t('detail.level100Range', { minimum: range.minimum, maximum: range.maximum })}>{rangeLabel}</strong></div>
                })}
                <p className="level-100-note">{t('detail.level100Note')}</p>
              </div>
            </div>
          </article>
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
          <article className="info-card evolution-card"><h2>{t('detail.evolution')}</h2>{!secondaryDataReady || evolutionLoading ? <p className="muted">{t('common.loading')}</p> : evolutionError ? <p className="muted">{t('detail.evolutionUnavailable')}</p> : evolution ? <ul className="evolution-tree"><EvolutionTreeNode node={evolution.chain} t={t} root /></ul> : <p className="muted">{t('detail.noEvolution')}</p>}</article>
          {species && <PokemonForms species={species} currentPokemon={pokemon} />}
        </div>}
        {tab === 'moves' && <article className="info-card wide-card" role="tabpanel" id="panel-moves" aria-labelledby="tab-moves">
          <div className="table-heading"><div><h2>{t('detail.compatibleMoves')}</h2><p>{t('detail.movesDesc')}</p></div><div className="damage-legend"><span><i className="physical" />{t('damage.physical')}</span><span><i className="special" />{t('damage.special')}</span><span><i className="status" />{t('damage.status')}</span></div></div>
          <div className="move-toolbar">
            <SearchField value={moveQuery} onChange={setMoveQuery} clearLabel={t('common.clear')} iconSize={18} aria-label={t('detail.movesSearch')} placeholder={t('detail.movesSearch')} />
            <label className="sort-field"><span>{t('move.learning')}</span><select aria-label={t('move.learning')} value={moveMethod} onChange={(event) => setMoveMethod(event.target.value)}><option value="all">{t('detail.allMethods')}</option>{moveMethods.map((method) => <option value={method} key={method}>{moveLearningMethodLabel(method, t)}</option>)}</select></label>
            <label className="sort-field"><span>{t('detail.moveType')}</span><select aria-label={t('detail.moveType')} value={moveType} onChange={(event) => setMoveType(event.target.value as BattleType | 'all')}><option value="all">{t('detail.allTypes')}</option>{BATTLE_TYPES.map((type) => <option value={type} key={type}>{typeLabel(type, language)}</option>)}</select></label>
          </div>
          {moveTypeLoading && <p className="sort-status" role="status">{t('common.loading')}</p>}
          {moveTypeError && <div className="inline-error"><p>{t('error.message')}</p><button className="button secondary" type="button" onClick={retryMoveType}>{t('common.retry')}</button></div>}
          <div className="move-groups">{!moveTypeLoading && !moveTypeError && filteredMoveGroups.map((group) => <section className="move-group" key={group.method}><header><h3>{moveLearningMethodLabel(group.method, t)}</h3><span>{group.moves.length === 1 ? t('move.countOne') : t('move.count', { count: group.moves.length })}</span></header><div className="moves-grid">{group.moves.map(({ move, method, level }) => <MoveCard key={move.name} move={move} method={method} level={level} />)}</div></section>)}</div>
          {!moveTypeLoading && !moveTypeError && !filteredMoveGroups.length && <div className="empty compact-empty"><Search /><h3>{t('pokedex.empty')}</h3></div>}
        </article>}
        {tab === 'encounters' && <article className="info-card wide-card" role="tabpanel" id="panel-encounters" aria-labelledby="tab-encounters"><h2>{t('detail.encounterAreas')}</h2>{encountersLoading ? <Loading /> : encountersError ? <div className="inline-error"><p>{t('error.message')}</p><button className="button secondary" type="button" onClick={retryEncounters}>{t('common.retry')}</button></div> : encounters?.length ? <div className="encounter-list">{encounters.map((entry) => <Link to={`/explorar/location-area/${entry.location_area.name}`} key={entry.location_area.name}><MapPin /><b>{prettyName(entry.location_area.name)}</b><span>{t('detail.chance', { chance: Math.max(...entry.version_details.map((detail) => detail.max_chance)) })}</span><ChevronRight /></Link>)}</div> : <div className="empty"><MapPin /><h3>{t('detail.noEncounters')}</h3></div>}</article>}
        {tab === 'data' && <div role="tabpanel" id="panel-data" aria-labelledby="tab-data"><PokemonDataTab pokemon={pokemon} species={species} speciesLoading={speciesLoading} /></div>}
      </div>
    </section>
  )
}
