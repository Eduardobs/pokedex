import { BATTLE_TYPES } from './type-chart'
import { safePokemonMediaUrl } from './media-url'
import { z } from 'zod'
import { ApiError, resolveApiUrl } from './api-client'
import type { ApiList, EvolutionChain, EvolutionNode, Pokemon, PokemonForm, PokemonType, Species } from '../types'

const name = z.string().regex(/^[a-z0-9-]{1,100}$/)
const text = z.string().max(10_000)
const integer = (max = 100_000) => z.number().int().min(0).max(max)
const apiUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      resolveApiUrl(value)
      return true
    } catch {
      return false
    }
  })
const ref = z.object({ name, url: apiUrl })
const refs = (max = 2000) => z.array(ref).max(max)
const nullableRef = ref.nullable()
const media = z.string().max(2048).nullable().transform(safePokemonMediaUrl)
const spritePair = z.object({ front_default: media, front_shiny: media })
const spriteSet = z.record(z.string().max(100), media)
const typeRef = ref.extend({ name: z.enum([...BATTLE_TYPES, 'stellar', 'unknown', 'shadow']) })
const types = z
  .array(z.object({ slot: integer(2).min(1), type: typeRef }))
  .min(1)
  .max(2)
  .refine((values) => new Set(values.map((value) => value.slot)).size === values.length)
const statEntry = z.object({ base_stat: integer(1000), effort: integer(3), stat: ref })
const stats = z.array(statEntry).length(6)
const abilities = z.array(z.object({ is_hidden: z.boolean(), slot: integer(10), ability: ref })).max(10)
const names = z.array(z.object({ name: text, language: ref })).max(100)
const pokemon = z.object({
  id: integer().min(1),
  name,
  height: integer(),
  weight: integer(10_000_000),
  base_experience: integer().nullable(),
  order: z.number().int().min(-1).max(100_000),
  is_default: z.boolean(),
  location_area_encounters: apiUrl,
  sprites: spritePair.extend({
    front_female: media.optional(),
    front_shiny_female: media.optional(),
    back_female: media.optional(),
    back_shiny_female: media.optional(),
    back_default: media.optional(),
    back_shiny: media.optional(),
    versions: z.record(z.string().max(100), z.record(z.string().max(100), z.unknown())).optional(),
    other: z
      .object({
        'official-artwork': spritePair.optional(),
        home: spritePair.optional(),
        dream_world: spriteSet.optional(),
        showdown: spriteSet.optional(),
      })
      .optional(),
  }),
  types,
  stats,
  abilities,
  moves: z
    .array(
      z.object({
        move: ref,
        version_group_details: z
          .array(
            z.object({
              level_learned_at: integer(100),
              move_learn_method: ref,
              version_group: ref,
            }),
          )
          .max(200),
      }),
    )
    .max(2000),
  species: ref,
  forms: refs(100),
  game_indices: z.array(z.object({ game_index: integer(), version: ref })).max(200),
  cries: z.object({ latest: media, legacy: media }).optional(),
  held_items: z
    .array(z.object({ item: ref, version_details: z.array(z.object({ rarity: integer(100), version: ref })).max(200) }))
    .max(100)
    .optional(),
  past_abilities: z
    .array(
      z.object({
        generation: ref,
        abilities: z.array(z.object({ ability: nullableRef, is_hidden: z.boolean(), slot: integer(10) })).max(10),
      }),
    )
    .max(20)
    .optional(),
  past_stats: z
    .array(z.object({ generation: ref, stats: z.array(statEntry).max(9) }))
    .max(20)
    .optional(),
  past_types: z
    .array(z.object({ generation: ref, types }))
    .max(20)
    .optional(),
})
const species = z.object({
  id: integer().min(1),
  name,
  flavor_text_entries: z.array(z.object({ flavor_text: text, language: ref, version: ref })).max(1000),
  genera: z.array(z.object({ genus: text, language: ref })).max(100),
  color: ref,
  shape: nullableRef,
  habitat: nullableRef,
  generation: ref,
  growth_rate: ref,
  egg_groups: refs(10),
  evolution_chain: z.object({ url: apiUrl }).nullable(),
  gender_rate: z.number().int().min(-1).max(8),
  capture_rate: integer(255),
  base_happiness: integer(255),
  hatch_counter: integer(1000),
  has_gender_differences: z.boolean(),
  forms_switchable: z.boolean(),
  is_baby: z.boolean(),
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  varieties: z.array(z.object({ is_default: z.boolean(), pokemon: ref })).max(100),
  pokedex_numbers: z
    .array(z.object({ entry_number: integer(), pokedex: ref }))
    .max(100)
    .optional(),
  form_descriptions: z
    .array(z.object({ description: text, language: ref }))
    .max(100)
    .optional(),
})
const detail = z.object({
  item: nullableRef,
  trigger: nullableRef,
  gender: integer(2).nullable(),
  held_item: nullableRef,
  known_move: nullableRef,
  known_move_type: nullableRef,
  location: nullableRef,
  min_level: integer(100).nullable(),
  min_happiness: integer(255).nullable(),
  min_beauty: integer(255).nullable(),
  min_affection: integer(255).nullable(),
  near_special_rock: z.boolean().default(false),
  needs_overworld_rain: z.boolean(),
  party_species: nullableRef,
  party_type: nullableRef,
  relative_physical_stats: z.union([z.literal(-1), z.literal(0), z.literal(1)]).nullable(),
  time_of_day: z.string().max(20),
  trade_species: nullableRef,
  turn_upside_down: z.boolean(),
  version_group: nullableRef.optional(),
  is_default: z.boolean().optional(),
  needs_multiplayer: z.boolean().optional(),
  region: nullableRef.optional(),
  required_pokemon_form: nullableRef.optional(),
  evolved_pokemon_form: nullableRef.optional(),
  used_move: nullableRef.optional(),
  min_move_count: integer().nullable().optional(),
  min_steps: integer(10_000_000).nullable().optional(),
  min_damage_taken: integer().nullable().optional(),
  allowed_natures: refs(25).nullable().optional(),
  condition_expression: z
    .object({
      expression: z.string().max(1000),
      percentage_chance: z.number().min(0).max(100).nullable(),
      variables: refs(50),
    })
    .nullable()
    .optional(),
})
const evolutionNode: z.ZodType<EvolutionNode> = z.lazy(() =>
  z.object({
    is_baby: z.boolean(),
    species: ref,
    evolution_details: z.array(detail).max(50),
    evolves_to: z.array(evolutionNode).max(20),
  }),
)
const evolution = z.object({ id: integer().min(1), baby_trigger_item: nullableRef, chain: evolutionNode })
const form = z.object({
  id: integer().min(1),
  name,
  order: integer(),
  form_order: integer(),
  is_default: z.boolean(),
  is_battle_only: z.boolean(),
  is_mega: z.boolean(),
  form_name: z.string().max(100),
  pokemon: ref,
  types,
  sprites: spritePair.extend({ back_default: media, back_shiny: media }),
  version_group: nullableRef,
  names,
  form_names: names,
  trigger_conditions: z
    .array(z.object({ trigger: text, name: text.nullable(), url: apiUrl.nullable(), base_form: nullableRef }))
    .max(100)
    .optional(),
})

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new ApiError('Invalid resource data.', undefined, 'invalid-response')
  return result.data
}
export const parsePokemon = (value: unknown): Pokemon => parse(pokemon, value)
export const parseSpecies = (value: unknown): Species => parse(species, value)
export const parsePokemonForm = (value: unknown): PokemonForm => parse(form, value)
export function parseEvolutionChain(value: unknown): EvolutionChain {
  // Check work bounds before recursive schema parsing or variety expansion.
  const stack = [{ node: (value as { chain?: unknown } | null)?.chain, depth: 0 }]
  let count = 0
  while (stack.length) {
    const { node, depth } = stack.pop()!
    if (
      ++count > 50 ||
      depth > 8 ||
      !node ||
      typeof node !== 'object' ||
      !('evolves_to' in node) ||
      !Array.isArray(node.evolves_to) ||
      node.evolves_to.length > 20
    )
      throw new ApiError('Invalid evolution tree.', undefined, 'invalid-response')
    for (const child of node.evolves_to) stack.push({ node: child, depth: depth + 1 })
  }
  return parse(evolution, value)
}
export function parseApiList(value: unknown): ApiList {
  return parse(
    z.object({ count: integer(100_000), next: apiUrl.nullable(), previous: apiUrl.nullable(), results: refs(10_000) }),
    value,
  )
}
export function parsePokemonType(
  value: unknown,
): PokemonType & { pokemon: { pokemon: z.infer<typeof ref> }[]; moves: z.infer<typeof ref>[] } {
  return parse(
    z.object({
      id: integer().min(1),
      name,
      damage_relations: z.object({
        double_damage_from: refs(30),
        half_damage_from: refs(30),
        no_damage_from: refs(30),
      }),
      pokemon: z
        .array(z.object({ pokemon: ref }))
        .max(2000)
        .default([]),
      moves: refs(2000).default([]),
    }),
    value,
  )
}

export function parseTypePokemon(value: unknown) {
  return parse(z.object({ pokemon: z.array(z.object({ pokemon: ref })).max(2000) }), value)
}
export function parseMoveCard(value: unknown) {
  return parse(
    z.object({
      name,
      names: names.optional(),
      type: ref,
      damage_class: ref,
      power: integer(10000).nullable(),
      accuracy: integer(100).nullable(),
      pp: integer(1000).nullable(),
      priority: z.number().int().min(-10).max(10),
    }),
    value,
  )
}
export function parseResourceList(value: unknown): ApiList {
  const schema = z.object({
    count: integer(100_000),
    next: apiUrl.nullable(),
    previous: apiUrl.nullable(),
    results: z.array(z.object({ name: name.optional(), url: apiUrl })).max(10_000),
  })
  const data = parse(schema, value)
  return {
    ...data,
    results: data.results.map((item) => ({
      ...item,
      name: item.name ?? new URL(item.url).pathname.split('/').filter(Boolean).at(-1)!,
    })),
  }
}
