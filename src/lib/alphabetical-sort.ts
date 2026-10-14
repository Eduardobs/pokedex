export function sortByLocalizedLabel<T>(values: readonly T[], labelFor: (value: T) => string, locale: string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  return [...values].sort((left, right) => collator.compare(labelFor(left), labelFor(right)))
}
