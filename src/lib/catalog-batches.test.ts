import { describe, expect, it, vi } from 'vitest'
import { fetchCatalogBatches } from './catalog-batches'

describe('fetchCatalogBatches', () => {
  it('loads every entry with at most four concurrent validated pages', async () => {
    let active = 0
    let maximum = 0
    const fetchPage = vi.fn(async (ids: number[]) => {
      active++
      maximum = Math.max(maximum, active)
      await Promise.resolve()
      active--
      return Object.fromEntries(ids.map((id) => [String(id), id]))
    })
    const result = await fetchCatalogBatches(
      Array.from({ length: 201 }, (_, i) => i + 1),
      fetchPage,
      new AbortController().signal,
    )
    expect(Object.keys(result)).toHaveLength(201)
    expect(fetchPage.mock.calls.map(([ids]) => ids.length)).toEqual([40, 40, 40, 40, 40, 1])
    expect(maximum).toBe(4)
  })
  it('stops scheduling pages after cancellation', async () => {
    const controller = new AbortController()
    const fetchPage = vi.fn(async () => {
      controller.abort()
      return { entry: 1 }
    })
    await expect(
      fetchCatalogBatches(
        Array.from({ length: 200 }, (_, i) => i),
        fetchPage,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchPage).toHaveBeenCalledTimes(4)
  })
  it('aborts sibling requests after failure', async () => {
    const signals: AbortSignal[] = []
    await expect(
      fetchCatalogBatches(
        Array.from({ length: 41 }, (_, i) => i + 1),
        async (_ids, signal) => {
          signals.push(signal)
          throw new Error('Unavailable')
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow('Unavailable')
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
