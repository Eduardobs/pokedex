import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'development-csp',
      apply: 'serve',
      transformIndexHtml(html) {
        // React Refresh injects a small inline module only in the local dev server.
        return html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
      },
    },
  ],
  base: './',
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
})
