import { Heart } from 'lucide-react'
import type { CSSProperties } from 'react'

export function FriendshipSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const percentage = (value / 255) * 100

  return (
    <div className="friendship-control">
      <div className="friendship-control-header">
        <span>{label}</span>
        <output aria-live="polite">{value}</output>
      </div>
      <div className="friendship-slider">
        <Heart className="friendship-heart-min" size={14} aria-hidden="true" />
        <input
          type="range"
          aria-label={label}
          aria-valuetext={`${label}: ${value}/255`}
          min={0}
          max={255}
          step={1}
          value={value}
          style={{ '--friendship-value': `${percentage}%` } as CSSProperties}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <Heart className="friendship-heart-max" size={24} fill="currentColor" aria-hidden="true" />
      </div>
    </div>
  )
}
