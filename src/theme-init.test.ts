import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from './config/app'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  document.head.querySelector('meta[name="theme-color"]')?.remove()
  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''
})

async function initialize() {
  vi.resetModules()
  await import('./theme-init')
}

describe('theme initialization before React mounts', () => {
  it.each([
    ['dark', 'dark', '#0d1419'],
    ['light', 'light', '#f5f7f8'],
    ['invalid', 'light', '#f5f7f8'],
  ])('applies stored %s as %s to the document and browser chrome', async (stored, theme, color) => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    localStorage.setItem(STORAGE_KEYS.theme, stored)
    await initialize()
    expect(document.documentElement.dataset.theme).toBe(theme)
    expect(document.documentElement.style.colorScheme).toBe(theme)
    expect(meta.content).toBe(color)
  })

  it('starts with the default theme when storage is unavailable and the meta tag is absent', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })
    await initialize()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})
