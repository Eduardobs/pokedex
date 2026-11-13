import type { EvolutionDetail, EvolutionNode } from '../types'
import { defaultPokemonNameForSpecies } from './pokemon-species'

// Regional varieties that participate in permanent evolution, excluding battle forms.
const regionalFamilies: Record<string, string[]> = {
  alola: [
    'rattata',
    'raticate',
    'raichu',
    'sandshrew',
    'sandslash',
    'vulpix',
    'ninetales',
    'diglett',
    'dugtrio',
    'meowth',
    'persian',
    'geodude',
    'graveler',
    'golem',
    'grimer',
    'muk',
    'exeggutor',
    'marowak',
  ],
  galar: [
    'meowth',
    'ponyta',
    'rapidash',
    'slowpoke',
    'slowbro',
    'slowking',
    'farfetchd',
    'weezing',
    'mr-mime',
    'corsola',
    'zigzagoon',
    'linoone',
    'darumaka',
    'darmanitan',
    'yamask',
  ],
  hisui: [
    'growlithe',
    'arcanine',
    'voltorb',
    'electrode',
    'typhlosion',
    'qwilfish',
    'sneasel',
    'samurott',
    'lilligant',
    'zorua',
    'zoroark',
    'braviary',
    'sliggoo',
    'goodra',
    'avalugg',
    'decidueye',
  ],
  paldea: ['wooper'],
}
const exclusiveParents: Record<string, string> = {
  'mr-rime': 'mr-mime-galar',
  perrserker: 'meowth-galar',
  sirfetchd: 'farfetchd-galar',
  cursola: 'corsola-galar',
  obstagoon: 'linoone-galar',
  runerigus: 'yamask-galar',
  sneasler: 'sneasel-hisui',
  overqwil: 'qwilfish-hisui',
  clodsire: 'wooper-paldea',
  basculegion: 'basculin-white-striped',
}
const genderVarieties = new Set(['meowstic', 'basculegion', 'oinkologne', 'pyroar', 'frillish', 'jellicent'])

function varieties(node: EvolutionNode): string[] {
  const name = node.species.name
  const result = [defaultPokemonNameForSpecies(name)]
  for (const [region, species] of Object.entries(regionalFamilies)) {
    if (species.includes(name)) result.push(`${name}-${region}${name === 'darmanitan' ? '-standard' : ''}`)
  }
  if (name === 'wormadam') result.push('wormadam-sandy', 'wormadam-trash')
  if (name === 'basculin') result.push('basculin-blue-striped', 'basculin-white-striped')
  for (const detail of node.evolution_details) {
    if (detail.evolved_pokemon_form) result.push(detail.evolved_pokemon_form.name)
  }
  for (const child of node.evolves_to) {
    for (const detail of child.evolution_details) {
      if (detail.required_pokemon_form && !(name === 'burmy' && detail.required_pokemon_form.name.startsWith('burmy-')))
        result.push(detail.required_pokemon_form.name)
    }
  }
  return [...new Set(result)]
}

const regionOf = (name: string) => name.match(/-(alola|galar|hisui|paldea)(?:-|$)/)?.[1]

function compatible(parent: string, child: string, species: string, detail?: EvolutionDetail) {
  if (parent === 'burmy' && species === 'wormadam' && detail?.required_pokemon_form?.name.startsWith('burmy-'))
    return child === detail.required_pokemon_form.name.replace('burmy-', 'wormadam-')
  if (detail?.required_pokemon_form) return detail.required_pokemon_form.name === parent
  if (exclusiveParents[species]) return exclusiveParents[species] === parent
  const parentRegion = regionOf(parent),
    childRegion = regionOf(child)
  if (parentRegion) return parentRegion === childRegion
  if (childRegion && regionalFamilies[childRegion].some((name) => defaultPokemonNameForSpecies(name) === parent))
    return false
  return true
}

/** Expand species into routable varieties before laying out their actual evolution edges. */
export function evolutionVarietyRoots(root: EvolutionNode): EvolutionNode[] {
  function expand(node: EvolutionNode, parent?: string, parentGender?: 1 | 2): EvolutionNode[] {
    const name = node.species.name
    const genders: (1 | 2 | undefined)[] =
      genderVarieties.has(name) ||
      node.evolves_to.some((child) => child.evolution_details.some((detail) => detail.gender))
        ? [2, 1]
        : [undefined]
    return varieties(node).flatMap((variety) =>
      genders.flatMap((gender) => {
        if (gender && parentGender && gender !== parentGender) return []
        const route = gender && genderVarieties.has(name) ? `${name}-${gender === 1 ? 'female' : 'male'}` : variety
        if (gender && genderVarieties.has(name) && variety !== defaultPokemonNameForSpecies(name)) return []
        const details = node.evolution_details.filter(
          (detail) =>
            (!detail.evolved_pokemon_form || detail.evolved_pokemon_form.name === route) &&
            (!gender || !detail.gender || detail.gender === gender) &&
            (!parentGender || !detail.gender || detail.gender === parentGender) &&
            (!parent || compatible(parent, route, name, detail)),
        )
        if (parent && !compatible(parent, route, name) && !details.length) return []
        if (parent && node.evolution_details.length && !details.length) return []
        return [
          {
            ...node,
            variety: route,
            evolution_gender: gender,
            evolution_details: details.map((detail) => ({
              ...detail,
              gender: gender ?? detail.gender,
              required_pokemon_form:
                detail.required_pokemon_form ??
                (parent === 'burmy' && name === 'wormadam'
                  ? { name: route.replace('wormadam-', 'burmy-'), url: '' }
                  : null),
              region:
                detail.region ??
                (parent && regionOf(route) && !regionOf(parent) ? { name: regionOf(route)!, url: '' } : null),
            })),
            evolves_to: node.evolves_to.flatMap((child) => expand(child, route, gender)),
          },
        ]
      }),
    )
  }
  return expand(root)
}
