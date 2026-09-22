const MAX_CAPTURE_RATE = 255

const POKEMON_COLOR_HEX: Record<string, string> = {
  black: '#30343b',
  blue: '#4a90d9',
  brown: '#9a6a43',
  gray: '#8b929a',
  green: '#55a868',
  pink: '#e889ad',
  purple: '#8e5bb7',
  red: '#d94a4a',
  white: '#f4f4f0',
  yellow: '#e5b934',
}

export function captureRatePercentage(captureRate: number) {
  return Math.min(MAX_CAPTURE_RATE, Math.max(0, captureRate)) / MAX_CAPTURE_RATE * 100
}

export function pokemonColorHex(color: string) {
  return POKEMON_COLOR_HEX[color] ?? POKEMON_COLOR_HEX.gray
}
