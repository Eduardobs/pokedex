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
    setupFiles: './src/test/setup.ts',
  },
})
