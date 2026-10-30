import { expect, test } from '@playwright/test'

const maps = [
  { path: 'kanto', title: 'Mapa interativo de Kanto', marker: 'Misty' },
  { path: 'paldea', title: 'Mapa interativo de Paldea', marker: 'Iono' },
  { path: 'kitakami', title: 'Mapa interativo de Kitakami', marker: 'Munkidori' },
  { path: 'terrarium', title: 'Mapa interativo do Terarium', marker: 'Meloetta' },
  { path: 'hisui-region', title: 'Mapa interativo de Hisui', marker: 'Arceus' },
  { path: 'lumiose-city', title: 'Mapa interativo de Lumiose City', marker: 'Prism Tower' },
]

for (const map of maps) {
  test(`opens ${map.path} from the directory and searches, filters and zooms its map`, async ({ page }) => {
    await page.route('https://*.mapgenie.io/**', (route) => route.abort())
    await page.goto('/#/maps')
    await page.locator(`a[href="#/maps/${map.path}"]`).click()
    await expect(page).toHaveURL(new RegExp(`#/maps/${map.path}$`))
    await expect(page.getByRole('heading', { level: 1, name: map.title })).toBeVisible()

    const search = page.getByRole('textbox', { name: 'Buscar um ponto no mapa' })
    await search.fill(map.marker)
    const marker = page.getByRole('button', { name: new RegExp(`: ${map.marker},`) }).first()
    await marker.click()
    await expect(marker).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: map.marker, exact: true })).toBeVisible()

    await search.fill('unmatched-map-location')
    await expect(page.getByRole('heading', { name: 'Nenhum pin encontrado' })).toBeVisible()
    await search.clear()
    await expect(page.getByRole('heading', { name: 'Nenhum pin encontrado' })).toBeHidden()
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()
    await expect(page.getByText('0 pins visíveis', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nenhum pin encontrado' })).toBeHidden()
    await page.getByRole('button', { name: 'Marcar todos' }).click()
    await expect(page.getByText('0 pins visíveis', { exact: true })).toBeHidden()

    const zoom = page.getByRole('status', { name: 'Nível de zoom' })
    await page.getByRole('button', { name: 'Ampliar mapa' }).click()
    await expect(zoom).toHaveText('150%')
    const viewport = page.getByLabel(/Use as setas/)
    await viewport.focus()
    await page.keyboard.press('0')
    await expect(zoom).toHaveText('100%')
    await page.goBack()
    await expect(page).toHaveURL(/#\/maps$/)
    await expect(page.getByRole('link', { name: /Pokémon FireRed/ })).toBeVisible()
  })
}
