const collators = new Map<string, Intl.Collator>()

function labelCollator(locale: string) {
  let collator = collators.get(locale)
  if (!collator) {
    if (collators.size >= 16) collators.delete(collators.keys().next().value as string)
    collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
    collators.set(locale, collator)
  }
  return collator
}

export function sortByLocalizedLabel<T>(values: readonly T[], labelFor: (value: T) => string, locale: string): T[] {
  const collator = labelCollator(locale)
  return values
    .map((value) => ({ value, label: labelFor(value) }))
    .sort((left, right) => collator.compare(left.label, right.label))
    .map(({ value }) => value)
}
