import { ApiError, resolveApiUrl } from './api'
import type { NamedResource } from '../types'

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
export function array(value: unknown, maximum = 2000): unknown[] {
  return Array.isArray(value) ? value.slice(0, maximum) : []
}
export function reference(value: unknown): NamedResource | null {
  const item = record(value)
  if (typeof item.name !== 'string' || !/^[a-z0-9-]{1,100}$/.test(item.name) || typeof item.url !== 'string')
    return null
  try {
    return { name: item.name, url: resolveApiUrl(item.url) }
  } catch {
    return null
  }
}
export function invalidData(): never {
  throw new ApiError('Invalid resource data.', undefined, 'invalid-response')
}

export type ExperienceLevel = { level: number; experience: number }
export function parseExperience(value: unknown): ExperienceLevel[] {
  const entries = array(record(value).levels, 101)
  if (!entries.length || entries.length > 100) return invalidData()
  const levels = entries
    .map((entry) => {
      const { level, experience } = record(entry)
      if (
        typeof level !== 'number' ||
        !Number.isInteger(level) ||
        level < 1 ||
        level > 100 ||
        typeof experience !== 'number' ||
        !Number.isSafeInteger(experience) ||
        experience < 0 ||
        experience > 10_000_000
      )
        return invalidData()
      return { level, experience }
    })
    .sort((a, b) => a.level - b.level)
  if (
    levels.some(
      (entry, i) => i > 0 && (entry.level === levels[i - 1].level || entry.experience < levels[i - 1].experience),
    )
  )
    return invalidData()
  return levels
}
export function experienceBetween(levels: ExperienceLevel[], from: number, to: number) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 100 || from > to) return null
  const start = levels.find((entry) => entry.level === from)
  const end = levels.find((entry) => entry.level === to)
  return start && end ? end.experience - start.experience : null
}

export type ItemPrice = {
  currency: NamedResource
  version: NamedResource
  purchase: number | null
  sell: number | null
}
export function itemPrices(value: unknown): ItemPrice[] {
  return array(value).flatMap((entry) => {
    const price = record(entry)
    const currency = reference(price.currency)
    const version = reference(price.version_group)
    const valid = (v: unknown): v is number | null =>
      v === null || (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0)
    return currency && version && valid(price.purchase_price) && valid(price.sell_price)
      ? [{ currency, version, purchase: price.purchase_price, sell: price.sell_price }]
      : []
  })
}
