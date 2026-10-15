import { useId, type ReactNode } from 'react'

type Option<Value extends string> = { value: Value; label: string; icon?: ReactNode }

export function RadioSelection<Value extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string
  value: string
  options: Option<Value>[]
  onChange: (value: Value) => void
}) {
  const groupName = useId()
  return (
    <fieldset className="radio-selection">
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.icon && (
              <span className="radio-selection-icon" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
