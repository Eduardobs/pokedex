import { STORAGE_KEYS } from './config/app'
import { readStorageString } from './lib/storage'

const theme = readStorageString(STORAGE_KEYS.theme, ['light', 'dark'] as const, 'light')

document.documentElement.dataset.theme = theme
document.documentElement.style.colorScheme = theme
document.querySelector('meta[name="theme-color"]')?.setAttribute(
  'content',
  theme === 'dark' ? '#101419' : '#e33535',
)
