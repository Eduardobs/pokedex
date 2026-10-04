import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Apple,
  Backpack,
  BadgeInfo,
  BookOpen,
  Boxes,
  ChartNoAxesColumn,
  CircleDot,
  Clock3,
  Crosshair,
  Dna,
  Dumbbell,
  Egg,
  Footprints,
  Gamepad2,
  Gem,
  GitBranch,
  Globe2,
  HeartPulse,
  Languages,
  Layers3,
  Leaf,
  Map,
  MapPin,
  Medal,
  Palette,
  PawPrint,
  ScanFace,
  Send,
  Settings,
  Shapes,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Swords,
  Tags,
  Trees,
  TrendingUp,
  Trophy,
  VenusAndMars,
  Zap,
} from 'lucide-react'
import { resourceGroupMessages, resourceLabelMessages } from '../i18n/messages'
import type { Language } from '../i18n/types'

export type ResourceDefinition = {
  endpoint: string
  label: string
  icon: LucideIcon
}

export type ResourceGroup = {
  title: string
  description: string
  icon: LucideIcon
  color: string
  resources: ResourceDefinition[]
}

type ResourceGroupDefinition = Omit<ResourceGroup, 'title' | 'description' | 'resources'> & {
  resources: Omit<ResourceDefinition, 'label'>[]
}

const resourceGroupDefinitions: ResourceGroupDefinition[] = [
  {
    icon: Dna,
    color: '#8b5cf6',
    resources: [
      { endpoint: 'pokemon', icon: Dna },
      { endpoint: 'ability', icon: Zap },
      { endpoint: 'characteristic', icon: ScanFace },
      { endpoint: 'egg-group', icon: Egg },
      { endpoint: 'gender', icon: VenusAndMars },
      { endpoint: 'growth-rate', icon: TrendingUp },
      { endpoint: 'nature', icon: Leaf },
      { endpoint: 'pokeathlon-stat', icon: Medal },
      { endpoint: 'pokemon-color', icon: Palette },
      { endpoint: 'pokemon-form', icon: Sparkles },
      { endpoint: 'pokemon-habitat', icon: Trees },
      { endpoint: 'pokemon-shape', icon: Shapes },
      { endpoint: 'pokemon-species', icon: PawPrint },
      { endpoint: 'stat', icon: ChartNoAxesColumn },
      { endpoint: 'type', icon: Tags },
    ],
  },
  {
    icon: Swords,
    color: '#ef4444',
    resources: [
      { endpoint: 'move', icon: Swords },
      { endpoint: 'move-ailment', icon: HeartPulse },
      { endpoint: 'move-battle-style', icon: Activity },
      { endpoint: 'move-category', icon: Layers3 },
      { endpoint: 'move-damage-class', icon: Shield },
      { endpoint: 'move-learn-method', icon: BookOpen },
      { endpoint: 'move-target', icon: Crosshair },
    ],
  },
  {
    icon: Gem,
    color: '#0ea5e9',
    resources: [
      { endpoint: 'item', icon: Gem },
      { endpoint: 'item-attribute', icon: BadgeInfo },
      { endpoint: 'item-category', icon: Boxes },
      { endpoint: 'item-fling-effect', icon: Send },
      { endpoint: 'item-pocket', icon: Backpack },
      { endpoint: 'machine', icon: Settings },
    ],
  },
  {
    icon: Map,
    color: '#10b981',
    resources: [
      { endpoint: 'location', icon: MapPin },
      { endpoint: 'location-area', icon: Map },
      { endpoint: 'pal-park-area', icon: Trees },
      { endpoint: 'region', icon: Globe2 },
    ],
  },
  {
    icon: BookOpen,
    color: '#f59e0b',
    resources: [
      { endpoint: 'generation', icon: Clock3 },
      { endpoint: 'pokedex', icon: BookOpen },
      { endpoint: 'version', icon: Gamepad2 },
      { endpoint: 'version-group', icon: Layers3 },
    ],
  },
  {
    icon: Apple,
    color: '#ec4899',
    resources: [
      { endpoint: 'berry', icon: Apple },
      { endpoint: 'berry-firmness', icon: Dumbbell },
      { endpoint: 'berry-flavor', icon: Star },
    ],
  },
  {
    icon: Zap,
    color: '#eab308',
    resources: [
      { endpoint: 'evolution-chain', icon: GitBranch },
      { endpoint: 'evolution-trigger', icon: Zap },
    ],
  },
  {
    icon: CircleDot,
    color: '#14b8a6',
    resources: [
      { endpoint: 'encounter-method', icon: Footprints },
      { endpoint: 'encounter-condition', icon: CircleDot },
      {
        endpoint: 'encounter-condition-value',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    icon: Globe2,
    color: '#a855f7',
    resources: [
      { endpoint: 'contest-type', icon: Trophy },
      { endpoint: 'contest-effect', icon: Star },
      { endpoint: 'super-contest-effect', icon: Sparkles },
    ],
  },
  {
    icon: Languages,
    color: '#64748b',
    resources: [{ endpoint: 'language', icon: Languages }],
  },
]

const englishResourceLabels = resourceLabelMessages.en as Readonly<Record<string, string>>

export const resourceGroups: ResourceGroup[] = resourceGroupDefinitions.map((group, index) => ({
  ...group,
  ...resourceGroupMessages.en[index],
  resources: group.resources.map((resource) => ({
    ...resource,
    label: englishResourceLabels[resource.endpoint] ?? resource.endpoint,
  })),
}))

export const allResources = resourceGroups.flatMap((group) => group.resources)

export function getResourceGroups(language: Language): ResourceGroup[] {
  const labels = resourceLabelMessages[language] as Readonly<Record<string, string>>
  return resourceGroups.map((group, index) => ({
    ...group,
    ...resourceGroupMessages[language][index],
    resources: group.resources.map((resource) => ({
      ...resource,
      label: labels[resource.endpoint] ?? resource.label,
    })),
  }))
}

export const getResourceLabel = (endpoint: string, language: Language = 'pt-BR') => {
  const labels = resourceLabelMessages[language] as Readonly<Record<string, string>>
  return labels[endpoint] ?? allResources.find((item) => item.endpoint === endpoint)?.label ?? endpoint
}

export function getResourceMeta(endpoint: string, language: Language = 'pt-BR') {
  const groups = getResourceGroups(language)
  for (const group of groups) {
    const resource = group.resources.find((item) => item.endpoint === endpoint)
    if (resource)
      return {
        ...resource,
        groupTitle: group.title,
        groupColor: group.color,
        groupIcon: group.icon,
      }
  }
  return undefined
}
