import type { Pokemon, PokemonForm } from '../types'

const SPRITES_ORIGIN = 'https://raw.githubusercontent.com'
const FORM_SPRITES_PATH = '/PokeAPI/sprites/master/sprites/pokemon/'
const OFFICIAL_ARTWORK_PATH = `${FORM_SPRITES_PATH}other/official-artwork/`
const FORM_SPRITE_FILENAME = /^[1-9]\d*(?:-[a-z0-9]+)*\.png$/

type PokemonWithArtwork = Pick<Pokemon, 'forms' | 'sprites'>
type FormWithArtwork = Pick<PokemonForm, 'is_default' | 'sprites'>

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

    const filename = parsed.pathname.slice(FORM_SPRITES_PATH.length)
    if (!FORM_SPRITE_FILENAME.test(filename)) return null

    return `${SPRITES_ORIGIN}${OFFICIAL_ARTWORK_PATH}${filename}`
  } catch {
    return null
  }
}

export function pokemonFormImageSources(pokemon: PokemonWithArtwork, form: FormWithArtwork | null) {
  const officialArtwork = pokemon.sprites.other?.['official-artwork']?.front_default
  const formSprite = form?.sprites.front_default
  const pokemonSprite = pokemon.sprites.front_default
  const hasDistinctAlternateForm = pokemon.forms.length > 1 && form?.is_default === false
  const candidates = hasDistinctAlternateForm
    ? [officialArtworkForFormSprite(formSprite), formSprite, officialArtwork, pokemonSprite]
    : [officialArtwork, formSprite, pokemonSprite]

  return candidates.filter(
    (source, index): source is string => Boolean(source) && candidates.indexOf(source) === index,
  )
}
