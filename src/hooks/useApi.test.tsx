import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../lib/api'
import { useApi } from './useApi'

vi.mock('../lib/api', () => ({ apiFetch: vi.fn() }))

const apiFetchMock = vi.mocked(apiFetch)

type PokemonSummary = { name: string }
type Snapshot = { path: string; data: PokemonSummary | null; loading: boolean }

function Probe({ path, snapshots }: { path: string; snapshots: Snapshot[] }) {
  const { data, loading } = useApi<PokemonSummary>(path)
  snapshots.push({ path, data, loading })
  return null
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useApi', () => {
  it('does not expose data from the previous path during navigation', async () => {
    let resolveFirst: ((value: PokemonSummary) => void) | undefined
    apiFetchMock.mockImplementation((path) => {
      if (path === 'pokemon/bulbasaur') {
        return new Promise((resolve) => { resolveFirst = resolve })
      }
      return new Promise(() => undefined)
    })
    const snapshots: Snapshot[] = []
    const view = render(<Probe path="pokemon/bulbasaur" snapshots={snapshots} />)

    await act(async () => resolveFirst?.({ name: 'bulbasaur' }))
    await waitFor(() => expect(snapshots.at(-1)?.data?.name).toBe('bulbasaur'))

    snapshots.length = 0
    view.rerender(<Probe path="pokemon/ivysaur" snapshots={snapshots} />)

    expect(snapshots[0]).toEqual({ path: 'pokemon/ivysaur', data: null, loading: true })
  })
})
