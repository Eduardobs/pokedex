import type { Pokemon, PokemonForm } from '../types'
import { pokemonArtwork } from './api'

const SPRITES_ORIGIN = 'https://raw.githubusercontent.com'
const FORM_SPRITES_PATH = '/PokeAPI/sprites/master/sprites/pokemon/'
const OFFICIAL_ARTWORK_PATH = `${FORM_SPRITES_PATH}other/official-artwork/`
const FORM_SPRITE_FILENAME = /^[1-9]\d*(?:-[a-z0-9]+)*\.png$/

type PokemonWithArtwork = Pick<Pokemon, 'forms' | 'sprites'>
type FormWithArtwork = Pick<PokemonForm, 'is_default' | 'sprites'>

export type PokemonFormArtworkSource = {
  url: string
  shiny: boolean
  sprite: boolean
}

export function officialArtworkForFormSprite(spriteUrl: string | null | undefined) {
  if (!spriteUrl) return null

  try {
    const parsed = new URL(spriteUrl)
    if (
      parsed.origin !== SPRITES_ORIGIN ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !parsed.pathname.startsWith(FORM_SPRITES_PATH)
    )
      return null

    const isShiny = parsed.pathname.startsWith(`${FORM_SPRITES_PATH}shiny/`)
    const filename = parsed.pathname.slice(isShiny ? `${FORM_SPRITES_PATH}shiny/`.length : FORM_SPRITES_PATH.length)
    if (!FORM_SPRITE_FILENAME.test(filename)) return null

    return `${SPRITES_ORIGIN}${OFFICIAL_ARTWORK_PATH}${isShiny ? 'shiny/' : ''}${filename}`
  } catch {
    return null
  }
}

/**
 * Builds a resilient source list for directory cards. Recent PokéAPI forms can
 * expose artwork only through the related Pokémon ID, while other forms expose
 * a sprite but no matching official artwork file.
 */
export function pokemonFormDirectoryImageSources(
  pokemonId: number,
  sprites: PokemonForm['sprites'],
  preferShiny: boolean,
): PokemonFormArtworkSource[] {
  const hasValidPokemonId = Number.isInteger(pokemonId) && pokemonId > 0
  const formArtwork = officialArtworkForFormSprite(sprites.front_default)
  const shinyFormArtwork = officialArtworkForFormSprite(sprites.front_shiny)
  const normalSources: (PokemonFormArtworkSource | null)[] = [
    formArtwork ? { url: formArtwork, shiny: false, sprite: false } : null,
    hasValidPokemonId ? { url: pokemonArtwork(pokemonId), shiny: false, sprite: false } : null,
    sprites.front_default ? { url: sprites.front_default, shiny: false, sprite: true } : null,
  ]
  const shinySources: (PokemonFormArtworkSource | null)[] = [
    shinyFormArtwork ? { url: shinyFormArtwork, shiny: true, sprite: false } : null,
    hasValidPokemonId ? { url: pokemonArtwork(pokemonId, true), shiny: true, sprite: false } : null,
    sprites.front_shiny ? { url: sprites.front_shiny, shiny: true, sprite: true } : null,
  ]
  const candidates = preferShiny ? [...shinySources, ...normalSources] : normalSources
  const seen = new Set<string>()

  return candidates.filter((source): source is PokemonFormArtworkSource => {
    if (!source || seen.has(source.url)) return false
    seen.add(source.url)
    return true
  })
}

export function pokemonFormImageSources(pokemon: PokemonWithArtwork, form: FormWithArtwork | null) {
  const officialArtwork = pokemon.sprites.other?.['official-artwork']?.front_default
  const formSprite = form?.sprites.front_default
  const pokemonSprite = pokemon.sprites.front_default
  const hasDistinctAlternateForm = pokemon.forms.length > 1 && form?.is_default === false
  const candidates = hasDistinctAlternateForm
    ? [officialArtworkForFormSprite(formSprite), formSprite, officialArtwork, pokemonSprite]
    : [officialArtwork, formSprite, pokemonSprite]

  return candidates.filter((source, index): source is string => Boolean(source) && candidates.indexOf(source) === index)
}
