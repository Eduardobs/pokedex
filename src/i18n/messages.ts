import { en, enApiTerms, enFatalError, enResourceGroups, enResourceLabels, enTypeLabels } from './locales/en'
import { es, esApiTerms, esFatalError, esResourceGroups, esResourceLabels, esTypeLabels } from './locales/es'
import {
  ptBR,
  ptBRApiTerms,
  ptBRFatalError,
  ptBRResourceGroups,
  ptBRResourceLabels,
  ptBRTypeLabels,
} from './locales/pt-BR'

export const messages = {
  'pt-BR': ptBR,
  en,
  es,
} as const

export type MessageLanguage = keyof typeof messages

export const fatalErrorMessages = {
  'pt-BR': ptBRFatalError,
  en: enFatalError,
  es: esFatalError,
} as const satisfies Record<MessageLanguage, { title: string; message: string; reload: string }>

export const typeLabelMessages = {
  'pt-BR': ptBRTypeLabels,
  en: enTypeLabels,
  es: esTypeLabels,
} as const satisfies Record<MessageLanguage, Readonly<Record<string, string>>>

export const apiTermMessages = {
  'pt-BR': ptBRApiTerms,
  en: enApiTerms,
  es: esApiTerms,
} as const satisfies Record<MessageLanguage, Readonly<Record<string, string>>>

export const resourceGroupMessages = {
  'pt-BR': ptBRResourceGroups,
  en: enResourceGroups,
  es: esResourceGroups,
} as const satisfies Record<MessageLanguage, readonly { title: string; description: string }[]>

export const resourceLabelMessages = {
  'pt-BR': ptBRResourceLabels,
  en: enResourceLabels,
  es: esResourceLabels,
} as const satisfies Record<MessageLanguage, Readonly<Record<string, string>>>
