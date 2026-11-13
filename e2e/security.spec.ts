import { expect, test } from '@playwright/test'
import { API_BASE_URL } from './fixtures/api-config'

test('handles malformed Pokemon data without losing the application shell', async ({ page }) => {
  await page.route(`${API_BASE_URL}/**`, (route) => route.fulfill({ json: {} }))
  await page.goto('/#/pokemon/pikachu')
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await expect(page.getByRole('navigation').first()).toBeVisible()
  await expect(page.locator('.fatal-error')).toHaveCount(0)
})

test('does not render an interactive application inside a frame when hosting headers are absent', async ({ page }) => {
  await page.route('**/security-host', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<iframe title="embedded application" src="/"></iframe>' }),
  )
  await page.route('http://127.0.0.1:4173/', async (route) => {
    const response = await route.fetch()
    const headers = response.headers()
    delete headers['content-security-policy']
    delete headers['x-frame-options']
    await route.fulfill({ response, headers })
  })
  await page.goto('/security-host')
  const frame = page.frameLocator('iframe')
  await expect(frame.locator('body')).toBeAttached()
  await expect(frame.locator('#root')).toHaveCount(0)
  await expect(frame.getByRole('button')).toHaveCount(0)
})
