import { expect, test } from '@playwright/test'
import { prepareMobileBattle } from './fixtures/battle'

test.use({ hasTouch: true, reducedMotion: 'reduce' })

for (const width of [320, 390]) {
  test(`reads battle details without acting or overflowing at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 640 })
    await prepareMobileBattle(page)
    if (width === 390) await page.getByRole('button', { name: /tema escuro/i }).click()
    const details = page.getByRole('button', { name: 'Detalhes de Thunderbolt' })
    await details.scrollIntoViewIfNeeded()
    await testInfo.attach('battle-actions', {
      body: await page.screenshot({ path: testInfo.outputPath('battle-actions.png') }),
      contentType: 'image/png',
    })
    await details.click()
    const dialog = page.getByRole('dialog', { name: 'Detalhes de Thunderbolt' })
    await expect(dialog).toBeVisible()
    await testInfo.attach('battle-details', {
      body: await page.screenshot({ path: testInfo.outputPath('battle-details.png') }),
      contentType: 'image/png',
    })
    await expect(dialog).toContainText('Poder: 90')
    await expect(dialog).toContainText('Descrição completa do movimento')
    const description = dialog.locator('.battle-tooltip-description > span')
    expect(await description.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true)
    await expect(page.locator('.battle-log')).not.toContainText('usou Thunderbolt')
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight))
    const close = dialog.getByRole('button', { name: 'Fechar informações' })
    await expect(close).toBeInViewport()
    await close.click()
    await expect(details).toBeFocused()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.locator('.battle-active.player .battle-sprite-trigger').click()
    await expect(page.getByRole('dialog')).toContainText('Atributos atuais')
    await page.keyboard.press('Escape')
    await expect(page.locator('.battle-active.player .battle-sprite-trigger')).toBeFocused()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Trocar Pokémon', exact: true }).click()
    const replacementDetails = page
      .locator('.battle-switches')
      .getByRole('button', { name: 'Detalhes de Pikachu' })
      .first()
    await replacementDetails.click()
    const replacementDialog = page.getByRole('dialog')
    await expect(replacementDialog).toContainText('Leftovers')
    await expect(replacementDialog).toContainText('Thunderbolt')
    for (const text of await replacementDialog.locator('.battle-resource-detail small').all()) {
      expect(await text.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true)
    }
    expect(await replacementDialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(replacementDetails).toBeFocused()
    await page.locator('.battle-cancel-switch').click()
    await page.getByRole('button', { name: 'Thunderbolt', exact: true }).click()
    const logMove = page.locator('.battle-log-move-trigger').filter({ hasText: 'Thunderbolt' }).first()
    await expect(logMove).toBeVisible({ timeout: 15000 })
    await logMove.click()
    await expect(page.getByRole('dialog')).toContainText('Poder: 90')
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
