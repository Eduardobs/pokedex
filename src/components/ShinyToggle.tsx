import { Sparkles } from 'lucide-react'

export function ShinyToggle({
  pressed,
  label,
  accessibleLabel = label,
  className = 'list-shiny-toggle',
  disabled = false,
  title,
  onChange,
}: {
  pressed: boolean
  label: string
  accessibleLabel?: string
  className?: string
  disabled?: boolean
  title?: string
  onChange: (pressed: boolean) => void
}) {
  return (
    <button
      type="button"
      className={`${className}${pressed ? ' active' : ''}`}
      aria-label={accessibleLabel}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!pressed)}
    >
      <Sparkles size={17} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}
