import { describe, expect, it } from 'vitest'
import type { EvolutionNode } from '../types'
import { layoutEvolutionFlow } from './evolution-flow'
const node = (name: string, evolves_to: EvolutionNode[] = []): EvolutionNode => ({
  species: { name, url: `https://pokeapi.co/api/v2/pokemon-species/${name}/` },
  evolves_to,
  evolution_details: [],
  is_baby: false,
})
const family = node('oddish', [node('gloom', [node('vileplume'), node('bellossom')])])

describe('evolution flow geometry', () => {
  it.each([true, false])('connects children to their actual parent in vertical=%s mode', (vertical) => {
    const flow = layoutEvolutionFlow(family, { vertical, width: 256 })
    const name = (key: string) => flow.nodes.find((entry) => entry.key === key)!.node.species.name
    expect(flow.edges.map((edge) => [name(edge.from), name(edge.to)])).toEqual([
      ['oddish', 'gloom'],
      ['gloom', 'vileplume'],
      ['gloom', 'bellossom'],
    ])
    expect(
      flow.nodes.every(({ box, label }) =>
        [box, ...(label ? [label] : [])].every(
          (rectangle) =>
            rectangle.x >= 0 &&
            rectangle.y >= 0 &&
            rectangle.x + rectangle.width <= flow.width &&
            rectangle.y + rectangle.height <= flow.height,
        ),
      ),
    ).toBe(true)
  })

  it('reserves room for long requirements and changing node heights without overlapping sibling labels', () => {
    const flow = layoutEvolutionFlow(family, {
      vertical: false,
      width: 1200,
      measurements: { '0.0.0': { node: 180, label: 300 }, '0.0.1': { node: 160, label: 80 } },
    })
    const first = flow.nodes.find((entry) => entry.node.species.name === 'vileplume')!
    const second = flow.nodes.find((entry) => entry.node.species.name === 'bellossom')!
    expect(first.label!.y + first.label!.height).toBeLessThan(second.label!.y)
    expect(first.box.y + first.box.height).toBeLessThan(second.box.y)
  })

  it('keeps an eight-way mobile split within the viewport and gives each branch its own edge', () => {
    const flow = layoutEvolutionFlow(
      node(
        'eevee',
        Array.from({ length: 8 }, (_, i) => node(`outcome-${i}`)),
      ),
      { vertical: true, width: 232 },
    )
    expect(flow.edges).toHaveLength(8)
    expect(new Set(flow.edges.map((edge) => edge.from))).toEqual(new Set(['0']))
    expect(flow.width).toBe(232)
    const children = flow.nodes.slice(1)
    children.forEach((child, index) => {
      if (index > 0) expect(children[index - 1].box.y + children[index - 1].box.height).toBeLessThan(child.label!.y)
    })
  })
})
