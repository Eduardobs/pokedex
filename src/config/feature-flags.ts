export function featureFlag(defaultEnabled: boolean, value: string | undefined) {
  if (value === undefined) return defaultEnabled
  return value.trim().toLowerCase() !== 'false'
}

export const FEATURE_FLAGS = {
  mapGenieIntegration: featureFlag(true, import.meta.env.VITE_FEATURE_MAPGENIE_INTEGRATION),
  pokemon3D: featureFlag(true, import.meta.env.VITE_FEATURE_POKEMON_3D),
  battle: featureFlag(true, import.meta.env.VITE_FEATURE_BATTLE),
} as const
