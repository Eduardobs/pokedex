/** Only public Pokemon media in the expected repositories may come from API payloads. */
export function safePokemonMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    return url.origin === 'https://raw.githubusercontent.com' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (/^\/PokeAPI\/sprites\/.+\.(png|gif|svg)$/.test(url.pathname) || /^\/PokeAPI\/cries\/.+\.ogg$/.test(url.pathname))
      ? url.href
      : null
  } catch {
    return null
  }
}
