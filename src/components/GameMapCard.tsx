import { ArrowRight, Gamepad2 } from 'lucide-react'
import { Link } from 'react-router-dom'

type GameMapCardProps = {
  to: string
  className?: string
  cover: {
    src: string
    alt: string
    width: number
    height: number
  }
  generation: string
  platform: string
  title: string
  description: string
  region: string
  pointCount: string
  openLabel: string
}

export function GameMapCard({
  to,
  className,
  cover,
  generation,
  platform,
  title,
  description,
  region,
  pointCount,
  openLabel,
}: GameMapCardProps) {
  return (
    <Link className={`game-map-card${className ? ` ${className}` : ''}`} to={to}>
      <div className="game-map-cover">
        <img {...cover} />
        <span className="game-map-generation">{generation}</span>
      </div>
      <div className="game-map-card-copy">
        <span className="game-map-platform">
          <Gamepad2 size={15} aria-hidden="true" /> {platform}
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="game-map-card-meta">
          <span>{region}</span>
          <span>{pointCount}</span>
        </div>
        <span className="game-map-open">
          {openLabel} <ArrowRight size={18} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
