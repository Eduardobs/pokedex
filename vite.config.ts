import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { getApiConfig } from './src/config/api'

const METRONOME_VIRTUAL_ID = 'virtual:battle-metronome-moves'
const METRONOME_RESOLVED_ID = `\0${METRONOME_VIRTUAL_ID}`

type RawBundledMove = {
  name: string
  type: { name: string }
  damage_class: { name: string }
  power: number | null
  accuracy: number | null
  priority: number
  pp: number | null
  target: { name: string }
  effect_chance: number | null
  meta: {
    healing: number
    drain: number
    ailment: { name: string } | null
    ailment_chance: number
    min_hits: number | null
    max_hits: number | null
    crit_rate: number
    flinch_chance: number
    stat_chance: number
  } | null
  stat_changes: { stat: { name: string }; change: number }[]
  flavor_text_entries: { language: { name: string }; flavor_text: string }[]
}

function buildCompactMetronomeMoves() {
  const movesPath = resolve('src/data/third-party/pokeapi-battle-moves.json')
  const eligibilityPath = resolve('src/data/third-party/battle-metronome-moves.json')
  const bundledMoves = JSON.parse(readFileSync(movesPath, 'utf8')) as RawBundledMove[]
  const eligibility = JSON.parse(readFileSync(eligibilityPath, 'utf8')) as { moves: string[] }
  const eligible = new Set(eligibility.moves)

  return bundledMoves
    .filter((move) => eligible.has(move.name))
    .map((move) => ({
      name: move.name,
      type: move.type.name,
      damageClass: move.damage_class.name,
      power: move.power,
      accuracy: move.accuracy,
      priority: move.priority,
      pp: move.pp,
      target: move.target.name,
      effectChance: move.effect_chance,
      meta: move.meta
        ? {
            healing: move.meta.healing,
            drain: move.meta.drain,
            ailment: move.meta.ailment?.name ?? 'none',
            ailmentChance: move.meta.ailment_chance,
            minHits: move.meta.min_hits,
            maxHits: move.meta.max_hits,
            critRate: move.meta.crit_rate,
            flinchChance: move.meta.flinch_chance,
            statChance: move.meta.stat_chance,
          }
        : null,
      statChanges: move.stat_changes.map((entry) => ({ stat: entry.stat.name, change: entry.change })),
      flavorTexts: move.flavor_text_entries.map((entry) => ({
        language: entry.language.name,
        text: entry.flavor_text,
      })),
    }))
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  const api = getApiConfig(env)
  let siteUrl: URL | undefined
  if (env.VITE_SITE_URL) {
    siteUrl = new URL(env.VITE_SITE_URL)
    if (
      !['https:', 'http:'].includes(siteUrl.protocol) ||
      siteUrl.username ||
      siteUrl.password ||
      siteUrl.search ||
      siteUrl.hash
    ) {
      throw new Error('VITE_SITE_URL must be an absolute HTTP(S) URL without credentials, query, or fragment')
    }
    siteUrl.pathname = `${siteUrl.pathname.replace(/\/+$/, '')}/`
  }
  const historyRouting = env.VITE_ROUTER_MODE === 'history'
  const escapeXml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll("'", '&apos;')
  return {
    plugins: [
      react(),
      {
        name: 'battle-metronome-data',
        resolveId(id) {
          if (id === METRONOME_VIRTUAL_ID) return METRONOME_RESOLVED_ID
          return undefined
        },
        load(id) {
          if (id !== METRONOME_RESOLVED_ID) return undefined
          return `export default ${JSON.stringify(buildCompactMetronomeMoves())}`
        },
      },
      {
        name: 'api-endpoints',
        transformIndexHtml(html) {
          return html
            .replace('__API_CONNECT_ORIGINS__', [...new Set([api.restOrigin, api.graphqlOrigin])].join(' '))
            .replace('__API_REST_ORIGIN__', api.restOrigin)
        },
      },
      {
        name: 'seo-discovery',
        transformIndexHtml() {
          // History routes share this HTML; their canonical URL is set after route resolution.
          if (!siteUrl || historyRouting) return []
          return [
            { tag: 'link', attrs: { rel: 'canonical', href: siteUrl.href }, injectTo: 'head' },
            { tag: 'meta', attrs: { property: 'og:url', content: siteUrl.href }, injectTo: 'head' },
          ]
        },
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n` : ''}`,
          })
          if (!siteUrl) return
          const paths = ['']
          if (historyRouting) {
            paths.push('pokemon', 'forms', 'explore', 'types-table', 'compare-moves')
            if (env.VITE_FEATURE_MAPGENIE_INTEGRATION?.trim().toLowerCase() !== 'false') {
              paths.push(
                'maps',
                ...['kanto', 'paldea', 'kitakami', 'terrarium', 'hisui-region', 'lumiose-city'].map(
                  (name) => `maps/${name}`,
                ),
              )
            }
          }
          this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${escapeXml(new URL(path, siteUrl).href)}</loc></url>`).join('\n')}\n</urlset>\n`,
          })
        },
      },
      {
        name: 'development-csp',
        apply: 'serve',
        transformIndexHtml(html) {
          // React Refresh injects a small inline module only in the local dev server.
          return html
            .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
            .replace("connect-src 'self'", "connect-src 'self' ws://localhost:* ws://127.0.0.1:*")
        },
      },
    ],
    server: { headers: { 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Frame-Options': 'DENY' } },
    preview: { headers: { 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Frame-Options': 'DENY' } },
    base: historyRouting ? (siteUrl?.pathname ?? '/') : './',
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/types.ts',
          'src/i18n/types.ts',
        ],
        reporter: ['text', 'html', 'json-summary'],
        thresholds: {
          statements: 85,
          branches: 77,
          functions: 85,
          lines: 88,
        },
      },
    },
  }
})
