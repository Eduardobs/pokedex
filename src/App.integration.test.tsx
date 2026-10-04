import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEYS } from './config/app'

const apiBase = 'https://pokeapi.co/api/v2'
const pokemon = {
  id: 25,
  name: 'pikachu',
  sprites: {
    front_default: 'pikachu.png',
    front_shiny: 'pikachu-shiny.png',
    other: {
      'official-artwork': {
        front_default: 'pikachu-artwork.png',
        front_shiny: 'pikachu-shiny-artwork.png',
      },
    },
  },
  types: [{ slot: 1, type: { name: 'electric', url: `${apiBase}/type/13/` } }],
}

describe('App integration', () => {
  beforeEach(() => {
    window.location.hash = '#/pokemon'
    localStorage.clear()
    vi.stubGlobal('scrollTo', vi.fn())
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('connects API retry, routing, providers and persistent favorites', async () => {
    let listRequests = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.pathname === '/api/v2/pokemon' && url.searchParams.get('limit') === '2000') {
        listRequests += 1
        if (listRequests === 1) return new Response('{}', { status: 503 })
        return Response.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ name: 'pikachu', url: `${apiBase}/pokemon/25/` }],
        })
      }
      if (url.pathname === '/api/v2/pokemon/pikachu') return Response.json(pokemon)
      return new Response('{}', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('Não foi possível carregar a Pokédex. Verifique sua conexão.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Pikachu' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: /Adicionar pikachu aos favoritos/i }))
    expect(screen.getByRole('status')).toHaveTextContent('pikachu foi adicionado aos favoritos.')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) ?? '[]')).toEqual(['pikachu'])

    fireEvent.click(screen.getByRole('link', { name: /Favoritos 1/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Pokémon favoritos' })).toBeVisible()
    expect(await screen.findByRole('heading', { level: 3, name: 'Pikachu' })).toBeVisible()
    await waitFor(() => expect(window.location.hash).toBe('#/favoritos'))

    expect(listRequests).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
