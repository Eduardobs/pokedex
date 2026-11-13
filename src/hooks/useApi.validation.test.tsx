import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useApi } from './useApi'
import { clearApiCache } from '../lib/api-client'
import { parsePokemon } from '../lib/rest-validation'
import { pokemonFixture } from '../test/pokemon-fixtures'

afterEach(() => {
  cleanup()
  clearApiCache()
  vi.unstubAllGlobals()
})
it('evicts schema-invalid successes so retry reaches the API and recovers', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(Response.json(pokemonFixture))
  vi.stubGlobal('fetch', fetch)
  const { result } = renderHook(() => useApi('pokemon/25', parsePokemon))
  await waitFor(() => expect(result.current.error).toMatchObject({ code: 'invalid-response' }))
  expect(result.current.data).toBeNull()
  act(() => result.current.retry())
  await waitFor(() => expect(result.current.data?.name).toBe('pikachu'))
  expect(fetch).toHaveBeenCalledTimes(2)
})
