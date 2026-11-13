import { ChevronDown } from 'lucide-react'

type Props = {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}

/** Keep the platform picker and keyboard behavior, with a complete multiline value. */
export function NativeValueSelect({ label, value, options, onChange }: Props) {
  const selected = options.find((option) => option.value === value)
  return (
    <label className="native-value-field">
      <span>{label}</span>
      <span className="native-value-control">
        <span className="native-value-copy" aria-hidden="true">
          {selected?.label ?? value}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
        <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}
