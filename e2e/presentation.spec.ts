import { expect, test, type Page, type TestInfo } from '@playwright/test'
import {
  mockPresentation,
  presentationResources,
  resourceName,
  expectReadablePresentation,
} from './fixtures/presentation'
import { prepareMobileBattle } from './fixtures/battle'

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name.replace(/[^\p{L}\p{N}-]+/gu, '-')}.png`)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

for (const theme of ['light', 'dark']) {
  for (const endpoint of presentationResources) {
    test(`reads the ${endpoint} list and detail without broken text in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: theme === 'light' ? 320 : 390, height: 844 })
      await page.addInitScript((theme) => localStorage.setItem('atlas-theme', theme), theme)
      await mockPresentation(page)
      await page.goto(`/#/explore/${endpoint}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('.data-list > a').first()).toBeVisible()
      if (endpoint === 'move') await expect(page.locator('.move-list-stat b').first()).toBeVisible()
      if (endpoint === 'ability')
        await expect(page.locator('.ability-list-description')).toContainText('Descrição completa')
      await expectReadablePresentation(page)
      await page.goto(`/#/explore/${endpoint}/${resourceName(endpoint)}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      if (endpoint === 'pokemon' || endpoint === 'pokemon-species') await expect(page).toHaveURL(/\/pokemon\/eevee$/)
      else
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          endpoint === 'type' ? 'Electric' : 'Registro de referência detalhado',
        )
      await expectReadablePresentation(page)
      await capture(page, testInfo, `detail-${endpoint}-${theme}`)
    })
  }
  for (const route of [
    '',
    'pokemon',
    'forms',
    'favorites',
    'explore',
    'types-table',
    'compare-moves?left=thunderbolt&right=thunderbolt',
    'maps',
    'maps/kanto',
    'maps/paldea',
    'maps/kitakami',
    'maps/terrarium',
    'maps/hisui-region',
    'maps/lumiose-city',
    'not-a-route',
  ]) {
    test(`reads route /${route} without broken text in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 320, height: 844 })
      await page.addInitScript((theme) => {
        localStorage.setItem('atlas-theme', theme)
        localStorage.setItem('atlas-pokemon-favorites', JSON.stringify(['eevee']))
      }, theme)
      await mockPresentation(page)
      await page.goto('/#/' + route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      if (route === 'pokemon' || route === 'favorites' || route === 'forms')
        await expect(page.locator('.pokemon-card h3').first()).toBeVisible()
      if (route.startsWith('maps/')) {
        const markerNames: Record<string, string> = {
          'maps/kanto': 'Misty',
          'maps/paldea': 'Iono',
          'maps/kitakami': 'Munkidori',
          'maps/terrarium': 'Meloetta',
          'maps/hisui-region': 'Arceus',
          'maps/lumiose-city': 'Prism Tower',
        }
        await page.getByRole('button', { name: 'Exibir filtros' }).click()
        await expect(page.getByRole('dialog', { name: 'Filtros do mapa' })).toBeVisible()
        await expectReadablePresentation(page)
        await page.getByRole('textbox', { name: 'Buscar um ponto no mapa' }).fill(markerNames[route])
        await page.keyboard.press('Escape')
        await page
          .getByRole('button', { name: new RegExp(`: ${markerNames[route]},`) })
          .first()
          .click()
        await expect(page.getByRole('heading', { name: markerNames[route], exact: true })).toBeVisible()
      }
      await expectReadablePresentation(page)
      await capture(page, testInfo, 'route')
    })
  }
  test(`reads every Pokémon tab in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.addInitScript((theme) => localStorage.setItem('atlas-theme', theme), theme)
    await mockPresentation(page)
    await page.goto('/#/pokemon/eevee')
    await expect(page.getByRole('heading', { level: 1, name: 'Eevee' })).toBeVisible()
    for (const tab of await page.getByRole('tab').all()) {
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      if ((await tab.innerText()) === 'Encontros') {
        await expect(page.locator('.encounter-card')).toBeVisible()
        await page.locator('.encounter-card summary').click()
      }
      await expectReadablePresentation(page)
      await capture(page, testInfo, await tab.innerText())
    }
  })
  test(`reads the team workbench and active battle in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.addInitScript((theme) => localStorage.setItem('atlas-theme', theme), theme)
    await prepareMobileBattle(page)
    await expectReadablePresentation(page)
    await capture(page, testInfo, 'battle')
    await page.goto('/#/teams')
    await expect(page.getByRole('tab').first()).toBeVisible()
    await expectReadablePresentation(page)
    await capture(page, testInfo, 'teams')
    await page.getByRole('button', { name: 'Batalhar com esta equipe' }).click()
    await expect(page.getByRole('button', { name: 'Iniciar batalha' })).toBeVisible()
    await expectReadablePresentation(page)
    await capture(page, testInfo, 'preparation')
  })
}

test('keeps long selected labels and option descriptions complete in all languages', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await mockPresentation(page)
  await page.goto('/#/types-table')
  for (const option of [/Português/, /English/, /Español/]) {
    await page.getByRole('button', { name: /Idioma|Language/ }).click()
    await page.getByRole('option', { name: option }).click()
    await expectReadablePresentation(page)
  }
})

test('reads complete nature selections and item descriptions on a narrow workbench', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await prepareMobileBattle(page)
  await page.goto('/#/teams')
  const nature = page.getByRole('combobox', { name: 'Natureza' })
  await expect(nature).toBeAttached()
  const option = await nature.locator('option').evaluateAll((options) => {
    const option = options.find((option) => option.textContent?.includes('+')) as HTMLOptionElement
    return { value: option.value, label: option.textContent ?? '' }
  })
  await nature.selectOption(option.value)
  await expect(nature).toHaveValue(option.value)
  await expect(nature.locator('..').locator('.native-value-copy')).toHaveText(option.label)
  await expectReadablePresentation(page)
  await page.getByRole('button', { name: 'Item equipado' }).click()
  await expect(page.getByRole('listbox').getByRole('option').first()).toBeVisible()
  await expectReadablePresentation(page)
})
