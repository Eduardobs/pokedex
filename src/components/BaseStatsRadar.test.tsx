import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { BaseStatsRadar } from './BaseStatsRadar'

const stats = [
  { base_stat: 45, stat: { name: 'hp' } },
  { base_stat: 49, stat: { name: 'attack' } },
  { base_stat: 49, stat: { name: 'defense' } },
  { base_stat: 65, stat: { name: 'special-attack' } },
  { base_stat: 65, stat: { name: 'special-defense' } },
  { base_stat: 45, stat: { name: 'speed' } },
]

it('exibe os atributos base e a faixa do nível 100 no radar', () => {
  const { container } = render(<BaseStatsRadar
    stats={stats}
    statNames={{ hp: 'HP', attack: 'Ataque' }}
    label="Atributos base"
    baseLabel="Base"
    level100Label="Nível 100"
    pokemonName="bulbasaur"
  />)

  expect(screen.getByRole('img', { name: /Atributos base/ })).toBeInTheDocument()
  expect(container.querySelector('desc')).toHaveTextContent(/Nível 100 200–294/)
  expect(container.querySelector('.radar-level-100-band')).toBeInTheDocument()
  expect(screen.getByText('200–294')).toBeInTheDocument()
})
