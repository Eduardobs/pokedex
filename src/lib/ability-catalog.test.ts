import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client'
import { parseAbilityListDetails } from './ability-catalog'

const abilityPayload = {
  data: {
    ability: [
      {
        id: 1,
        name: 'stench',
        abilityeffecttexts: [
          {
            short_effect: 'Has a 10% chance of making the target flinch with each hit.',
            language: { name: 'en' },
          },
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

describe('ability summary catalog', () => {
  it('keeps only the short description and language used by the list', () => {
    expect(parseAbilityListDetails(abilityPayload, [1])).toEqual({
      stench: {
        id: 1,
        name: 'stench',
        effectEntries: [
          {
            short_effect: 'Has a 10% chance of making the target flinch with each hit.',
            language: { name: 'en' },
          },
        ],
      },
    })
  })

  it('rejects partial responses, unexpected IDs, and duplicate languages', () => {
    expect(() => parseAbilityListDetails({ ...abilityPayload, errors: [{ message: 'partial' }] }, [1])).toThrow(
      ApiError,
    )
    expect(() => parseAbilityListDetails(abilityPayload, [2])).toThrow(ApiError)
    expect(() =>
      parseAbilityListDetails(
        {
          data: {
            ability: [
              {
                ...abilityPayload.data.ability[0],
                abilityeffecttexts: [
                  ...abilityPayload.data.ability[0].abilityeffecttexts,
                  ...abilityPayload.data.ability[0].abilityeffecttexts,
                ],
              },
            ],
          },
        },
        [1],
      ),
    ).toThrow(ApiError)
  })

  it('performs a language-limited query and reuses the validated result', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(abilityPayload)))
    const { fetchAbilityListDetails } = await import('./ability-catalog')

    const first = await fetchAbilityListDetails([1], 'pt-br')
    const second = await fetchAbilityListDetails([1], 'pt-br')

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1]
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer' })
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({
      operationName: 'AbilityListDetails',
      variables: { ids: [1], languages: ['pt-br', 'en'] },
    })
    expect(body.query).toContain('short_effect')
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
    const { fetchAbilityListDetails } = await import('./ability-catalog')
    const controller = new AbortController()
    const request = fetchAbilityListDetails([1], 'en', controller.signal)

    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})
