import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client'
import { parseMoveListDetails } from './move-catalog'

const movePayload = {
  data: {
    move: [
      {
        id: 85,
        name: 'thunderbolt',
        accuracy: 100,
        power: 90,
        pp: 15,
        type: { name: 'electric' },
        movedamageclass: { name: 'special' },
        movenames: [
          { name: 'Rayo', language: { name: 'es' } },
          { name: 'Thunderbolt', language: { name: 'en' } },
        ],
      },
    ],
  },
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.resetModules()
})

describe('move summary catalog', () => {
  it('keeps only the fields used by the list', () => {
    expect(parseMoveListDetails(movePayload, [85])).toEqual({
      thunderbolt: {
        id: 85,
        name: 'thunderbolt',
        names: [
          { name: 'Rayo', language: { name: 'es' } },
          { name: 'Thunderbolt', language: { name: 'en' } },
        ],
        type: 'electric',
        damageClass: 'special',
        power: 90,
        accuracy: 100,
        pp: 15,
      },
    })
  })

  it('rejects partial responses, unexpected IDs, and invalid classes', () => {
    expect(() => parseMoveListDetails({ ...movePayload, errors: [{ message: 'partial' }] }, [85])).toThrow(ApiError)
    expect(() => parseMoveListDetails(movePayload, [1])).toThrow(ApiError)
    expect(() =>
      parseMoveListDetails(
        {
          data: {
            move: [{ ...movePayload.data.move[0], movedamageclass: { name: 'unexpected' } }],
          },
        },
        [85],
      ),
    ).toThrow(ApiError)
  })

  it('performs a limited localized query and reuses the validated result', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(movePayload)))
    const { fetchMoveListDetails } = await import('./move-catalog')

    const first = await fetchMoveListDetails([85], 'es')
    const second = await fetchMoveListDetails([85], 'es')

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1]
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer' })
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({
      operationName: 'MoveListDetails',
      variables: { ids: [85], languages: ['es', 'en'] },
    })
    expect(body.query).toContain('movedamageclass')
  })

  it('cancels the request when the last consumer leaves', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
            once: true,
          })
        }),
    )
    const { fetchMoveListDetails } = await import('./move-catalog')
    const controller = new AbortController()
    const request = fetchMoveListDetails([1], 'en', controller.signal)

    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})
