import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext'
import { apiFetch } from '../../lib/api'
import type { EvolutionNode } from '../../types'
import { EvolutionFlow } from './EvolutionFlow'

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}))
const node = (name: string, id: number, children: EvolutionNode[] = []): EvolutionNode => ({
  species: { name, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
  is_baby: false,
  evolution_details: [],
  evolves_to: children,
})
const pokemon = (id: number, names: string[]) => ({
  id,
  types: names.map((name, index) => ({ slot: index + 1, type: { name } })),
})
function Flow({ root }: { root: EvolutionNode }) {
  const { t, language } = useLanguage()
  return <EvolutionFlow node={root} t={t} language={language} />
}
function renderFlow(root: EvolutionNode) {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <Flow root={root} />
      </MemoryRouter>
    </LanguageProvider>,
  )
}
afterEach(() => vi.resetAllMocks())

describe('evolution node types', () => {
  it('uses each variety’s types instead of copying the default species types', async () => {
    const resources: Record<string, ReturnType<typeof pokemon>> = {
      'pokemon/mime-jr': pokemon(439, ['psychic', 'fairy']),
      'pokemon/mr-mime': pokemon(122, ['psychic', 'fairy']),
      'pokemon/mr-mime-galar': pokemon(10168, ['ice', 'psychic']),
      'pokemon/mr-rime': pokemon(866, ['ice', 'psychic']),
    }
    vi.mocked(apiFetch).mockImplementation(async (path) => resources[path])
    renderFlow(node('mime-jr', 439, [node('mr-mime', 122, [node('mr-rime', 866)])]))
    const regional = screen.getByRole('link', { name: /Mr Mime.*Galar/ })
    expect(await within(regional).findByText('Gelo')).toBeInTheDocument()
    expect(within(regional).getByText('Psíquico')).toBeInTheDocument()
    expect(within(regional).queryByText('Fada')).not.toBeInTheDocument()
    const ordinary = screen
      .getAllByRole('link', { name: /Mr Mime/ })
      .find((link) => link.getAttribute('href') === '/pokemon/mr-mime')!
    expect(await within(ordinary).findByText('Fada')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Mime Jr/ })).getByText('Psíquico')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Mr Rime/ })).getByText('Gelo')).toBeInTheDocument()
  })
  it('keeps the evolution node available while types load or fail', async () => {
    let rejectRequest: (reason: Error) => void = () => {}
    vi.mocked(apiFetch).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject
        }),
    )
    renderFlow(node('eevee', 133))
    const link = screen.getByRole('link', { name: /Eevee/ })
    expect(within(link).getByRole('group', { name: 'Tipos' })).toHaveAttribute('aria-busy', 'true')
    rejectRequest(new Error('Unavailable'))
    expect(await within(link).findByText('Tipos indisponíveis')).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/pokemon/eevee')
  })
})
