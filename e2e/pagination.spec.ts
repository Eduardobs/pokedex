import { expect, test } from '@playwright/test'

for (const width of [320, 1440]) {
  test(`navigates collection pages with the keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('https://pokeapi.co/api/v2/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.replace(/\/$/, '') !== '/api/v2/pokemon') {
        await route.abort()
        return
      }
      const offset = Number(url.searchParams.get('offset') ?? 0)
      await route.fulfill({
        json: {
          count: 995,
          next: offset < 960 ? 'https://pokeapi.co/api/v2/pokemon?offset=960' : null,
          previous: offset > 0 ? 'https://pokeapi.co/api/v2/pokemon?offset=0' : null,
          results: [{ name: `pokemon-${offset + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${offset + 1}/` }],
        },
      })
    })
    await page.goto('/#/explore/pokemon')
    const navigation = page.getByRole('navigation', { name: 'Paginação', exact: true }).first()
    const fourth = navigation.getByRole('button', { name: 'Ir para a página 4', exact: true })
    await fourth.focus()
    await fourth.press('Enter')
    await expect(page).toHaveURL(/offset=120/)
    await expect(fourth).toHaveAttribute('aria-current', 'page')
    await expect(fourth).toBeFocused()
    await navigation.getByRole('button', { name: 'Última página' }).click()
    await expect(page).toHaveURL(/offset=960/)
    await expect(navigation).toContainText('961–995 de 995')
    await page.reload()
    await expect(navigation).toContainText('Página 25')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: /tema escuro/i }).click()
    await expect(navigation.getByRole('button', { name: 'Ir para a página 25' })).toBeVisible()
    await navigation.getByRole('button', { name: 'Primeira página' }).click()
    await expect(navigation).toContainText('Página 1')
    await expect(navigation.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled()
  })
}
