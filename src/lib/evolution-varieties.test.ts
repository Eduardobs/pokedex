import { describe, expect, it } from 'vitest'
import type { EvolutionDetail, EvolutionNode } from '../types'
import { evolutionVarietyRoots } from './evolution-varieties'

function node(name: string, children: EvolutionNode[] = [], details: EvolutionDetail[] = []): EvolutionNode {
  return {
    species: { name, url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
    is_baby: false,
    evolution_details: details,
    evolves_to: children,
  }
}
const genderDetail = (gender: 1 | 2): EvolutionDetail => ({
  gender,
  trigger: null,
  item: null,
  held_item: null,
  known_move: null,
  known_move_type: null,
  location: null,
  min_level: null,
  min_happiness: null,
  min_beauty: null,
  min_affection: null,
  near_special_rock: false,
  needs_overworld_rain: false,
  party_species: null,
  party_type: null,
  relative_physical_stats: null,
  time_of_day: '',
  trade_species: null,
  turn_upside_down: false,
})

describe('evolutionVarietyRoots', () => {
  it('branches Mime Jr into both Mr Mime forms and only connects Galar to Mr Rime', () => {
    const [root] = evolutionVarietyRoots(node('mime-jr', [node('mr-mime', [node('mr-rime')])]))
    expect(root.evolves_to.map((child) => [child.variety, child.evolves_to.map((next) => next.variety)])).toEqual([
      ['mr-mime', []],
      ['mr-mime-galar', ['mr-rime']],
    ])
  })
  it.each([
    ['meowth', 'perrserker', 'meowth-galar'],
    ['corsola', 'cursola', 'corsola-galar'],
    ['farfetchd', 'sirfetchd', 'farfetchd-galar'],
    ['yamask', 'runerigus', 'yamask-galar'],
    ['sneasel', 'sneasler', 'sneasel-hisui'],
    ['qwilfish', 'overqwil', 'qwilfish-hisui'],
    ['wooper', 'clodsire', 'wooper-paldea'],
    ['basculin', 'basculegion', 'basculin-white-striped'],
  ])('restricts %s → %s to %s', (parent, child, variety) => {
    const roots = evolutionVarietyRoots(node(parent, [node(child)]))
    expect(roots.filter((root) => root.evolves_to.length).map((root) => root.variety)).toEqual([variety])
  })
  it('keeps regional lines separate across multiple stages', () => {
    const roots = evolutionVarietyRoots(node('zigzagoon', [node('linoone', [node('obstagoon')])]))
    expect(roots[0].evolves_to[0].evolves_to).toEqual([])
    expect(roots[1].evolves_to[0].variety).toBe('linoone-galar')
    expect(roots[1].evolves_to[0].evolves_to[0].variety).toBe('obstagoon')
  })
  it('keeps male Combee terminal and only connects female Combee to Vespiquen', () => {
    const roots = evolutionVarietyRoots(node('combee', [node('vespiquen', [], [genderDetail(1)])]))
    expect(roots.map((root) => [root.evolution_gender, root.evolves_to.length])).toEqual([
      [2, 0],
      [1, 1],
    ])
  })
  it('preserves Gardevoir for both genders while restricting Gallade to male Kirlia', () => {
    const roots = evolutionVarietyRoots(node('kirlia', [node('gardevoir'), node('gallade', [], [genderDetail(2)])]))
    expect(roots.map((root) => root.evolves_to.map((child) => child.variety))).toEqual([
      ['gardevoir', 'gallade'],
      ['gardevoir'],
    ])
  })
  it('uses separate routable gender varieties', () => {
    const [root] = evolutionVarietyRoots(node('espurr', [node('meowstic')]))
    expect(root.evolves_to.map((child) => child.variety)).toEqual(['meowstic-male', 'meowstic-female'])
  })
  it('preserves gender between distinct varieties in the same line', () => {
    const roots = evolutionVarietyRoots(node('frillish', [node('jellicent')]))
    expect(roots.map((root) => [root.variety, root.evolves_to.map((child) => child.variety)])).toEqual([
      ['frillish-male', ['jellicent-male']],
      ['frillish-female', ['jellicent-female']],
    ])
  })
  it('shows all three Wormadam cloaks only under female Burmy', () => {
    const roots = evolutionVarietyRoots(
      node('burmy', [node('wormadam', [], [genderDetail(1)]), node('mothim', [], [genderDetail(2)])]),
    )
    expect(roots[0].evolves_to.map((child) => child.variety)).toEqual(['mothim'])
    expect(roots[1].evolves_to.map((child) => child.variety)).toEqual([
      'wormadam-plant',
      'wormadam-sandy',
      'wormadam-trash',
    ])
    expect(roots[1].evolves_to.map((child) => child.evolution_details[0].required_pokemon_form?.name)).toEqual([
      'burmy-plant',
      'burmy-sandy',
      'burmy-trash',
    ])
  })
  it('matches explicit Burmy cloak requirements without creating invalid Pokémon routes', () => {
    const details = ['plant', 'sandy', 'trash'].map((cloak) => ({
      ...genderDetail(1),
      required_pokemon_form: { name: `burmy-${cloak}`, url: '' },
      evolved_pokemon_form: { name: `wormadam-${cloak}`, url: '' },
    }))
    const roots = evolutionVarietyRoots(
      node('burmy', [node('wormadam', [], details), node('mothim', [], [genderDetail(2)])]),
    )
    expect(roots).toHaveLength(2)
    expect(roots[1].variety).toBe('burmy')
    expect(roots[1].evolves_to.map((child) => [child.variety, child.evolution_details.length])).toEqual([
      ['wormadam-plant', 1],
      ['wormadam-sandy', 1],
      ['wormadam-trash', 1],
    ])
  })
  it('keeps both genders of White-Striped Basculin connected to their matching Basculegion', () => {
    const roots = evolutionVarietyRoots(node('basculin', [node('basculegion', [], [genderDetail(2), genderDetail(1)])]))
    expect(
      roots.filter((root) => root.variety !== 'basculin-white-striped').every((root) => root.evolves_to.length === 0),
    ).toBe(true)
    expect(
      roots
        .filter((root) => root.variety === 'basculin-white-striped')
        .map((root) => [root.evolution_gender, root.evolves_to.map((child) => child.variety)]),
    ).toEqual([
      [2, ['basculegion-male']],
      [1, ['basculegion-female']],
    ])
  })
})
