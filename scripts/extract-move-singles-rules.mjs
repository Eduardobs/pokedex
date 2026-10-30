import { readFileSync, writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'

async function writeGenerated(path, source) {
  writeFileSync(path, await format(source, { ...(await resolveConfig(path)), filepath: path }))
}

// Keep runtime assets small: callback source remains in the audit snapshot.
const snapshot = JSON.parse(readFileSync('src/data/third-party/battle-move-reference.json', 'utf8'))
const exclusions = {}
const flags = {}
const secondaries = {}
const statNames = {
  atk: 'attack',
  def: 'defense',
  spa: 'specialAttack',
  spd: 'specialDefense',
  spe: 'speed',
  accuracy: 'accuracy',
  evasion: 'evasion',
}
const ailments = {
  brn: 'burn',
  frz: 'freeze',
  par: 'paralysis',
  psn: 'poison',
  tox: 'badly-poisoned',
  slp: 'sleep',
  confusion: 'confusion',
}
function effect(value, target) {
  if (Object.keys(value).some((key) => !['chance', 'boosts', 'status', 'volatileStatus', 'self'].includes(key)))
    return null
  if (value.volatileStatus && !['flinch', 'confusion'].includes(value.volatileStatus)) return null
  if (value.status && !ailments[value.status]) return null
  const result = { target }
  if (value.boosts) {
    if (Object.keys(value.boosts).some((stat) => !statNames[stat])) return null
    result.statChanges = Object.entries(value.boosts).map(([stat, change]) => ({ stat: statNames[stat], change }))
  }
  if (value.status || value.volatileStatus === 'confusion')
    result.ailment = ailments[value.status ?? value.volatileStatus]
  if (value.volatileStatus === 'flinch') result.flinch = true
  return result
}
const singlesFailures = new Set(['ally-switch', 'after-you', 'quash', 'follow-me', 'rage-powder'])
if (snapshot.records.length !== 919) throw new Error('Expected all 919 move records')
for (const [index, { id, name, reference }] of snapshot.records.entries()) {
  if (id !== index + 1 || !reference) throw new Error(`Missing reference for move ${index + 1}`)
  flags[name] = Object.entries(reference.flags ?? {}).flatMap(([flag, enabled]) => (enabled ? [flag] : []))
  const raw = reference.secondaries ?? (reference.secondary ? [reference.secondary] : [])
  if (raw.length && !reference.self && !reference.boosts && !reference.status) {
    const groups = raw.map((value) => {
      const targetEffect = effect(value, 'target')
      const selfEffect = value.self ? effect(value.self, 'user') : undefined
      if (!targetEffect || selfEffect === null) return null
      const effects = [targetEffect, selfEffect].filter((value) => value && Object.keys(value).length > 1)
      return { chance: value.chance ?? 100, effects }
    })
    if (groups.every((value) => value !== null) && groups.some((value) => value.effects.length))
      secondaries[name] = groups
  }
  if (reference.isZ || reference.isMax) exclusions[name] = 'unsupported-transformation'
  else if (reference.target === 'adjacentAlly') exclusions[name] = 'requires-active-ally'
  else if (singlesFailures.has(name)) exclusions[name] = 'requires-multiple-active-pokemon'
}
await writeGenerated(
  'src/data/third-party/battle-move-secondaries.ts',
  `// Generated from the pinned move reference by scripts/extract-move-singles-rules.mjs.\nimport type { BattleMoveSecondary } from '../../lib/battle'\n\nexport const canonicalMoveSecondaries: Readonly<Record<string, readonly BattleMoveSecondary[]>> = ${JSON.stringify(secondaries, null, 2)}\n`,
)
for (const [name, data] of [
  ['flags', flags],
  ['singles-exclusions', exclusions],
]) {
  await writeGenerated(`src/data/third-party/battle-move-${name}.json`, `${JSON.stringify(data, null, 2)}\n`)
}
