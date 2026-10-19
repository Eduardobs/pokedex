// Read the reference as syntax only; never execute downloaded code.
import fs from 'node:fs'
import crypto from 'node:crypto'
import ts from 'typescript'

const path = process.argv[2]
if (!path)
  throw new Error('Usage: node scripts/extract-ability-reference.mjs /path/to/pokemon-showdown/data/abilities.ts')
const source = fs.readFileSync(path, 'utf8')
const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
const declaration = file.statements
  .flatMap((statement) => (ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []))
  .find((entry) => entry.name.getText(file) === 'Abilities')
if (!declaration || !ts.isObjectLiteralExpression(declaration.initializer))
  throw new Error('Could not find the Abilities object in the reference source.')

function literal(node) {
  if (!node) return null
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -literal(node.operand)
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((property) => [
        property.name?.getText(file).replaceAll('"', '').replaceAll("'", ''),
        ts.isPropertyAssignment(property) ? literal(property.initializer) : { callbackSource: property.getText(file) },
      ]),
    )
  return '<expression>'
}

const reference = declaration.initializer.properties.map((property) => literal(property.initializer))
const api = JSON.parse(fs.readFileSync('src/data/third-party/pokeapi-battle-abilities.json', 'utf8'))
const identifier = (value) =>
  String(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, '')
const records = api.map((ability) => {
  // PokéAPI and Showdown occasionally disagree on newly allocated IDs, and the
  // current Showdown table contains duplicate numeric IDs for two Ruin abilities.
  // A normalized canonical name is therefore the stable join key.
  const normalizedName = identifier(ability.name)
  const matches = reference.filter(
    (entry) =>
      identifier(entry.name) === normalizedName ||
      (ability.name === 'embody-aspect' && identifier(entry.name).startsWith('embodyaspect')),
  )
  return {
    id: ability.id,
    name: ability.name,
    reference: matches.length === 1 ? matches[0] : matches.length > 1 ? { variants: matches } : null,
  }
})
fs.writeFileSync(
  'src/data/third-party/battle-ability-reference.json',
  JSON.stringify(
    {
      source: 'https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts',
      sha256: crypto.createHash('sha256').update(source).digest('hex'),
      records,
    },
    null,
    2,
  ) + '\n',
)
console.log(
  `Extracted ${records.length} reference records; ${records.filter((record) => !record.reference).length} lack a matching ID.`,
)
