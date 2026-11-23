/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POKEAPI_REST_URL?: string
  readonly VITE_POKEAPI_GRAPHQL_URL?: string
}

declare module 'virtual:battle-metronome-moves' {
  export interface CompactMetronomeMove {
    readonly name: string
    readonly type: string
    readonly damageClass: string
    readonly power: number | null
    readonly accuracy: number | null
    readonly priority: number
    readonly pp: number | null
    readonly target: string
    readonly effectChance: number | null
    readonly meta: {
      readonly healing: number
      readonly drain: number
      readonly ailment: string
      readonly ailmentChance: number
      readonly minHits: number | null
      readonly maxHits: number | null
      readonly critRate: number
      readonly flinchChance: number
      readonly statChance: number
    } | null
    readonly statChanges: readonly { readonly stat: string; readonly change: number }[]
    readonly flavorTexts: readonly { readonly language: string; readonly text: string }[]
  }

  const moves: readonly CompactMetronomeMove[]
  export default moves
}
