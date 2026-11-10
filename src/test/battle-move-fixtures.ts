import bundledMoves from '../data/third-party/pokeapi-battle-moves.json'
import { API_BASE_URL } from '../config/app'

// Keep the bundled API references valid when tests use a compatible alternate host.
export const apiMoves: typeof bundledMoves = JSON.parse(
  JSON.stringify(bundledMoves).replaceAll('https://pokeapi.co/api/v2', API_BASE_URL),
)
