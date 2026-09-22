import { describe, expect, it } from 'vitest'
import type { Translate, TranslationKey } from '../../contexts/LanguageContext'
import type { EvolutionDetail } from '../../types'
import { evolutionCondition, evolutionConditions } from './EvolutionTree'

const labels: Partial<Record<TranslationKey, string>> = {
  'evolution.level': 'Nível {level}',
  'evolution.statsEqual': 'Ataque igual à Defesa',
  'evolution.beauty': 'Beleza {value}+',
  'evolution.multiplayer': 'Em sessão multijogador',
  'evolution.useMoveTimes': 'Usar {move} {count} vezes',
  'evolution.steps': 'Caminhar {count} passos',
  'evolution.damageTaken': 'Sofrer ao menos {amount} de dano',
  'evolution.special': 'Condição especial',
}

const t: Translate = (key, variables) => {
  let text = labels[key] ?? key
  Object.entries(variables ?? {}).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)) })
  return text
}

function evolutionDetail(overrides: Partial<EvolutionDetail> = {}): EvolutionDetail {
  return {
    item: null,
    trigger: { name: 'level-up', url: 'https://pokeapi.co/api/v2/evolution-trigger/1/' },
    gender: null,
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
    ...overrides,
  }
}

describe('evolutionCondition', () => {
  it('preserva a relação de atributos zero e condições clássicas', () => {
    expect(evolutionCondition(evolutionDetail({
      min_level: 20,
      min_beauty: 170,
      relative_physical_stats: 0,
    }), t)).toBe('Nível 20 · Beleza 170+ · Ataque igual à Defesa')
  })

  it('explica condições modernas combinadas retornadas pela API', () => {
    expect(evolutionCondition(evolutionDetail({
      needs_multiplayer: true,
      used_move: { name: 'rage-fist', url: 'https://pokeapi.co/api/v2/move/889/' },
      min_move_count: 20,
      min_steps: 1_000,
      min_damage_taken: 49,
    }), t)).toBe('Em sessão multijogador · Usar Rage Fist 20 vezes · Caminhar 1.000 passos · Sofrer ao menos 49 de dano')
  })

  it('remove alternativas repetidas sem esconder condições diferentes', () => {
    const level20 = evolutionDetail({ min_level: 20 })
    expect(evolutionConditions([level20, level20, evolutionDetail({ min_level: 30 })], t))
      .toEqual(['Nível 20', 'Nível 30'])
  })
})
