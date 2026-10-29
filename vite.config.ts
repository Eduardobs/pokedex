import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
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
            .replace(
              "connect-src 'self' https://pokeapi.co https://graphql.pokeapi.co",
              "connect-src 'self' https://pokeapi.co https://graphql.pokeapi.co ws://localhost:* ws://127.0.0.1:*",
            )
        },
      },
    ],
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
