import type { SVGProps } from 'react'

const referenceTypes = new Set([
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock',
  'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric',
  'psychic', 'ice', 'dragon', 'dark', 'fairy',
])

export function TypeIcon({ type, ...props }: SVGProps<SVGSVGElement> & { type: string }) {
  if (!referenceTypes.has(type)) {
    return (
      <svg viewBox="0 0 30 30" fill="none" aria-hidden="true" {...props}>
        <circle cx="15" cy="15" r="10" stroke="currentColor" strokeWidth="2.5" />
        <path d="M12.7 11.7a2.8 2.8 0 0 1 5.4 1c0 2.2-3.1 2.5-3.1 5M15 21.8h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 30 30" fill="currentColor" aria-hidden="true" {...props}>
      <use href={`/type-icons.svg#type-${type}`} />
    </svg>
  )
}
