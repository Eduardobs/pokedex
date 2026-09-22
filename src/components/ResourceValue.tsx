import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, formatNumber, pokemonArtwork, prettyName, resolveApiUrl } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import type { Language } from '../contexts/LanguageContext'
import { getResourceLabel } from '../data/resources'
import { parseRelatedPokemonList } from '../lib/related-pokemon'
import type { RelatedPokemonDatum, RelatedPokemon } from '../lib/related-pokemon'

const excluded = new Set(['sprites', 'game_indices', 'version_group_details', 'past_values', 'past_types'])
const PAGE_SIZE = 6

const fieldTranslations: Record<Language, Record<string, string>> = {
  'pt-BR': {
    is_main_series: 'Série principal', generation: 'Geração', effect_changes: 'Alterações de efeito', pokemon: 'Pokémon',
    slot: 'Posição', is_hidden: 'Habilidade oculta', version_group: 'Grupo de versões', language: 'Idioma', move: 'Golpe',
    method: 'Método', level_learned_at: 'Nível de aprendizado', power: 'Poder', accuracy: 'Precisão', pp: 'PP', priority: 'Prioridade',
    damage_class: 'Classe de dano', type: 'Tipo', target: 'Alvo', effect_chance: 'Chance do efeito', cost: 'Preço', category: 'Categoria',
    attributes: 'Atributos', held_by_pokemon: 'Pokémon que carregam', machines: 'Máquinas', game_indices: 'Índices nos jogos',
    contest_type: 'Tipo de concurso', contest_effect: 'Efeito em concurso', super_contest_effect: 'Efeito em superconcurso',
    size: 'Tamanho', growth_time: 'Tempo de crescimento', max_harvest: 'Colheita máxima', natural_gift_power: 'Poder do Dom Natural', natural_gift_type: 'Tipo do Dom Natural',
    fling_power: 'Poder de lançamento', fling_effect: 'Efeito de lançamento', move_damage_class: 'Classe de dano dos golpes', main_generation: 'Geração principal',
    locations: 'Locais', pokedexes: 'Pokédex', effect_entries: 'Efeitos', flavor_text_entries: 'Descrições',
    pokemon_species: 'Espécies de Pokémon', pokemon_species_details: 'Espécies de Pokémon', learned_by_pokemon: 'Pokémon que aprendem',
    pokemon_entries: 'Entradas da Pokédex', pokemon_encounters: 'Pokémon encontrados', entry_number: 'Número na Pokédex', rate: 'Taxa', base_score: 'Pontuação base',
  },
  en: {
    is_main_series: 'Main series', generation: 'Generation', effect_changes: 'Effect changes', pokemon: 'Pokémon', slot: 'Slot', is_hidden: 'Hidden ability',
    version_group: 'Version group', language: 'Language', move: 'Move', method: 'Method', level_learned_at: 'Learning level', power: 'Power', accuracy: 'Accuracy',
    pp: 'PP', priority: 'Priority', damage_class: 'Damage class', type: 'Type', target: 'Target', effect_chance: 'Effect chance', cost: 'Cost', category: 'Category',
    attributes: 'Attributes', held_by_pokemon: 'Held by Pokémon', machines: 'Machines', game_indices: 'Game indices', contest_type: 'Contest type',
    contest_effect: 'Contest effect', super_contest_effect: 'Super contest effect', size: 'Size', growth_time: 'Growth time', max_harvest: 'Maximum harvest',
    natural_gift_power: 'Natural Gift power', natural_gift_type: 'Natural Gift type', fling_power: 'Fling power', fling_effect: 'Fling effect',
    move_damage_class: 'Move damage class', main_generation: 'Main generation', locations: 'Locations', pokedexes: 'Pokédexes', effect_entries: 'Effects', flavor_text_entries: 'Descriptions',
    pokemon_species: 'Pokémon species', pokemon_species_details: 'Pokémon species', learned_by_pokemon: 'Pokémon that learn it',
    pokemon_entries: 'Pokédex entries', pokemon_encounters: 'Pokémon encounters', entry_number: 'Pokédex number', rate: 'Rate', base_score: 'Base score',
  },
  es: {
    is_main_series: 'Serie principal', generation: 'Generación', effect_changes: 'Cambios de efecto', pokemon: 'Pokémon',
    slot: 'Posición', is_hidden: 'Habilidad oculta', version_group: 'Grupo de versiones', language: 'Idioma', move: 'Movimiento',
    method: 'Método', level_learned_at: 'Nivel de aprendizaje', power: 'Potencia', accuracy: 'Precisión', pp: 'PP', priority: 'Prioridad',
    damage_class: 'Clase de daño', type: 'Tipo', target: 'Objetivo', effect_chance: 'Probabilidad del efecto', cost: 'Precio', category: 'Categoría',
    attributes: 'Atributos', held_by_pokemon: 'Pokémon que lo llevan', machines: 'Máquinas', game_indices: 'Índices en los juegos',
    contest_type: 'Tipo de concurso', contest_effect: 'Efecto de concurso', super_contest_effect: 'Efecto de superconcurso',
    size: 'Tamaño', growth_time: 'Tiempo de crecimiento', max_harvest: 'Cosecha máxima', natural_gift_power: 'Potencia de Don Natural', natural_gift_type: 'Tipo de Don Natural',
    fling_power: 'Potencia de lanzamiento', fling_effect: 'Efecto de lanzamiento', move_damage_class: 'Clase de daño de los movimientos', main_generation: 'Generación principal',
    locations: 'Lugares', pokedexes: 'Pokédex', effect_entries: 'Efectos', flavor_text_entries: 'Descripciones',
    pokemon_species: 'Especies de Pokémon', pokemon_species_details: 'Especies de Pokémon', learned_by_pokemon: 'Pokémon que lo aprenden',
    pokemon_entries: 'Entradas de la Pokédex', pokemon_encounters: 'Pokémon encontrados', entry_number: 'Número en la Pokédex', rate: 'Tasa', base_score: 'Puntuación base',
  },
}

export const resourceFieldLabel = (key: string, language: Language) => fieldTranslations[language][key] ?? prettyName(key)

function routeFromReference(url: string, resourceName: string) {
  try {
    const trustedUrl = resolveApiUrl(url)
    const [endpoint, name] = new URL(trustedUrl).pathname.slice(`${new URL(API_BASE).pathname}/`.length).split('/').filter(Boolean)
    if ((endpoint === 'pokemon' || endpoint === 'pokemon-species') && resourceName) {
      return `/pokemon/${encodeURIComponent(resourceName)}`
    }
    return endpoint && name ? `/explorar/${encodeURIComponent(endpoint)}/${encodeURIComponent(name)}` : null
  } catch {
    return null
  }
}

function referenceMeta(value: unknown, language: Language) {
  if (!value || typeof value !== 'object') return null
  const { name, url } = value as Record<string, unknown>
  if (typeof name !== 'string' || typeof url !== 'string') return null
  try {
    const trustedUrl = resolveApiUrl(url)
    const [endpoint, identifier] = new URL(trustedUrl).pathname.slice(`${new URL(API_BASE).pathname}/`.length).split('/').filter(Boolean)
    if (!endpoint || !identifier) return null
    return { endpoint: getResourceLabel(endpoint, language), identifier: /^\d+$/.test(identifier) ? `#${identifier.padStart(3, '0')}` : prettyName(identifier) }
  } catch {
    return null
  }
}

function PaginatedResourceValues({ values, depth }: { values: unknown[]; depth: number }) {
  const { language, t } = useLanguage()
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(values.length / PAGE_SIZE)
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, values.length)

  return (
    <div className="resource-value-pages">
      <div className="resource-value-list">
        {values.slice(start, end).map((item, index) => {
          const reference = referenceMeta(item, language)
          return (
            <div className="resource-value-item" key={start + index}>
              <span className="resource-value-index">{String(start + index + 1).padStart(2, '0')}</span>
              <div>
                <ResourceValue value={item} depth={depth + 1} />
                {reference && <small className="resource-value-meta">{reference.endpoint} · {reference.identifier}</small>}
              </div>
            </div>
          )
        })}
      </div>
      <nav className="resource-value-pagination" aria-label={t('resource.range', { start: start + 1, end, total: values.length })}>
        <button type="button" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} aria-label={t('resource.previous')}><ChevronLeft /></button>
        <span>{t('resource.range', { start: start + 1, end, total: values.length })}</span>
        <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} aria-label={t('resource.next')}><ChevronRight /></button>
      </nav>
    </div>
  )
}

function relatedDatumValue(detail: RelatedPokemonDatum, language: Language, yes: string, no: string) {
  if (typeof detail.value === 'boolean') return detail.value ? yes : no
  if (typeof detail.value === 'number') return formatNumber(detail.value, language)
  return prettyName(detail.value)
}

function RelatedPokemonValues({ values }: { values: RelatedPokemon[] }) {
  const { language, t } = useLanguage()
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(values.length / PAGE_SIZE)
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, values.length)
  const yes = t('common.yes')
  const no = t('common.no')

  return (
    <div className="related-pokemon-pages">
      <ul className="related-pokemon-list">
        {values.slice(start, end).map((pokemon) => {
          const displayName = prettyName(pokemon.name)
          const displayNumber = `#${String(pokemon.id).padStart(4, '0')}`
          return (
            <li key={`${pokemon.id}-${pokemon.name}`}>
              <Link className="related-pokemon-card" to={`/pokemon/${encodeURIComponent(pokemon.name)}`} aria-label={t('resource.openPokemon', { name: displayName, number: formatNumber(pokemon.id, language) })}>
                <span className="related-pokemon-art"><img src={pokemonArtwork(pokemon.id)} alt={displayName} width="58" height="58" loading="lazy" decoding="async" /></span>
                <span className="related-pokemon-copy">
                  <small>{displayNumber}</small>
                  <strong>{displayName}</strong>
                  {pokemon.details.length > 0 && <dl className="related-pokemon-details">{pokemon.details.map((detail) => <div key={detail.key}><dt>{resourceFieldLabel(detail.key, language)}</dt><dd>{relatedDatumValue(detail, language, yes, no)}</dd></div>)}</dl>}
                </span>
                <ChevronRight className="related-pokemon-chevron" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
      {pageCount > 1 && <nav className="resource-value-pagination" aria-label={t('resource.range', { start: start + 1, end, total: values.length })}>
        <button type="button" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} aria-label={t('resource.previous')}><ChevronLeft /></button>
        <span aria-live="polite">{t('resource.range', { start: start + 1, end, total: values.length })}</span>
        <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} aria-label={t('resource.next')}><ChevronRight /></button>
      </nav>}
    </div>
  )
}

export function ResourceValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const { language, t } = useLanguage()
  if (value === null || value === undefined) return <span className="muted">—</span>
  if (typeof value === 'boolean') return <span className={`boolean ${value}`}>{value ? t('common.yes') : t('common.no')}</span>
  if (typeof value === 'string' || typeof value === 'number') return <span>{typeof value === 'string' ? prettyName(value) : value}</span>
  if (Array.isArray(value)) {
    if (!value.length) return <span className="muted">{t('resource.none')}</span>
    const relatedPokemon = parseRelatedPokemonList(value)
    if (relatedPokemon) return <RelatedPokemonValues values={relatedPokemon} />
    if (depth > 1 || value.length > 20) return <PaginatedResourceValues values={value} depth={depth} />
    return <div className="value-list">{value.slice(0, 20).map((item, index) => <ResourceValue key={index} value={item} depth={depth + 1} />)}</div>
  }
  const object = value as Record<string, unknown>
  if (typeof object.name === 'string' && typeof object.url === 'string') {
    const route = routeFromReference(object.url, object.name)
    return route ? <Link className="resource-chip" to={route}>{prettyName(object.name)} <ChevronRight size={12} /></Link> : <span>{prettyName(object.name)}</span>
  }
  if (depth > 3) return <span className="muted">{t('resource.related')}</span>
  return (
    <div className="nested-value">
      {Object.entries(object).filter(([key]) => !excluded.has(key)).slice(0, 16).map(([key, child]) => (
        <div className="nested-row" key={key}><small>{resourceFieldLabel(key, language)}</small><ResourceValue value={child} depth={depth + 1} /></div>
      ))}
    </div>
  )
}
