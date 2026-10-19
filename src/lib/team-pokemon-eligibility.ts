// The Pokémon directory includes ride-only forms and an unobtainable boss form.
// Do not use is_default or is_battle_only: those also exclude playable alternate
// forms and transformations such as Mega Evolution and Gigantamax.
const NON_PLAYABLE_FORMS = new Set([
  'koraidon-limited-build',
  'koraidon-sprinting-build',
  'koraidon-swimming-build',
  'koraidon-gliding-build',
  'miraidon-low-power-mode',
  'miraidon-drive-mode',
  'miraidon-aquatic-mode',
  'miraidon-glide-mode',
  'eternatus-eternamax',
])

export function isTeamPokemonEligible(name: string): boolean {
  return !NON_PLAYABLE_FORMS.has(name)
}
