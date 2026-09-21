type MegaEvolutionIconProps = {
  className?: string
  size?: number
}

export function MegaEvolutionIcon({ className = '', size = 24 }: MegaEvolutionIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`mega-evolution-icon ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  )
}
