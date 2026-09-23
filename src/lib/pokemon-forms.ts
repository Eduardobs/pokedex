import { prettyName } from './api'

export type FormCategory = 'regional' | 'mega' | 'gmax'

type FormLabelKey = 'form.mega' | 'forms.gmax' | 'pokemonForms.regionForm'
type FormLabelTranslate = (key: FormLabelKey, variables?: Record<string, string | number>) => string

export function formCategory(name: string): FormCategory | null {
  if (name.includes('-gmax')) return 'gmax'
  if (name.match(/-mega(?:-|$)/)) return 'mega'
  if (['-alola', '-galar', '-hisui', '-paldea'].some((region) => name.includes(region)))
    return 'regional'
  return null
}

export function formLabels(name: string, category: FormCategory, t?: FormLabelTranslate) {
  if (category === 'gmax') {
    const baseName = name.replace(/-gmax$/, '')
    return { baseName, pokemon: prettyName(baseName), variation: t?.('forms.gmax') ?? 'Gigantamax' }
  }

  if (category === 'mega') {
    const [base, suffix = ''] = name.split('-mega')
    return {
      baseName: base,
      pokemon: prettyName(base),
      variation: `${t?.('form.mega') ?? 'Mega Forma'}${suffix ? ` ${prettyName(suffix.replace(/^-/, ''))}` : ''}`,
    }
  }

  const regionalMatch = name.match(/-(alola|galar|hisui|paldea)(?:-(.+))?$/)
  if (regionalMatch?.index !== undefined) {
    const regionNames: Record<string, string> = {
      alola: 'Alola',
      galar: 'Galar',
      hisui: 'Hisui',
      paldea: 'Paldea',
    }
    const detail = regionalMatch[2] ? ` · ${prettyName(regionalMatch[2])}` : ''
    const baseName = name.slice(0, regionalMatch.index)
    const regionLabel = t
      ? t('pokemonForms.regionForm', { region: regionNames[regionalMatch[1]] })
      : `Forma de ${regionNames[regionalMatch[1]]}`
    return { baseName, pokemon: prettyName(baseName), variation: `${regionLabel}${detail}` }
  }

  return { baseName: name, pokemon: prettyName(name), variation: prettyName(name) }
}
