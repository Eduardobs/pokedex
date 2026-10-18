// Read the reference as syntax only; never execute downloaded code.
import fs from 'node:fs'
import crypto from 'node:crypto'
import ts from 'typescript'
const path = process.argv[2]
if (!path) throw new Error('Usage: node scripts/extract-move-reference.mjs /path/to/pokemon-showdown/data/moves.ts')
const source = fs.readFileSync(path, 'utf8')
const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
const declaration = file.statements
  .flatMap((statement) => (ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []))
  .find((declaration) => declaration.name.getText(file) === 'Moves')
function literal(node) {
  if (!node) return null
  if (ts.isStringLiteral(node)) return node.text
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
const api = JSON.parse(fs.readFileSync('src/data/third-party/pokeapi-battle-moves.json', 'utf8'))
const records = api.map((move) => {
  // PokéAPI allocates paired IDs to physical/special Z moves; Showdown derives
  // their category at activation and stores the physical ID only.
  const pairedZ = move.name.endsWith('--special')
    ? reference.find((entry) => entry.num === move.id - 1 && entry.isZ)
    : null
  const found = reference.find((entry) => entry.num === move.id) ?? pairedZ
  return {
    id: move.id,
    name: move.name,
    reference: found ? { ...found, ...(pairedZ ? { category: 'Special' } : {}) } : null,
  }
})
fs.writeFileSync(
  'src/data/third-party/battle-move-reference.json',
  JSON.stringify(
    {
      source: 'https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts',
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
