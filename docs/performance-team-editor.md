# Team editor loading

The team editor previously imported `isBattleReadyTeam` from the battle simulator.
That static dependency also loaded simulation code and ability data before a battle
was opened. The predicate now belongs to `teams.ts`; `battle.ts` re-exports it for
existing consumers. Its six-member, four-nonempty-moves validation is unchanged.

## Production measurement

Using the same environment and `npx vite build --manifest`, sum the emitted JS file
sizes for `src/pages/TeamsPage.tsx` and its transitive static imports, counting each
file once:

| Version   | Uncompressed JavaScript |
| --------- | ----------------------: |
| Before    |         1,037,315 bytes |
| After     |           774,410 bytes |
| Reduction |   262,905 bytes (25.3%) |

This includes shared application dependencies and excludes dynamic imports, CSS,
images, and API payloads. It measures emitted code size, not elapsed loading time
or compressed network transfer. The simulator is still loaded when opening a
battle; that route now owns the deferred cost.

Reproduce the measurement after building with a manifest:

```sh
npx vite build --manifest
node --input-type=module <<'JS'
import fs from 'node:fs'
const manifest = JSON.parse(fs.readFileSync('dist/.vite/manifest.json', 'utf8'))
const visited = new Set()
function visit(key) {
  if (visited.has(key)) return
  visited.add(key)
  for (const dependency of manifest[key].imports ?? []) visit(dependency)
}
visit('src/pages/TeamsPage.tsx')
console.log([...visited].reduce((total, key) =>
  total + fs.statSync(`dist/${manifest[key].file}`).size, 0))
JS
```

`TeamsPage.test.tsx` rejects simulator imports while exercising the editor's real
interactions. The existing battle tests continue to check team readiness through
the compatible simulator export.
