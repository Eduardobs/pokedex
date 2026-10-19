/// <reference types="node" />
import { afterAll, describe, expect, it } from 'vitest'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import apiAbilities from '../data/third-party/pokeapi-battle-abilities.json'
import referenceSnapshot from '../data/third-party/battle-ability-reference.json'
import {
  singlesInapplicableAbilities,
  supplementalAbilityMoveImmunities,
  supplementalAbilityStatusImmunities,
  supplementalAbilityTerrain,
  supplementalAbilityWeather,
} from './battle-ability-effects'
import { battleMoveEffectiveness, createBattlePokemon, currentBattleStats, type BattleMove } from './battle'
import type { TeamMember, TeamPokemon } from './teams'

type AbilityPayload = (typeof apiAbilities)[number]
type AuditDimension = 'status' | 'weather' | 'held-item' | 'immunity' | 'healing' | 'other-condition'
type AuditFinding = 'local-branch' | 'not-applicable-to-singles' | 'missing-handler'
type AuditRow = {
  id: number
  name: string
  effect: string
  dimensions: AuditDimension[]
  finding: AuditFinding
  notes: string
}

const localSources = [
  readFileSync('src/lib/battle.ts', 'utf8'),
  readFileSync('src/lib/teams.ts', 'utf8'),
  readFileSync('src/lib/battle-ai.ts', 'utf8'),
  readFileSync('src/lib/battle-ability-effects.ts', 'utf8'),
].join('\n')

const englishEffect = (ability: AbilityPayload) => {
  const entry = ability.effect_entries.find((candidate) => candidate.language.name === 'en')
  const flavor = ability.flavor_text_entries.find((candidate) => candidate.language.name === 'en')
  return (entry?.short_effect ?? entry?.effect ?? flavor?.flavor_text ?? 'No English effect supplied by PokéAPI.')
    .replace(/[\n\f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const dimensionsFor = (effect: string): AuditDimension[] => {
  const dimensions: AuditDimension[] = []
  if (/status|ailment|burn|poison|paraly|sleep|froz|freeze|confus|flinch|infatuat/i.test(effect))
    dimensions.push('status')
  if (/weather|rain|sunlight|sandstorm|hail|snow/i.test(effect)) dimensions.push('weather')
  if (/held item|berry|plate|memory|item/i.test(effect)) dimensions.push('held-item')
  if (/immune|immunit|protect|prevent|absorb|evade|negate|cannot be|unaffected/i.test(effect))
    dimensions.push('immunity')
  if (/heal|restore|recover|regenerat|hp/i.test(effect)) dimensions.push('healing')
  if (!dimensions.length || /when|while|during|upon|after|before|below|above|if /i.test(effect))
    dimensions.push('other-condition')
  return dimensions
}

const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasLocalBranch = (name: string) => {
  const quoted = new RegExp(`["']${escaped(name)}["']`)
  const property = new RegExp(`(?:^|\\s)${escaped(name)}\\s*:`)
  return quoted.test(localSources) || property.test(localSources)
}

const auditRows: AuditRow[] = apiAbilities.map((ability) => {
  const effect = englishEffect(ability)
  const inapplicable = singlesInapplicableAbilities.has(ability.name)
  const localBranch = hasLocalBranch(ability.name)
  const finding: AuditFinding = inapplicable
    ? 'not-applicable-to-singles'
    : localBranch
      ? 'local-branch'
      : 'missing-handler'
  return {
    id: ability.id,
    name: ability.name,
    effect,
    dimensions: dimensionsFor(effect),
    finding,
    notes: inapplicable
      ? 'Its documented effect cannot affect the local singles trainer battle.'
      : localBranch
        ? 'A local branch or supplemental rule exists; this is not by itself proof of complete cartridge parity.'
        : 'No ability-specific handler was detected in the Random Battle engine.',
  }
})

const member = (ability: string): TeamMember => ({
  id: 'audit-member',
  pokemon: 'audit-pokemon',
  level: 100,
  friendship: 255,
  shiny: false,
  gender: 'male',
  tera: 'normal',
  ability,
  nature: 'hardy',
  item: '',
  moves: ['tackle', 'tackle', 'tackle', 'tackle'],
  evs: [0, 0, 0, 0, 0, 0],
  ivs: [31, 31, 31, 31, 31, 31],
  abilityActive: false,
  itemActive: false,
})

const pokemon = (ability: string): TeamPokemon => ({
  id: 1,
  name: 'audit-pokemon',
  species: 'audit-pokemon',
  stats: [100, 100, 100, 100, 100, 100],
  types: ['normal'],
  abilities: [ability],
  moves: ['tackle'],
})

const tackle: BattleMove = {
  name: 'tackle',
  type: 'normal',
  damageClass: 'physical',
  power: 40,
  accuracy: 100,
  priority: 0,
  pp: 35,
  target: 'selected-pokemon',
  healing: 0,
  drain: 0,
  ailment: null,
  ailmentChance: 0,
  effectChance: null,
  statChanges: [],
}

describe('complete PokéAPI ability catalog audit', () => {
  it('contains every ID from 1 through 314 exactly once and excludes IDs above 10000', () => {
    expect(apiAbilities.map((ability) => ability.id)).toEqual(Array.from({ length: 314 }, (_, index) => index + 1))
    expect(new Set(apiAbilities.map((ability) => ability.name)).size).toBe(314)
    expect(referenceSnapshot.records.map((ability) => ability.id)).toEqual(apiAbilities.map((ability) => ability.id))
    expect(referenceSnapshot.records.every((ability) => ability.reference !== null)).toBe(true)
  })

  it.each(apiAbilities)('#$id $name constructs safely and preserves numeric battle invariants', ({ name }) => {
    const combatant = createBattlePokemon(member(name), pokemon(name), [tackle, tackle, tackle, tackle])
    expect(combatant.ability.name).toBe(name)
    expect(currentBattleStats(combatant).every(Number.isFinite)).toBe(true)
    expect(Number.isFinite(battleMoveEffectiveness(tackle, combatant))).toBe(true)
  })

  it('classifies every requested behavior dimension without silently certifying missing handlers', () => {
    expect(auditRows).toHaveLength(314)
    expect(auditRows.every((row) => row.effect.length > 0 && row.dimensions.length > 0)).toBe(true)
    expect(auditRows.some((row) => row.finding === 'missing-handler')).toBe(true)
    expect(auditRows.filter((row) => row.finding === 'local-branch').length).toBeGreaterThan(0)
    for (const dimension of ['status', 'weather', 'held-item', 'immunity', 'healing'] as const)
      expect(auditRows.some((row) => row.dimensions.includes(dimension))).toBe(true)
  })

  it('keeps every supplemental rule tied to a catalogued ability', () => {
    const names = new Set(apiAbilities.map((ability) => ability.name))
    const supplemented = new Set([
      ...Object.keys(supplementalAbilityMoveImmunities),
      ...Object.values(supplementalAbilityStatusImmunities).flatMap((abilities) => abilities ?? []),
      ...Object.keys(supplementalAbilityWeather),
      ...Object.keys(supplementalAbilityTerrain),
      ...singlesInapplicableAbilities,
    ])
    expect([...supplemented].filter((name) => !names.has(name))).toEqual([])
  })
})

afterAll(() => {
  if (process.env.BATTLE_ABILITY_AUDIT_REPORT !== '1') return
  mkdirSync('docs', { recursive: true })
  const counts = Object.fromEntries(
    (['local-branch', 'not-applicable-to-singles', 'missing-handler'] as const).map((finding) => [
      finding,
      auditRows.filter((row) => row.finding === finding).length,
    ]),
  )
  const escapeCell = (value: string) => value.replaceAll('|', '\\|')
  const lines = [
    '# Battle ability audit',
    '',
    'Scope: all 314 PokéAPI abilities with IDs 1–314. IDs above 10000 are excluded. No eligible ID is skipped.',
    '',
    '**Result: the current engine cannot be certified correct for all 314 abilities.** The audit found ' +
      `${counts['local-branch']} abilities with a local branch or supplemental rule, ` +
      `${counts['not-applicable-to-singles']} whose documented effect cannot affect this singles format, and ` +
      `${counts['missing-handler']} with no ability-specific local handler.`,
    '',
    'A “local branch” means only that relevant code or structured supplemental data exists; it does not claim complete parity. Each ability also passes a bounded construction and numeric-invariant check. The JSON report preserves the full PokéAPI effect and all requested behavior dimensions.',
    '',
    `Sources: PokéAPI ability payloads and the current Pokémon Showdown ability table. Reference SHA-256: \`${referenceSnapshot.sha256}\`.`,
    '',
    'The supplemental file records mechanics that PokéAPI exposes only as prose, including move-type immunities and recovery, status immunities, weather, terrain, and singles-only applicability. Mechanics requiring unavailable model data—including contact/wind/slicing tags, forms, copied abilities, suppressed abilities, weight, and doubles adjacency—remain explicit audit findings.',
    '',
    '| ID | Ability | Dimensions | Finding | Effect / notes |',
    '| ---: | --- | --- | --- | --- |',
    ...auditRows.map(
      (row) =>
        `| ${row.id} | ${row.name} | ${row.dimensions.join(', ')} | ${row.finding} | ${escapeCell(`${row.effect} ${row.notes}`)} |`,
    ),
    '',
  ]
  writeFileSync('docs/battle-ability-audit.md', lines.join('\n'))
  writeFileSync(
    'docs/battle-ability-audit.json',
    JSON.stringify(
      {
        scope: { count: 314, minimumId: 1, maximumId: 314, excludedIdsAbove: 10000 },
        source: referenceSnapshot.source,
        sha256: referenceSnapshot.sha256,
        counts,
        abilities: auditRows,
      },
      null,
      2,
    ) + '\n',
  )
})
