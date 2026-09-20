import {
  BicepsFlexed, Brain, Bug, Circle, CircleHelp, Droplets, Eye, Flame,
  FlaskConical, Gem, Ghost, Leaf, LucideIcon, Moon, Mountain, Shield,
  Snowflake, Sparkles, WandSparkles, Waves, Wind, Zap,
} from 'lucide-react'
import { prettyName } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

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
  const { language } = useLanguage()
  const Icon = typeIcons[type] ?? CircleHelp
  const labels: Record<string, Record<string, string>> = {
    'pt-BR': { fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta', ice: 'Gelo', fighting: 'Lutador', poison: 'Veneno', ground: 'Terrestre', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio', steel: 'Metal', fairy: 'Fada', stellar: 'Estelar', shadow: 'Sombra', unknown: 'Desconhecido' },
    en: {},
    es: { fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada', stellar: 'Estelar', shadow: 'Sombra', unknown: 'Desconocido' },
  }
  return <span className={`type-badge type-${type}`}><Icon size={12} aria-hidden="true" />{labels[language][type] ?? prettyName(type)}</span>
}
