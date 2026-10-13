import { ApiError, normalizeSearchText } from './api'
import type { ApiList, NamedResource } from '../types'

export const RESOURCE_SEARCH_LIMIT = 10_000

/** A bounded directory contains names and references, never per-entry detail requests. */
export function parseResourceDirectory(value: unknown): ApiList<NamedResource> {
  if (
    !value ||
    typeof value !== 'object' ||
    !('results' in value) ||
    !('count' in value) ||
    !Array.isArray(value.results) ||
    !Number.isSafeInteger(value.count) ||
    Number(value.count) < 0 ||
    Number(value.count) > RESOURCE_SEARCH_LIMIT ||
    value.results.length !== value.count
  ) {
    throw new ApiError('Incomplete resource directory.', undefined, 'invalid-response')
  }
  const seen = new Set<string>()
  const results = value.results.map((entry: unknown) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !('url' in entry) ||
      typeof entry.url !== 'string' ||
      !/^https:\/\/pokeapi\.co\/api\/v2\/[a-z-]+\/\d+\/$/.test(entry.url)
    ) {
      throw new ApiError('Invalid resource reference.', undefined, 'invalid-response')
    }
    const name = 'name' in entry ? entry.name : entry.url.split('/').filter(Boolean).at(-1)
    if (typeof name !== 'string' || !/^[a-z0-9-]{1,100}$/.test(name)) {
      throw new ApiError('Invalid resource name.', undefined, 'invalid-response')
    }
    if (seen.has(entry.url)) throw new ApiError('Duplicate resource reference.', undefined, 'invalid-response')
    seen.add(entry.url)
    return { name, url: entry.url }
  })
  return { count: Number(value.count), results, next: null, previous: null }
}

export function matchesResource(name: string, url: string, query: string) {
  const normalized = normalizeSearchText(query).replace(/[-_]/g, ' ').trim()
  const id = url.split('/').filter(Boolean).at(-1)
  return (
    normalizeSearchText(name).replace(/[-_]/g, ' ').includes(normalized) ||
    (/^#?\d+$/.test(normalized) && Number(normalized.replace('#', '')) === Number(id))
  )
}
