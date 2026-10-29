// Parse the upstream tables as syntax; downloaded callbacks are never executed.
import fs from 'node:fs'
import crypto from 'node:crypto'
import ts from 'typescript'
const [movesPath, pokemonPath, abilitiesPath] = process.argv.slice(2)
if (!movesPath || !pokemonPath || !abilitiesPath)
  throw new Error('Usage: node scripts/extract-battle-facts.mjs moves.ts pokedex.ts abilities.ts')
function table(path, variable) {
  const source = fs.readFileSync(path, 'utf8')
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const declaration = file.statements
    .flatMap((s) => (ts.isVariableStatement(s) ? [...s.declarationList.declarations] : []))
    .find((d) => d.name.getText(file) === variable)
  if (!declaration || !ts.isObjectLiteralExpression(declaration.initializer)) throw new Error(`Missing ${variable}`)
  function literal(node) {
    if (ts.isStringLiteral(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
    if (ts.isObjectLiteralExpression(node))
      return Object.fromEntries(
        node.properties
          .filter(ts.isPropertyAssignment)
          .map((p) => [p.name.getText(file).replaceAll(/["']/g, ''), literal(p.initializer)]),
      )
    return null
  }
  return { entries: literal(declaration.initializer), sha256: crypto.createHash('sha256').update(source).digest('hex') }
}
const moves = table(movesPath, 'Moves')
const pokemon = table(pokemonPath, 'Pokedex')
const abilities = table(abilitiesPath, 'Abilities')
const api = JSON.parse(fs.readFileSync('src/data/third-party/pokeapi-battle-abilities.json', 'utf8'))
const normalized = (value) => value.toLowerCase().replaceAll(/[^a-z0-9]/g, '')
const abilityFlags = Object.fromEntries(
  api.map((a) => [
    a.name,
    Object.values(abilities.entries).find(
      (r) =>
        r.name &&
        (normalized(r.name) === normalized(a.name) ||
          (a.name === 'embody-aspect' && normalized(r.name).startsWith('embodyaspect'))),
    )?.flags ?? {},
  ]),
)
const moveFacts = Object.fromEntries(
  Object.entries(moves.entries).map(([id, m]) => [
    id,
    {
      flags: Object.keys(m.flags ?? {}).filter((k) =>
        [
          'contact',
          'sound',
          'bite',
          'punch',
          'pulse',
          'slicing',
          'wind',
          'bullet',
          'powder',
          'dance',
          'heal',
          'reflectable',
        ].includes(k),
      ),
      recoil: m.recoil,
      crash: m.hasCrashDamage,
      selfdestruct: m.selfdestruct,
      secondary: !!(m.secondary || m.secondaries),
    },
  ]),
)
const forms =
  /^(castform|cherrim|darmanitan|aegislash|wishiwashi|mimikyu|zygarde|eiscue|morpeko|palafin|cramorant|terapagos|minior|arceus|silvally|ogerpon)/
const pokemonFacts = Object.fromEntries(
  Object.entries(pokemon.entries).map(([id, p]) => [
    id,
    {
      weight: p.weightkg,
      ...(forms.test(id) && p.types && p.baseStats
        ? {
            name: p.name,
            types: p.types.map((t) => t.toLowerCase()),
            stats: ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map((s) => p.baseStats[s]),
          }
        : {}),
    },
  ]),
)
fs.writeFileSync(
  'src/data/third-party/battle-mechanics-facts.json',
  JSON.stringify(
    {
      source: 'https://github.com/smogon/pokemon-showdown/tree/master/data',
      abilitiesSha256: abilities.sha256,
      abilityFlags,
      movesSha256: moves.sha256,
      pokemonSha256: pokemon.sha256,
      moves: moveFacts,
      pokemon: pokemonFacts,
    },
    null,
    2,
  ) + '\n',
)
