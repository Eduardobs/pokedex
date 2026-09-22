import { describe, expect, it } from 'vitest'
import { level100StatRange } from './pokemon-stats'

describe('atributos no nível 100', () => {
  it('calcula a faixa de HP possível', () => {
    expect(level100StatRange(45, 'hp', 'bulbasaur')).toEqual({ minimum: 200, maximum: 294 })
  })

  it('considera IVs, EVs e naturezas nos demais atributos', () => {
    expect(level100StatRange(49, 'attack', 'bulbasaur')).toEqual({ minimum: 92, maximum: 216 })
    expect(level100StatRange(65, 'special-attack', 'bulbasaur')).toEqual({
      minimum: 121,
      maximum: 251,
    })
  })

  it('mantém o HP de Shedinja em 1', () => {
    expect(level100StatRange(1, 'hp', 'shedinja')).toEqual({ minimum: 1, maximum: 1 })
  })
})
