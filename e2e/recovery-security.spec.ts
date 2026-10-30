import { expect, test } from '@playwright/test'
import { STORAGE_KEYS } from '../src/config/app'

test('recovers from an unknown route through the home link and browser history', async ({ page }) => {
  await page.goto('/#/missing-screen')
  await expect(page.getByRole('alert')).toContainText('Página não encontrada')
  await page.getByRole('link', { name: 'Ir para o início' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('link', { name: 'Abrir Pokédex' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('alert')).toContainText('Página não encontrada')
})

for (const path of ['explore/unsupported', 'explore/unsupported/pikachu']) {
  test(`rejects the unknown resource ${path} without requesting it`, async ({ page }) => {
    const requests: string[] = []
    await page.route('https://pokeapi.co/**', (route) => {
      requests.push(route.request().url())
      return route.fulfill({ status: 404, json: {} })
    })
    await page.goto(`/#/${path}`)
    await expect(page.getByRole('alert')).toContainText('Coleção desconhecida')
    expect(requests).toEqual([])
  })
}

for (const value of ['{broken-json', '{"unexpected":"shape"}']) {
  test(`recovers favorites and teams from invalid storage: ${value}`, async ({ page }) => {
    await page.addInitScript(
      ({ keys, value }) => {
        localStorage.setItem(keys.favorites, value)
        localStorage.setItem(keys.teams, value)
        localStorage.setItem(keys.language, 'unsupported')
        localStorage.setItem(keys.theme, 'unsupported')
      },
      { keys: STORAGE_KEYS, value },
    )
    await page.goto('/#/favorites')
    await expect(page.getByRole('heading', { name: 'Sua coleção está vazia' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await page.goto('/#/teams')
    await expect(page.getByRole('heading', { level: 1, name: 'Criar equipes' })).toBeVisible()
    await expect(page.getByText('Você ainda não tem equipes', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
}

test('renders untrusted API markup as text without executing it', async ({ page }) => {
  const payload = '<img src=x onerror="window.injected=true">'
  await page.route('https://pokeapi.co/api/v2/**', (route) =>
    route.fulfill({
      json: { id: 1, name: 'test-ability', names: [], effect_entries: [{ language: { name: 'en' }, effect: payload }] },
    }),
  )
  await page.goto('/#/explore/ability/test-ability')
  await expect(page.getByText(payload, { exact: true })).toBeVisible()
  expect(await page.evaluate(() => 'injected' in window)).toBe(false)
  await expect(page.locator('img[onerror]')).toHaveCount(0)
  const source = page.getByRole('link', { name: /API/ }).filter({ hasText: /API/ })
  await expect(source).toHaveAttribute('rel', 'noopener noreferrer')
})
