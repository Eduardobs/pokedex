import { Search } from 'lucide-react'
import { useRef, type InputHTMLAttributes } from 'react'

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
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className={`search-field${compact ? ' compact' : ''}`}>
      <Search size={iconSize} aria-hidden="true" />
      <input ref={inputRef} {...inputProps} value={value} onChange={(event) => onChange(event.target.value)} />
      {value && (
        <button
          className="search-clear"
          type="button"
          disabled={inputProps.disabled || inputProps.readOnly}
          onClick={() => {
            inputRef.current?.focus()
            if (onClear) onClear()
            else onChange('')
          }}
          aria-label={clearLabel}
        >
          ×
        </button>
      )}
    </div>
  )
}
