import type { Encounter, NamedResource } from '../types'
import { ApiError, idFromUrl, resolveApiUrl } from './api'

const MAX_AREAS = 2_048
const MAX_VERSIONS_PER_AREA = 256
const MAX_DETAILS_PER_VERSION = 512
const MAX_CONDITIONS_PER_DETAIL = 64
const MAX_TOTAL_CHANCE = MAX_DETAILS_PER_VERSION * 100
const VERSION_RELEASE_ORDER = [
  'green-japan', 'red-japan', 'blue-japan', 'red', 'blue', 'yellow',
  'gold', 'silver', 'crystal', 'ruby', 'sapphire', 'colosseum', 'emerald', 'firered', 'leafgreen', 'xd',
  'diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver', 'black', 'white', 'black-2', 'white-2',
  'x', 'y', 'omega-ruby', 'alpha-sapphire', 'sun', 'moon', 'ultra-sun', 'ultra-moon',
  'lets-go-pikachu', 'lets-go-eevee', 'sword', 'shield', 'the-isle-of-armor-sword', 'the-isle-of-armor-shield',
  'the-crown-tundra-sword', 'the-crown-tundra-shield', 'brilliant-diamond', 'shining-pearl', 'legends-arceus',
  'scarlet', 'violet', 'the-teal-mask-scarlet', 'the-teal-mask-violet', 'the-indigo-disk-scarlet', 'the-indigo-disk-violet',
  'legends-za', 'mega-dimension', 'champions',
] as const
const versionReleaseIndex = new Map<string, number>(VERSION_RELEASE_ORDER.map((name, index) => [name, index]))

type UnknownRecord = Record<string, unknown>

function invalidResponse(): never {
  throw new ApiError('A PokéAPI retornou encontros inválidos.', undefined, 'invalid-response')
}

function record(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidResponse()
  return value as UnknownRecord
}

function boundedArray(value: unknown, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) invalidResponse()
  return value
}

function integer(value: unknown, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) invalidResponse()
  return Number(value)
}

function namedResource(value: unknown): NamedResource {
  const candidate = record(value)
  if (typeof candidate.name !== 'string' || candidate.name.length < 1 || candidate.name.length > 160 || typeof candidate.url !== 'string') invalidResponse()
  resolveApiUrl(candidate.url)
  return { name: candidate.name, url: candidate.url }
}

export function parsePokemonEncounters(value: unknown): Encounter[] {
  return boundedArray(value, MAX_AREAS).map((areaValue) => {
    const area = record(areaValue)
    return {
      location_area: namedResource(area.location_area),
      version_details: boundedArray(area.version_details, MAX_VERSIONS_PER_AREA).map((versionValue) => {
        const version = record(versionValue)
        return {
          version: namedResource(version.version),
          // PokéAPI aggregates the potential of multiple slots and conditions in
          // max_chance, so this documented "total percentage" can exceed 100.
          max_chance: integer(version.max_chance, 0, MAX_TOTAL_CHANCE),
          encounter_details: boundedArray(version.encounter_details, MAX_DETAILS_PER_VERSION).map((detailValue) => {
            const detail = record(detailValue)
            const minLevel = integer(detail.min_level, 0, 1_000)
            const maxLevel = integer(detail.max_level, minLevel, 1_000)
            return {
              min_level: minLevel,
              max_level: maxLevel,
              chance: integer(detail.chance, 0, 100),
              method: namedResource(detail.method),
              condition_values: boundedArray(detail.condition_values, MAX_CONDITIONS_PER_DETAIL).map(namedResource),
            }
          }),
        }
      }),
    }
  })
}

export function encounterVersions(encounters: Encounter[]) {
  const versions = new Map<string, NamedResource>()
  encounters.forEach((area) => area.version_details.forEach(({ version }) => versions.set(version.name, version)))
  return [...versions.values()].sort((left, right) => {
    const leftRelease = versionReleaseIndex.get(left.name)
    const rightRelease = versionReleaseIndex.get(right.name)
    if (leftRelease !== undefined || rightRelease !== undefined) return (leftRelease ?? Number.MAX_SAFE_INTEGER) - (rightRelease ?? Number.MAX_SAFE_INTEGER)
    const leftId = idFromUrl(left.url)
    const rightId = idFromUrl(right.url)
    if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId
    return left.name.localeCompare(right.name)
  })
}

export function encountersForVersion(encounters: Encounter[], versionName: string) {
  return encounters.flatMap((area) => {
    const detail = area.version_details.find(({ version }) => version.name === versionName)
    return detail ? [{ location_area: area.location_area, ...detail }] : []
  })
}
