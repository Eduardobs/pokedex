import { describe, expect, it } from 'vitest'
import { createRandomTeam, selectRandomBattlePokemon } from './random-team'
import { competitiveFormats, natureNames, teraTypes, validTeams, type TeamPokemon } from './teams'

const catalog: Record<string, Omit<TeamPokemon, 'name' | 'id' | 'species'>> = {
  venusaur: {
    stats: [80, 82, 83, 100, 100, 80],
    types: ['grass', 'poison'],
    abilities: ['chlorophyll', 'overgrow'],
    moves: [
      'giga-drain',
      'leech-seed',
      'sleep-powder',
      'sludge-bomb',
      'substitute',
      'earth-power',
      'energy-ball',
      'knock-off',
    ],
  },
  charizard: {
    stats: [78, 84, 78, 109, 85, 100],
    types: ['fire', 'flying'],
    abilities: ['blaze'],
    moves: [
      'earthquake',
      'flamethrower',
      'focus-blast',
      'hurricane',
      'will-o-wisp',
      'dragon-dance',
      'flare-blitz',
      'outrage',
      'swords-dance',
    ],
  },
  blastoise: {
    stats: [79, 83, 100, 85, 105, 78],
    types: ['water'],
    abilities: ['torrent'],
    moves: ['earthquake', 'hydro-pump', 'ice-beam', 'shell-smash', 'tera-blast'],
  },
  arbok: {
    stats: [60, 95, 69, 65, 79, 80],
    types: ['poison'],
    abilities: ['intimidate'],
    moves: ['earthquake', 'glare', 'gunk-shot', 'knock-off', 'sucker-punch', 'toxic-spikes', 'coil', 'trailblaze'],
  },
  pikachu: {
    stats: [35, 55, 40, 50, 50, 90],
    types: ['electric'],
    abilities: ['lightning-rod'],
    moves: ['fake-out', 'knock-off', 'play-rough', 'surf', 'volt-switch', 'volt-tackle'],
  },
  raichu: {
    stats: [60, 90, 55, 90, 80, 110],
    types: ['electric'],
    abilities: ['lightning-rod'],
    moves: [
      'alluring-voice',
      'encore',
      'focus-blast',
      'grass-knot',
      'knock-off',
      'nasty-plot',
      'nuzzle',
      'surf',
      'thunderbolt',
      'volt-switch',
      'tera-blast',
    ],
  },
}

const pokemon = (name: keyof typeof catalog): TeamPokemon => ({
  name,
  id: Object.keys(catalog).indexOf(name) + 1,
  species: name,
  genderRate: name === 'pikachu' ? -1 : 4,
  ...catalog[name],
})

const compatiblePokemon = () => Object.keys(catalog).map((name) => pokemon(name as keyof typeof catalog))

describe('random teams', () => {
  it('translates a curated Random Battle set into every existing team-member property', () => {
    const team = createRandomTeam('Random team 1', compatiblePokemon(), () => 0.4)

    expect(validTeams([team])).toBe(true)
    expect(team.competitiveFormat).toSatisfy((format) => competitiveFormats.includes(format!))
    expect(team.members).toHaveLength(6)
    expect(new Set(team.members.map((member) => member.pokemon))).toHaveLength(6)
    expect(team.members.find((member) => member.pokemon === 'pikachu')).toMatchObject({
      level: 93,
      friendship: 255,
      item: 'light-ball',
      evs: [85, 85, 85, 85, 85, 85],
      ivs: [31, 31, 31, 31, 31, 31],
      gender: 'none',
    })
    for (const member of team.members) {
      expect(member.level).toBeGreaterThanOrEqual(1)
      expect(member.level).toBeLessThanOrEqual(100)
      expect(member.shiny).toBe(false)
      expect(['male', 'female', 'none']).toContain(member.gender)
      expect(teraTypes).toContain(member.tera)
      expect(natureNames).toContain(member.nature)
      expect(member.moves).toHaveLength(4)
      expect(new Set(member.moves)).toHaveLength(4)
      expect(member.evs.reduce((sum, value) => sum + value, 0)).toBe(510)
    }
  })

  it('applies the Random Battle species, type, and weakness composition limits', () => {
    const selected = selectRandomBattlePokemon(compatiblePokemon(), () => 0)

    expect(selected).toHaveLength(6)
    expect(new Set(selected.map((entry) => entry.species))).toHaveLength(6)
    expect(selected.filter((entry) => entry.types.includes('electric'))).toHaveLength(2)
    expect(selected.filter((entry) => entry.types.includes('ground'))).toHaveLength(0)
  })

  it('rejects duplicate or unsupported Pokémon rather than creating an incomplete team', () => {
    expect(() =>
      createRandomTeam(
        'Random team',
        Array.from({ length: 6 }, () => pokemon('pikachu')),
      ),
    ).toThrow('six distinct species')
    expect(() =>
      createRandomTeam(
        'Random team',
        compatiblePokemon().map((entry) => ({ ...entry, moves: [] })),
      ),
    ).toThrow('Cannot choose from an empty collection.')
  })
})
