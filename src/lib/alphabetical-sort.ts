export function sortByLocalizedLabel<T>(values: readonly T[], labelFor: (value: T) => string, locale: string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  return values
    .map((value) => ({ value, label: labelFor(value) }))
    .sort((left, right) => collator.compare(left.label, right.label))
    .map(({ value }) => value)
}
