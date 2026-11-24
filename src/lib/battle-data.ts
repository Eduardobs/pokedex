import { apiFetch } from './api'
import { createBattlePokemon, type BattlePokemon, type BattleResource } from './battle'
import { preloadMetronomeMovePool } from './battle-metronome'
import { parseBattleMove } from './battle-move-parser'
import { safePokemonMediaUrl } from './media-url'
import { array, record, reference } from './resource-data'
import { parseTeamPokemon, type Team } from './teams'

export { parseBattleMove } from './battle-move-parser'

const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value)

function parseBattleResource(value: unknown, includeSprite = false): BattleResource {
  const data = record(value)
  if (!identifier(data.name)) throw new Error('Invalid battle resource.')
  const names = array(data.names, 50).flatMap((entry) => {
    const name = record(entry)
    const text = name.name
    const language = reference(name.language)?.name
    return typeof text === 'string' && text.length <= 200 && identifier(language)
      ? [{ name: text, language: { name: language } }]
      : []
  })
  const descriptions = [...array(data.effect_entries, 50), ...array(data.flavor_text_entries, 100)].flatMap((entry) => {
    const description = record(entry)
    const text = description.short_effect ?? description.effect ?? description.flavor_text
    const language = reference(description.language)?.name
    const normalized = typeof text === 'string' ? text.replace(/[\n\f]/g, ' ').trim() : ''
    return normalized && normalized.length <= 5_000 && identifier(language)
      ? [{ effect: normalized, language: { name: language } }]
      : []
  })
  const sprite = includeSprite ? record(data.sprites).default : null
  if (sprite !== null && sprite !== undefined && !safePokemonMediaUrl(sprite))
    throw new Error('Invalid battle resource sprite.')
  return { name: data.name, names, descriptions, sprite: typeof sprite === 'string' ? sprite : null }
}

export const parseBattleAbility = (value: unknown) => parseBattleResource(value)
export const parseBattleItem = (value: unknown) => parseBattleResource(value, true)

export async function loadBattleRoster(team: Team, signal?: AbortSignal): Promise<BattlePokemon[]> {
  const needsMetronome = team.members.some((member) => member.moves.includes('metronome'))
  const [roster] = await Promise.all([
    Promise.all(
      team.members.map(async (member) => {
        const [pokemon, ...moves] = await Promise.all([
          apiFetch<unknown>(`pokemon/${encodeURIComponent(member.pokemon)}`, signal).then(parseTeamPokemon),
          ...member.moves.map((move) =>
            apiFetch<unknown>(`move/${encodeURIComponent(move)}`, signal).then(parseBattleMove),
          ),
        ])
        const abilityName = pokemon.abilities.includes(member.ability) ? member.ability : pokemon.abilities[0]
        const fallback = (name: string): BattleResource => ({ name, names: [], descriptions: [], sprite: null })
        const [ability, item] = await Promise.all([
          apiFetch<unknown>(`ability/${encodeURIComponent(abilityName)}`, signal)
            .then(parseBattleAbility)
            .catch(() => fallback(abilityName)),
          member.item
            ? apiFetch<unknown>(`item/${encodeURIComponent(member.item)}`, signal)
                .then(parseBattleItem)
                .catch(() => fallback(member.item))
            : Promise.resolve(null),
        ])
        return createBattlePokemon(member, pokemon, moves, { ability, item })
      }),
    ),
    needsMetronome ? preloadMetronomeMovePool() : Promise.resolve(),
  ])
  return roster
}
