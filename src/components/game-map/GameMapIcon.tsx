import {
  Accessibility,
  Badge,
  Box,
  CircleDot,
  CircleUserRound,
  Cross,
  Dumbbell,
  Gem,
  GraduationCap,
  Landmark,
  MapPin,
  Mountain,
  Package,
  RefreshCcw,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  TowerControl,
  Utensils,
  Waves,
} from 'lucide-react'
import type { GameMapIconId } from '../../data/maps/game-map'

export function GameMapIcon({ icon, size = 15 }: { icon: GameMapIconId; size?: number }) {
  const props = { size, 'aria-hidden': true as const }

  switch (icon) {
    case 'area':
      return <MapPin {...props} />
    case 'cave':
      return <Mountain {...props} />
    case 'pokemon-center':
    case 'medicine':
      return <Cross {...props} />
    case 'transition':
      return <RefreshCcw {...props} />
    case 'move-tutor':
      return <GraduationCap {...props} />
    case 'npc':
      return <CircleUserRound {...props} />
    case 'shop':
      return <ShoppingBag {...props} />
    case 'clothing':
      return <Shirt {...props} />
    case 'food':
      return <Utensils {...props} />
    case 'hairdresser':
      return <Scissors {...props} />
    case 'watchtower':
      return <TowerControl {...props} />
    case 'shrine':
      return <Landmark {...props} />
    case 'collectible':
    case 'berry':
    case 'poke-ball':
      return <CircleDot {...props} />
    case 'item':
      return <Package {...props} />
    case 'key-item':
      return <Gem {...props} />
    case 'tm':
      return <Box {...props} />
    case 'obstacle':
      return <Dumbbell {...props} />
    case 'waterfall':
      return <Waves {...props} />
    case 'battle':
      return <Swords {...props} />
    case 'trainer':
      return <Accessibility {...props} />
    case 'mission':
      return <Badge {...props} />
    case 'legendary':
      return <Star {...props} />
    case 'sparkles':
    case 'tera-pokemon':
      return <Sparkles {...props} />
  }
}
