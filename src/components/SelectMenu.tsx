import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { normalizeSearchText } from '../lib/api'
import { sortByLocalizedLabel } from '../lib/alphabetical-sort'

type SelectOption<T extends string> = {
  value: T
  label: string
  pinned?: boolean
  icon?: ReactNode
  description?: string
  className?: string
}

type SelectMenuProps<T extends string> = {
  className?: string
  icon: ReactNode
  label: string
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  sortOptions?: boolean
  renderSelected?: (option: SelectOption<T>) => ReactNode
  renderOption?: (option: SelectOption<T>) => ReactNode
}

export function SelectMenu<T extends string>({
  className = '',
  icon,
  label,
  options,
  value,
  onChange,
  sortOptions = true,
  renderSelected,
  renderOption,
}: SelectMenuProps<T>) {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const typeaheadRef = useRef({ text: '', time: 0 })
  const optionsId = useId()
  const selected = options.find((option) => option.value === value) ?? options[0]
  const hasRichOptions = !renderOption && options.some((option) => option.icon || option.description)
  const orderedOptions = sortOptions
    ? [
        ...options.filter((option) => option.pinned),
        ...sortByLocalizedLabel(
          options.filter((option) => !option.pinned),
          (option) => option.label,
          language,
        ),
      ]
    : options

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const openAndFocusSelected = () => {
    typeaheadRef.current = { text: '', time: 0 }
    setOpen(true)
    window.requestAnimationFrame(() => selectedRef.current?.focus())
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    openAndFocusSelected()
  }

  const handleOptionsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const optionButtons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
    const currentIndex = optionButtons.indexOf(document.activeElement as HTMLButtonElement)
    if (!optionButtons.length) return
    if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const now = Date.now()
      const previous = typeaheadRef.current
      const text = (now - previous.time < 700 ? previous.text : '') + normalizeSearchText(event.key)
      typeaheadRef.current = { text, time: now }
      const prefix = [...text].every((character) => character === text[0]) ? text[0] : text
      const start = prefix.length === 1 ? currentIndex + 1 : Math.max(currentIndex, 0)
      for (let offset = 0; offset < orderedOptions.length; offset += 1) {
        const index = (start + offset) % orderedOptions.length
        if (normalizeSearchText(orderedOptions[index].label).startsWith(prefix)) {
          optionButtons[index]?.focus()
          break
        }
      }
      return
    }
    let nextIndex: number
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % optionButtons.length
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + optionButtons.length) % optionButtons.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = optionButtons.length - 1
    else return
    event.preventDefault()
    optionButtons[nextIndex]?.focus()
  }

  return (
    <div
      className={`catalog-select${hasRichOptions ? ' catalog-select-rich' : ''} ${className}`.trim()}
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        className="catalog-select-trigger"
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={optionsId}
        onClick={() => (open ? setOpen(false) : openAndFocusSelected())}
        onKeyDown={handleTriggerKeyDown}
      >
        {renderSelected ? (
          <span className="catalog-select-custom-selected">{renderSelected(selected)}</span>
        ) : (
          <>
            <span className="catalog-select-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="catalog-select-copy">
              <small>{label}</small>
              <strong>{selected.label}</strong>
            </span>
          </>
        )}
        <ChevronDown className={open ? 'open' : ''} size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="catalog-select-options"
          id={optionsId}
          role="listbox"
          aria-label={label}
          onKeyDown={handleOptionsKeyDown}
        >
          {orderedOptions.map((option) => (
            <button
              ref={option.value === value ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={option.value === value ? 0 : -1}
              key={option.value}
              className={`${option.className ?? ''}${hasRichOptions && !option.icon ? ' catalog-select-option-no-icon' : ''}`.trim()}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
                triggerRef.current?.focus()
              }}
            >
              {renderOption ? (
                <span className="catalog-select-custom-option">{renderOption(option)}</span>
              ) : (
                <>
                  {option.icon && (
                    <span className="catalog-select-option-icon" aria-hidden="true">
                      {option.icon}
                    </span>
                  )}
                  <span className="catalog-select-option-copy">
                    <strong>{option.label}</strong>
                    {option.description && <small>{option.description}</small>}
                  </span>
                </>
              )}
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
