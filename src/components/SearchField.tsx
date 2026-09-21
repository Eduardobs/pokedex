import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  clearLabel: string
  compact?: boolean
  iconSize?: number
}

export function SearchField({
  value,
  onChange,
  onClear,
  clearLabel,
  compact = false,
  iconSize = 19,
  ...inputProps
}: Props) {
  return (
    <div className={`search-field${compact ? ' compact' : ''}`}>
      <Search size={iconSize} />
      <input
        {...inputProps}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          className="search-clear"
          type="button"
          onClick={onClear ?? (() => onChange(''))}
          aria-label={clearLabel}
        >
          ×
        </button>
      )}
    </div>
  )
}
