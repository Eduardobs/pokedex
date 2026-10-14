import { array, invalidData, record } from './resource-data'

const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value)

export function parseItemDirectory(value: unknown): string[] {
  const results = array(record(value).results, 3_000)
  if (!results.length) return []
  const names = results.map((entry) => record(entry).name)
  if (names.some((name) => !identifier(name))) return invalidData()
  return [...new Set(names as string[])]
}

function optionalHttpsUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || value.length > 2_000) return invalidData()
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com' ? url.toString() : invalidData()
  } catch {
    return invalidData()
  }
}

export function parseTeamItem(value: unknown) {
  const data = record(value)
  if (!identifier(data.name)) return invalidData()
  const sprites = record(data.sprites)
  return {
    name: data.name,
    names: array(data.names, 20),
    effectEntries: array(data.effect_entries, 20),
    flavorTextEntries: array(data.flavor_text_entries, 100),
    sprite: optionalHttpsUrl(sprites.default),
  }
}
