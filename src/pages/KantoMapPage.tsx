import { GameMapPage } from '../components/GameMapPage'
import { KANTO_MAP } from '../data/kanto-map'

export function KantoMapPage() {
  return <GameMapPage map={KANTO_MAP} />
}
