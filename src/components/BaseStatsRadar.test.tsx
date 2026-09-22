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

it('exibe somente os atributos base no radar', () => {
  const { container } = render(
    <BaseStatsRadar
      stats={stats}
      statNames={{ hp: 'HP', attack: 'Ataque' }}
      label="Atributos base"
      baseLabel="Base"
    />,
  )

  expect(screen.getByRole('img', { name: /Atributos base/ })).toBeInTheDocument()
  expect(container.querySelector('desc')).toHaveTextContent(/HP: Base 45/)
  expect(container.querySelector('.radar-area')).toBeInTheDocument()
  expect(container.querySelector('.radar-level-100-band')).not.toBeInTheDocument()
  expect(screen.queryByText('Nível 100')).not.toBeInTheDocument()
  expect(screen.queryByText('200–294')).not.toBeInTheDocument()
})

it('organiza os atributos na ordem definida para o radar', () => {
  const { container } = render(
    <BaseStatsRadar
      stats={stats}
      statNames={{
        hp: 'HP',
        attack: 'Ataque',
        defense: 'Defesa',
        speed: 'Velocidade',
        'special-attack': 'Atq. Especial',
        'special-defense': 'Def. Especial',
      }}
      label="Atributos base"
      baseLabel="Base"
    />,
  )

  const labels = [...container.querySelectorAll('.radar-labels text')].map(
    (element) => element.firstElementChild?.textContent,
  )

  expect(labels).toEqual(['HP', 'Ataque', 'Defesa', 'Velocidade', 'Def. Especial', 'Atq. Especial'])
})
