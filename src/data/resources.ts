import type { LucideIcon } from 'lucide-react'
import {
  Activity, Apple, Backpack, BadgeInfo, BookOpen, Boxes, Brain, ChartNoAxesColumn,
  CircleDot, Clock3, Crosshair, Dna, Dumbbell, Egg, Footprints, Gamepad2, Gem,
  GitBranch, Globe2, HeartPulse, Languages, Layers3, Leaf, Map, MapPin, Medal,
  Palette, PawPrint, ScanFace, Send, Settings, Shapes, Shield, SlidersHorizontal,
  Sparkles, Star, Swords, Tags, Trees, TrendingUp, Trophy, VenusAndMars, Zap,
} from 'lucide-react'
import type { Language } from '../contexts/LanguageContext'

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

export const resourceGroups: ResourceGroup[] = [
  {
    title: 'Pokémon', description: 'Espécies, formas, características e atributos', icon: Dna, color: '#8b5cf6',
    resources: [
      { endpoint: 'pokemon', label: 'Pokémon', icon: Dna }, { endpoint: 'ability', label: 'Habilidades', icon: Zap },
      { endpoint: 'characteristic', label: 'Características', icon: ScanFace }, { endpoint: 'egg-group', label: 'Grupos de ovos', icon: Egg },
      { endpoint: 'gender', label: 'Gêneros', icon: VenusAndMars }, { endpoint: 'growth-rate', label: 'Crescimento', icon: TrendingUp },
      { endpoint: 'nature', label: 'Naturezas', icon: Leaf }, { endpoint: 'pokeathlon-stat', label: 'Pokéathlon', icon: Medal },
      { endpoint: 'pokemon-color', label: 'Cores', icon: Palette }, { endpoint: 'pokemon-form', label: 'Formas', icon: Sparkles },
      { endpoint: 'pokemon-habitat', label: 'Habitats', icon: Trees }, { endpoint: 'pokemon-shape', label: 'Formatos', icon: Shapes },
      { endpoint: 'pokemon-species', label: 'Espécies', icon: PawPrint }, { endpoint: 'stat', label: 'Atributos', icon: ChartNoAxesColumn },
      { endpoint: 'type', label: 'Tipos', icon: Tags },
    ],
  },
  {
    title: 'Combate', description: 'Golpes, estilos, alvos e efeitos de batalha', icon: Swords, color: '#ef4444',
    resources: [
      { endpoint: 'move', label: 'Golpes', icon: Swords }, { endpoint: 'move-ailment', label: 'Condições', icon: HeartPulse },
      { endpoint: 'move-battle-style', label: 'Estilos', icon: Activity }, { endpoint: 'move-category', label: 'Categorias', icon: Layers3 },
      { endpoint: 'move-damage-class', label: 'Classes de dano', icon: Shield }, { endpoint: 'move-learn-method', label: 'Aprendizado', icon: BookOpen },
      { endpoint: 'move-target', label: 'Alvos', icon: Crosshair },
    ],
  },
  {
    title: 'Itens', description: 'Itens, categorias, bolsos e máquinas', icon: Gem, color: '#0ea5e9',
    resources: [
      { endpoint: 'item', label: 'Itens', icon: Gem }, { endpoint: 'item-attribute', label: 'Atributos', icon: BadgeInfo },
      { endpoint: 'item-category', label: 'Categorias', icon: Boxes }, { endpoint: 'item-fling-effect', label: 'Efeitos de arremesso', icon: Send },
      { endpoint: 'item-pocket', label: 'Bolsos', icon: Backpack }, { endpoint: 'machine', label: 'Máquinas', icon: Settings },
    ],
  },
  {
    title: 'Mundo', description: 'Regiões, locais, áreas e parques', icon: Map, color: '#10b981',
    resources: [
      { endpoint: 'location', label: 'Locais', icon: MapPin }, { endpoint: 'location-area', label: 'Áreas', icon: Map },
      { endpoint: 'pal-park-area', label: 'Pal Park', icon: Trees }, { endpoint: 'region', label: 'Regiões', icon: Globe2 },
    ],
  },
  {
    title: 'Jogos', description: 'Gerações, versões e Pokédex regionais', icon: BookOpen, color: '#f59e0b',
    resources: [
      { endpoint: 'generation', label: 'Gerações', icon: Clock3 }, { endpoint: 'pokedex', label: 'Pokédex', icon: BookOpen },
      { endpoint: 'version', label: 'Versões', icon: Gamepad2 }, { endpoint: 'version-group', label: 'Grupos de versões', icon: Layers3 },
    ],
  },
  {
    title: 'Frutas', description: 'Berries, sabores e firmeza', icon: Apple, color: '#ec4899',
    resources: [
      { endpoint: 'berry', label: 'Berries', icon: Apple }, { endpoint: 'berry-firmness', label: 'Firmezas', icon: Dumbbell },
      { endpoint: 'berry-flavor', label: 'Sabores', icon: Star },
    ],
  },
  {
    title: 'Evolução', description: 'Cadeias e gatilhos evolutivos', icon: Zap, color: '#eab308',
    resources: [
      { endpoint: 'evolution-chain', label: 'Cadeias evolutivas', icon: GitBranch }, { endpoint: 'evolution-trigger', label: 'Gatilhos', icon: Zap },
    ],
  },
  {
    title: 'Encontros', description: 'Métodos e condições de encontro', icon: CircleDot, color: '#14b8a6',
    resources: [
      { endpoint: 'encounter-method', label: 'Métodos', icon: Footprints }, { endpoint: 'encounter-condition', label: 'Condições', icon: CircleDot },
      { endpoint: 'encounter-condition-value', label: 'Valores de condição', icon: SlidersHorizontal },
    ],
  },
  {
    title: 'Concursos', description: 'Tipos, efeitos e super concursos', icon: Globe2, color: '#a855f7',
    resources: [
      { endpoint: 'contest-type', label: 'Tipos de concurso', icon: Trophy }, { endpoint: 'contest-effect', label: 'Efeitos', icon: Star },
      { endpoint: 'super-contest-effect', label: 'Super efeitos', icon: Sparkles },
    ],
  },
  {
    title: 'Idiomas', description: 'Idiomas disponíveis na API', icon: Languages, color: '#64748b',
    resources: [{ endpoint: 'language', label: 'Idiomas', icon: Languages }],
  },
]

export const allResources = resourceGroups.flatMap((group) => group.resources)

const groupTranslations: Record<Exclude<Language, 'pt-BR'>, { title: string; description: string }[]> = {
  en: [
    { title: 'Pokémon', description: 'Species, forms, characteristics, and stats' },
    { title: 'Battle', description: 'Moves, styles, targets, and battle effects' },
    { title: 'Items', description: 'Items, categories, pockets, and machines' },
    { title: 'World', description: 'Regions, locations, areas, and parks' },
    { title: 'Games', description: 'Generations, versions, and regional Pokédexes' },
    { title: 'Berries', description: 'Berries, flavors, and firmness' },
    { title: 'Evolution', description: 'Evolution chains and triggers' },
    { title: 'Encounters', description: 'Encounter methods and conditions' },
    { title: 'Contests', description: 'Contest types, effects, and super contests' },
    { title: 'Languages', description: 'Languages available in the API' },
  ],
  es: [
    { title: 'Pokémon', description: 'Especies, formas, características y atributos' },
    { title: 'Combate', description: 'Movimientos, estilos, objetivos y efectos de combate' },
    { title: 'Objetos', description: 'Objetos, categorías, bolsillos y máquinas' },
    { title: 'Mundo', description: 'Regiones, lugares, áreas y parques' },
    { title: 'Juegos', description: 'Generaciones, versiones y Pokédex regionales' },
    { title: 'Bayas', description: 'Bayas, sabores y firmeza' },
    { title: 'Evolución', description: 'Cadenas y desencadenantes evolutivos' },
    { title: 'Encuentros', description: 'Métodos y condiciones de encuentro' },
    { title: 'Concursos', description: 'Tipos, efectos y superconcursos' },
    { title: 'Idiomas', description: 'Idiomas disponibles en la API' },
  ],
}

const resourceTranslations: Record<Exclude<Language, 'pt-BR'>, Record<string, string>> = {
  en: {
    ability: 'Abilities', characteristic: 'Characteristics', 'egg-group': 'Egg groups', gender: 'Genders', 'growth-rate': 'Growth rates', nature: 'Natures',
    'pokeathlon-stat': 'Pokéathlon', 'pokemon-color': 'Colors', 'pokemon-form': 'Forms', 'pokemon-habitat': 'Habitats', 'pokemon-shape': 'Shapes',
    'pokemon-species': 'Species', stat: 'Stats', type: 'Types', move: 'Moves', 'move-ailment': 'Ailments', 'move-battle-style': 'Battle styles',
    'move-category': 'Categories', 'move-damage-class': 'Damage classes', 'move-learn-method': 'Learning methods', 'move-target': 'Targets', item: 'Items',
    'item-attribute': 'Attributes', 'item-category': 'Categories', 'item-fling-effect': 'Fling effects', 'item-pocket': 'Pockets', machine: 'Machines',
    location: 'Locations', 'location-area': 'Areas', region: 'Regions', generation: 'Generations', pokedex: 'Pokédexes', version: 'Versions',
    'version-group': 'Version groups', berry: 'Berries', 'berry-firmness': 'Firmness', 'berry-flavor': 'Flavors', 'evolution-chain': 'Evolution chains',
    'evolution-trigger': 'Triggers', 'encounter-method': 'Methods', 'encounter-condition': 'Conditions', 'encounter-condition-value': 'Condition values',
    'contest-type': 'Contest types', 'contest-effect': 'Effects', 'super-contest-effect': 'Super effects', language: 'Languages',
  },
  es: {
    ability: 'Habilidades', characteristic: 'Características', 'egg-group': 'Grupos huevo', gender: 'Géneros', 'growth-rate': 'Crecimiento', nature: 'Naturalezas',
    'pokeathlon-stat': 'Pokéathlon', 'pokemon-color': 'Colores', 'pokemon-form': 'Formas', 'pokemon-habitat': 'Hábitats', 'pokemon-shape': 'Formas corporales',
    'pokemon-species': 'Especies', stat: 'Atributos', type: 'Tipos', move: 'Movimientos', 'move-ailment': 'Estados', 'move-battle-style': 'Estilos',
    'move-category': 'Categorías', 'move-damage-class': 'Clases de daño', 'move-learn-method': 'Aprendizaje', 'move-target': 'Objetivos', item: 'Objetos',
    'item-attribute': 'Atributos', 'item-category': 'Categorías', 'item-fling-effect': 'Efectos de lanzamiento', 'item-pocket': 'Bolsillos', machine: 'Máquinas',
    location: 'Lugares', 'location-area': 'Áreas', region: 'Regiones', generation: 'Generaciones', pokedex: 'Pokédex', version: 'Versiones',
    'version-group': 'Grupos de versiones', berry: 'Bayas', 'berry-firmness': 'Firmeza', 'berry-flavor': 'Sabores', 'evolution-chain': 'Cadenas evolutivas',
    'evolution-trigger': 'Desencadenantes', 'encounter-method': 'Métodos', 'encounter-condition': 'Condiciones', 'encounter-condition-value': 'Valores de condición',
    'contest-type': 'Tipos de concurso', 'contest-effect': 'Efectos', 'super-contest-effect': 'Superefectos', language: 'Idiomas',
  },
}

export function getResourceGroups(language: Language): ResourceGroup[] {
  if (language === 'pt-BR') return resourceGroups
  return resourceGroups.map((group, index) => ({
    ...group,
    ...groupTranslations[language][index],
    resources: group.resources.map((resource) => ({ ...resource, label: resourceTranslations[language][resource.endpoint] ?? resource.label })),
  }))
}

export const getResourceLabel = (endpoint: string, language: Language = 'pt-BR') => {
  const fallback = allResources.find((item) => item.endpoint === endpoint)?.label ?? endpoint
  return language === 'pt-BR' ? fallback : resourceTranslations[language][endpoint] ?? fallback
}

export function getResourceMeta(endpoint: string, language: Language = 'pt-BR') {
  const groups = getResourceGroups(language)
  for (const group of groups) {
    const resource = group.resources.find((item) => item.endpoint === endpoint)
    if (resource) return { ...resource, groupTitle: group.title, groupColor: group.color, groupIcon: group.icon }
  }
  return undefined
}
