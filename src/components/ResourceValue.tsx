import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, formatNumber, localizedApiTerm, pokemonArtwork, prettyName, resolveApiUrl } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import type { Language, TranslationKey } from '../contexts/LanguageContext'
import { getResourceLabel } from '../data/resources'
import { messages } from '../i18n/messages'
import { parseRelatedPokemonList } from '../lib/related-pokemon'
import type { RelatedPokemonDatum, RelatedPokemon } from '../lib/related-pokemon'
import { DamageClassBadge } from './SemanticBadges'

const excluded = new Set(['sprites', 'game_indices', 'version_group_details', 'past_values', 'past_types'])
const PAGE_SIZE = 6

export const resourceFieldLabel = (key: string, language: Language) => {
  const translationKey = `resource.field.${key}` as TranslationKey
  return translationKey in messages['pt-BR'] ? messages[language][translationKey] : prettyName(key)
}

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
  return localizedApiTerm(detail.value, language)
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
  if (typeof value === 'string' || typeof value === 'number') return <span>{typeof value === 'string' ? localizedApiTerm(value, language) : formatNumber(value, language)}</span>
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
    if (route?.startsWith('/explorar/move-damage-class/')) return <Link className="damage-class-link" to={route}><DamageClassBadge value={object.name} /></Link>
    return route ? <Link className="resource-chip" to={route}>{localizedApiTerm(object.name, language)} <ChevronRight size={12} /></Link> : <span>{localizedApiTerm(object.name, language)}</span>
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
