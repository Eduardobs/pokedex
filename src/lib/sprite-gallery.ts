import type { Pokemon } from '../types'
import { record } from './resource-data'

export type GallerySprite = { key: string; url: string; animated: boolean }
export type SpriteGroup = { name: string; sprites: GallerySprite[] }

export function spriteGallery(sprites: Pokemon['sprites']): SpriteGroup[] {
  const groups: SpriteGroup[] = []
  function collect(name: string, value: unknown, depth = 0) {
    if (depth > 4) return
    const entries = Object.entries(record(value)).slice(0, 80)
    const images: GallerySprite[] = []
    for (const [key, child] of entries) {
      if (typeof child === 'string') {
        try {
          const url = new URL(child)
          if (
            url.origin === 'https://raw.githubusercontent.com' &&
            url.pathname.startsWith('/PokeAPI/sprites/') &&
            /\.(png|svg|gif)$/.test(url.pathname) &&
            !url.search &&
            !url.hash
          ) {
            images.push({ key, url: url.href, animated: url.pathname.endsWith('.gif') || name.includes('animated') })
          }
        } catch {
          /* Ignore unavailable media. */
        }
      } else if (child && typeof child === 'object') collect(name ? `${name}/${key}` : key, child, depth + 1)
    }
    if (images.length) groups.push({ name, sprites: images })
  }
  collect('', sprites)
  return groups.sort((a, b) => (a.name === '' ? -1 : b.name === '' ? 1 : a.name.localeCompare(b.name)))
}
