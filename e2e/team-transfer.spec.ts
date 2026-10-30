import { expect, test } from '@playwright/test'
import { STORAGE_KEYS, TEAM_IMPORT_MAX_BYTES } from '../src/config/app'

test('exports, imports and persists a team without overwriting the original', async ({ page }) => {
  await page.goto('/#/teams')
  await page.getByRole('button', { name: 'Nova equipe' }).click()
  await page.getByRole('textbox', { name: 'Nome da equipe' }).fill('Transfer team')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar equipe' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('atlas-team-transfer-team.json')
  const path = await download.path()
  expect(path).not.toBeNull()
  await page.getByLabel('Arquivo da equipe').setInputFiles(path!)
  await expect(page.getByRole('status').filter({ hasText: 'Equipe importada.' })).toBeVisible()
  const teams = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEYS.teams)
  expect(teams).toHaveLength(2)
  expect(teams[0].name).toBe('Transfer team')
  expect(teams[1]).toEqual({ ...teams[0], id: expect.any(String) })
  expect(teams[1].id).not.toBe(teams[0].id)
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Nome da equipe' })).toHaveValue('Transfer team')
  await page.getByRole('combobox', { name: 'Selecionar equipe' }).click()
  await expect(page.getByRole('option', { name: 'Transfer team', exact: true })).toHaveCount(2)
})

for (const file of [
  { name: 'malformed.json', content: '{broken', error: 'Não foi possível importar o arquivo.' },
  { name: 'invalid.json', content: '{"format":"unknown","version":1}', error: 'Não foi possível importar o arquivo.' },
  {
    name: 'oversized.json',
    content: ' '.repeat(TEAM_IMPORT_MAX_BYTES + 1),
    error: 'O arquivo da equipe é grande demais para importar.',
  },
]) {
  test(`rejects ${file.name} without changing a saved team`, async ({ page }) => {
    await page.goto('/#/teams')
    await page.getByRole('button', { name: 'Nova equipe' }).click()
    await page.getByRole('textbox', { name: 'Nome da equipe' }).fill('Keep this team')
    const before = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.teams)
    await page.getByLabel('Arquivo da equipe').setInputFiles({
      name: file.name,
      mimeType: 'application/json',
      buffer: Buffer.from(file.content),
    })
    await expect(page.getByRole('alert')).toContainText(file.error)
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.teams)).toBe(before)
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Nome da equipe' })).toHaveValue('Keep this team')
  })
}
