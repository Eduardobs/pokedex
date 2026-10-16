import type { ReactNode } from 'react'
import { CircleDot } from 'lucide-react'
import { ItemImage } from './ItemImage'
import { BATTLE_TIMING } from '../config/app'

/** Keep transforms separate from the detail tooltip and preserve intrinsic sprite dimensions. */
export function BattleSprite({
  children,
  attacking,
  hit,
  fainted,
}: {
  children: ReactNode
  attacking: boolean
  hit: boolean
  fainted: boolean
}) {
  return (
    <span className="battle-sprite-scene">
      <span className="battle-entry-ball" aria-hidden="true">
        <ItemImage name="poke-ball" alt="" width={28} height={28} fallbackIcon={CircleDot} />
      </span>
      <span className={`battle-sprite-exit${fainted ? ' is-fainted' : ''}`}>
        <span className="battle-sprite-entry">
          <span
            className={`battle-sprite-motion${attacking ? ' is-attacking' : ''}${hit ? ' is-hit' : ''}`}
            style={{
              animationDuration: `${attacking ? BATTLE_TIMING.actionDelayMs : BATTLE_TIMING.resultDisplayMs}ms`,
            }}
          >
            {children}
          </span>
        </span>
      </span>
    </span>
  )
}
