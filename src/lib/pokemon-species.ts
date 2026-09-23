const MAX_CAPTURE_RATE = 255

// Evolution chains identify species, while detail routes identify Pokémon
// varieties. Most names match, but these species use a suffixed default variety.
const DEFAULT_VARIETY_BY_SPECIES: Readonly<Record<string, string>> = {
  deoxys: 'deoxys-normal',
  wormadam: 'wormadam-plant',
  giratina: 'giratina-altered',
  shaymin: 'shaymin-land',
  basculin: 'basculin-red-striped',
  darmanitan: 'darmanitan-standard',
  frillish: 'frillish-male',
  jellicent: 'jellicent-male',
  tornadus: 'tornadus-incarnate',
  thundurus: 'thundurus-incarnate',
  landorus: 'landorus-incarnate',
  keldeo: 'keldeo-ordinary',
  meloetta: 'meloetta-aria',
  pyroar: 'pyroar-male',
  meowstic: 'meowstic-male',
  aegislash: 'aegislash-shield',
  pumpkaboo: 'pumpkaboo-average',
  gourgeist: 'gourgeist-average',
  zygarde: 'zygarde-50',
  oricorio: 'oricorio-baile',
  lycanroc: 'lycanroc-midday',
  wishiwashi: 'wishiwashi-solo',
  minior: 'minior-red-meteor',
  mimikyu: 'mimikyu-disguised',
  toxtricity: 'toxtricity-amped',
  eiscue: 'eiscue-ice',
  indeedee: 'indeedee-male',
  morpeko: 'morpeko-full-belly',
  urshifu: 'urshifu-single-strike',
  basculegion: 'basculegion-male',
  enamorus: 'enamorus-incarnate',
  oinkologne: 'oinkologne-male',
  maushold: 'maushold-family-of-four',
  squawkabilly: 'squawkabilly-green-plumage',
  palafin: 'palafin-zero',
  tatsugiri: 'tatsugiri-curly',
  dudunsparce: 'dudunsparce-two-segment',
}

const FEMALE_VARIETY_BY_SPECIES: Readonly<Record<string, { name: string; artworkId: number }>> = {
  meowstic: { name: 'meowstic-female', artworkId: 10025 },
  basculegion: { name: 'basculegion-female', artworkId: 10248 },
  oinkologne: { name: 'oinkologne-female', artworkId: 10254 },
}

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
  return (Math.min(MAX_CAPTURE_RATE, Math.max(0, captureRate)) / MAX_CAPTURE_RATE) * 100
}

export function pokemonColorHex(color: string) {
  return POKEMON_COLOR_HEX[color] ?? POKEMON_COLOR_HEX.gray
}

export function defaultPokemonNameForSpecies(speciesName: string) {
  return DEFAULT_VARIETY_BY_SPECIES[speciesName] ?? speciesName
}

export function pokemonVariantForSpeciesGender(
  speciesName: string,
  speciesId: number,
  gender?: 'female' | 'male',
) {
  const femaleVariety = gender === 'female' ? FEMALE_VARIETY_BY_SPECIES[speciesName] : undefined
  return (
    femaleVariety ?? {
      name: defaultPokemonNameForSpecies(speciesName),
      artworkId: speciesId,
    }
  )
}
