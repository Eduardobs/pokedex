import { API_BASE_URL } from './fixtures/api-config'
import { expect, test, type Locator } from '@playwright/test'
import { prepareMobileBattle } from './fixtures/battle'
import { mockEvolutionFamilies } from './fixtures/evolution'

// Composite actual computed colors, including color-mix and alpha, in the browser.
async function textContrastFailures(root: Locator) {
  return root.evaluate((root) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const rgba = (color: string) => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => (i === 3 ? v / 255 : v))
    }
    const over = (fg: number[], bg: number[]) =>
      fg
        .slice(0, 3)
        .map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]))
        .concat(1)
    const luminance = (rgb: number[]) =>
      rgb
        .slice(0, 3)
        .map((v) => {
          v /= 255
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
    return [...root.querySelectorAll<HTMLElement>('*')].flatMap((el) => {
      if (
        !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ||
        el.closest('.type-badge, .tera-type-badge, .damage-badge, .battle-major-status, [aria-hidden="true"]') ||
        ![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
      )
        return []
      const chain: Element[] = []
      for (let node: Element | null = el; node; node = node.parentElement) chain.unshift(node)
      let bg = [255, 255, 255, 1]
      let unknownBackground = false
      for (const node of chain) {
        const computed = getComputedStyle(node)
        const color = rgba(computed.backgroundColor)
        if (color[3] === 1) unknownBackground = false
        if (computed.backgroundImage !== 'none') unknownBackground = true
        bg = over(color, bg)
      }
      if (unknownBackground) return []
      const style = getComputedStyle(el)
      const fg = over(rgba(style.color), bg)
      const l1 = luminance(fg),
        l2 = luminance(bg)
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      const large =
        parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700)
      return ratio < (large ? 3 : 4.5)
        ? [{ text: el.textContent?.trim().slice(0, 70), class: el.className, ratio }]
        : []
    })
  })
}

for (const theme of ['light', 'dark']) {
  test(`battle tooltip text remains readable over extreme backdrops in ${theme} theme`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await prepareMobileBattle(page)
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme)
    const active = page.locator('.battle-active.player .battle-sprite-trigger')
    await active.focus()
    const tooltip = page.locator('.battle-active.player .battle-active-tooltip')
    await expect(tooltip).toBeVisible()
    for (const backdrop of ['#000', '#fff']) {
      await page
        .locator('.battle-field')
        .evaluate((el, color) => ((el as HTMLElement).style.background = color), backdrop)
      expect(await textContrastFailures(tooltip)).toEqual([])
    }
    await page.locator('.battle-field').evaluate((el) => (el as HTMLElement).style.removeProperty('background'))
    const move = page.getByRole('button', { name: 'Thunderbolt', exact: true })
    await move.focus()
    const moveTooltip = page.locator('.battle-move-tooltip').filter({ visible: true })
    await expect(moveTooltip).toBeVisible()
    expect(await textContrastFailures(moveTooltip)).toEqual([])
    await page.getByRole('button', { name: 'Trocar Pokémon', exact: true }).click()
    const replacement = page.locator('.battle-switch-button').first()
    await page.keyboard.press('Tab')
    await replacement.focus()
    const replacementTooltip = replacement.locator('.battle-switch-tooltip')
    await expect(replacementTooltip).toBeVisible()
    expect(await textContrastFailures(replacementTooltip)).toEqual([])
    await testInfo.attach('battle-tooltip', { body: await page.screenshot(), contentType: 'image/png' })
    expect(await replacement.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
    await page.locator('.battle-cancel-switch').click()
    await move.click()
    const logMove = page.locator('.battle-log-move-trigger').filter({ hasText: 'Thunderbolt' }).first()
    await expect(logMove).toBeVisible({ timeout: 15000 })
    await page.keyboard.press('Tab')
    await logMove.focus()
    const logTooltip = logMove.locator('.battle-log-move-tooltip')
    await expect(logTooltip).toBeVisible()
    expect(await textContrastFailures(logTooltip)).toEqual([])
  })
}

for (const theme of ['light', 'dark']) {
  test(`shared screen metadata has readable contrast in ${theme}`, async ({ page }) => {
    await page.route('https://*.mapgenie.io/**', (route) => route.abort())
    await page.route('https://raw.githubusercontent.com/**', (route) => route.abort())
    await prepareMobileBattle(page)
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme)
    await page.route(
      (url) =>
        url.href.startsWith(`${API_BASE_URL}/`) &&
        /\/(pokemon-form|pokemon-species|move)$/.test(url.pathname) &&
        Boolean(url.search),
      (route) => route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } }),
    )
    for (const route of [
      '',
      'explore',
      'favorites',
      'types-table',
      'compare-moves',
      'maps',
      'maps/kanto',
      'maps/paldea',
      'maps/kitakami',
      'maps/terrarium',
      'maps/hisui-region',
      'maps/lumiose-city',
      'teams',
      'pokemon',
      'forms',
      'explore/move',
      'explore/move/thunderbolt',
    ]) {
      await page.goto('/#/' + route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect.soft(await textContrastFailures(page.locator('main')), route).toEqual([])
    }
    await mockEvolutionFamilies(page)
    await page.goto('/#/pokemon/eevee')
    await expect(page.getByRole('heading', { level: 1, name: 'Eevee' })).toBeVisible()
    expect(await textContrastFailures(page.locator('main'))).toEqual([])
    for (const tab of await page.getByRole('tab').all()) {
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      expect.soft(await textContrastFailures(page.locator('main')), await tab.innerText()).toEqual([])
    }
  })
}

for (const theme of ['light', 'dark']) {
  test(`mobile battle details retain readable text in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await prepareMobileBattle(page)
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme)
    await page.getByRole('button', { name: 'Detalhes de Thunderbolt' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await textContrastFailures(dialog)).toEqual([])
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await testInfo.attach('mobile-battle-details', { body: await page.screenshot(), contentType: 'image/png' })
  })
}
