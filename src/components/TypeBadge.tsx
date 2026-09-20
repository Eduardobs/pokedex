import {
  BicepsFlexed, Brain, Bug, Circle, CircleHelp, Droplets, Eye, Flame,
  FlaskConical, Gem, Ghost, Leaf, LucideIcon, Moon, Mountain, Shield,
  Snowflake, Sparkles, WandSparkles, Waves, Wind, Zap,
} from 'lucide-react'
import { prettyName } from '../lib/api'

const typeIcons: Record<string, LucideIcon> = {
  normal: Circle,
  fire: Flame,
  water: Droplets,
  electric: Zap,
  grass: Leaf,
  ice: Snowflake,
  fighting: BicepsFlexed,
  poison: FlaskConical,
  ground: Mountain,
  flying: Wind,
  psychic: Brain,
  bug: Bug,
  rock: Gem,
  ghost: Ghost,
  dragon: Sparkles,
  dark: Moon,
  steel: Shield,
  fairy: WandSparkles,
  stellar: Waves,
  shadow: Eye,
  unknown: CircleHelp,
}

export function TypeBadge({ type }: { type: string }) {
  const Icon = typeIcons[type] ?? CircleHelp
  return <span className={`type-badge type-${type}`}><Icon size={12} aria-hidden="true" />{prettyName(type)}</span>
}
