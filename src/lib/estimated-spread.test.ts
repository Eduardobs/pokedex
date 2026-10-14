import { describe, expect, it } from 'vitest'
import { estimateSpread, hasEnoughMoves, parseEstimatedMove, type EstimatedMove } from './estimated-spread'
import { newMember, type TeamPokemon } from './teams'

const pokemon = (name: string, stats: TeamPokemon['stats'], types: string[]): TeamPokemon => ({
  name,
  id: 1,
  species: name,
  stats,
  types,
  abilities: ['intimidate'],
  moves: [],
})

const move = (
  name: string,
  category: EstimatedMove['category'],
  options: Partial<EstimatedMove> = {},
): EstimatedMove => ({
  name,
  category,
  selfTarget: false,
  healing: false,
  ...options,
})

describe('Showdown-style estimated spreads', () => {
  it('parses only the move fields used by the estimator', () => {
    expect(
      parseEstimatedMove({
        name: 'recover',
        damage_class: { name: 'status', url: 'https://pokeapi.co/api/v2/move-damage-class/1/' },
        target: { name: 'user', url: 'https://pokeapi.co/api/v2/move-target/1/' },
        meta: { healing: 50 },
      }),
    ).toEqual({ name: 'recover', category: 'status', selfTarget: true, healing: true })
    expect(() =>
      parseEstimatedMove({
        name: 'invalid',
        damage_class: { name: 'unknown', url: 'https://pokeapi.co/api/v2/move-damage-class/1/' },
        target: { name: 'user', url: 'https://pokeapi.co/api/v2/move-target/1/' },
        meta: {},
      }),
    ).toThrow()
  })

  it('waits for four moves except for the same reduced-moveset cases as Showdown', () => {
    expect(hasEnoughMoves('pikachu', ['thunderbolt', '', '', ''])).toBe(false)
    expect(hasEnoughMoves('pikachu', ['last-resort', '', '', ''])).toBe(true)
    expect(hasEnoughMoves('ditto', ['transform', '', '', ''])).toBe(true)
    expect(hasEnoughMoves('unown', ['hidden-power', '', '', ''])).toBe(true)
  })

  it('estimates a fast Choice Band attacker and applies a matching Jolly nature', () => {
    const arcanine = pokemon('arcanine', [90, 110, 80, 100, 80, 95], ['fire'])
    const member = {
      ...newMember(arcanine),
      ability: 'intimidate',
      item: 'choice-band',
      moves: ['flare-blitz', 'close-combat', 'wild-charge', 'extreme-speed'],
    }
    const result = estimateSpread(
      arcanine,
      member,
      member.moves.map((name) => move(name, 'physical')),
    )

    expect(result).toMatchObject({
      role: 'fastBand',
      evs: [4, 252, 0, 0, 0, 252],
      nature: 'jolly',
      plusStat: 'spe',
      minusStat: 'spa',
    })
  })

  it('uses recovery, status pressure and bulk to estimate a physical wall', () => {
    const toxapex = pokemon('toxapex', [50, 63, 152, 53, 142, 35], ['water', 'poison'])
    const member = {
      ...newMember(toxapex),
      ability: 'regenerator',
      item: 'black-sludge',
      moves: ['recover', 'toxic', 'scald', 'haze'],
    }
    const moves = [
      move('recover', 'status', { selfTarget: true, healing: true }),
      move('toxic', 'status'),
      move('scald', 'special'),
      move('haze', 'status'),
    ]
    const result = estimateSpread(toxapex, member, moves)

    expect(result).toMatchObject({
      role: 'physicallyDefensive',
      evs: [252, 0, 252, 0, 4, 0],
      nature: 'bold',
      plusStat: 'def',
      minusStat: 'atk',
    })
  })

  it('matches Showdown for fast special, setup, and reduced-moveset builds', () => {
    const alakazam = pokemon('alakazam', [55, 50, 45, 135, 95, 120], ['psychic'])
    const alakazamMember = {
      ...newMember(alakazam),
      ability: 'magic-guard',
      item: 'life-orb',
      moves: ['psychic', 'focus-blast', 'shadow-ball', 'dazzling-gleam'],
    }
    expect(
      estimateSpread(
        alakazam,
        alakazamMember,
        alakazamMember.moves.map((name) => move(name, 'special')),
      ),
    ).toMatchObject({
      role: 'fastSpecialSweeper',
      evs: [4, 0, 0, 252, 0, 252],
      nature: 'timid',
    })

    const dragonite = pokemon('dragonite', [91, 134, 95, 100, 100, 80], ['dragon', 'flying'])
    const dragoniteMember = {
      ...newMember(dragonite),
      ability: 'multiscale',
      item: 'lum-berry',
      moves: ['dragon-dance', 'extreme-speed', 'earthquake', 'fire-punch'],
    }
    expect(
      estimateSpread(dragonite, dragoniteMember, [
        move('dragon-dance', 'status', { selfTarget: true }),
        move('extreme-speed', 'physical'),
        move('earthquake', 'physical'),
        move('fire-punch', 'physical'),
      ]),
    ).toMatchObject({
      role: 'fastPhysicalSweeper',
      evs: [0, 252, 0, 0, 4, 252],
      nature: 'adamant',
    })

    const ditto = pokemon('ditto', [48, 48, 48, 48, 48, 48], ['normal'])
    const dittoMember = {
      ...newMember(ditto),
      ability: 'imposter',
      item: 'choice-scarf',
      moves: ['transform', '', '', ''],
    }
    expect(estimateSpread(ditto, dittoMember, [move('transform', 'status')])).toMatchObject({
      role: 'physicallyDefensive',
      evs: [248, 0, 252, 0, 8, 0],
      nature: 'bold',
    })
  })
})
