import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '../config/app'
import { messages } from '../i18n/messages'
import { readStorageString, writeStorageString } from '../lib/storage'

export type Language = 'pt-BR' | 'en' | 'es'

export type TranslationKey = keyof (typeof messages)['pt-BR']
export type Translate = (key: TranslationKey, variables?: Record<string, string | number>) => string

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: Translate
  apiLanguage: 'pt-br' | 'en' | 'es'
}
const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    readStorageString(STORAGE_KEYS.language, ['pt-BR', 'en', 'es'] as const, 'pt-BR'),
  )

  useEffect(() => {
    writeStorageString(STORAGE_KEYS.language, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      apiLanguage: language === 'pt-BR' ? 'pt-br' : language,
      t: (key, variables) => {
        let text: string = messages[language][key] ?? messages['pt-BR'][key] ?? key
        Object.entries(variables ?? {}).forEach(([name, value]) => {
          text = text.replaceAll(`{${name}}`, String(value))
        })
        return text
      },
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('LanguageProvider is missing')
  return context
}
