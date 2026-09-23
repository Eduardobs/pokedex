import type { messages } from './messages'

export type Language = 'pt-BR' | 'en' | 'es'
export type TranslationKey = keyof (typeof messages)['pt-BR']
export type Translate = (key: TranslationKey, variables?: Record<string, string | number>) => string
