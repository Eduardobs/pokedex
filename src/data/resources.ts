import type { LucideIcon } from 'lucide-react'
import { Apple, BookOpen, CircleDot, Dna, Gem, Globe2, Languages, Map, Swords, Zap } from 'lucide-react'

export type ResourceGroup = {
  title: string
  description: string
  icon: LucideIcon
  color: string
  resources: { endpoint: string; label: string }[]
}

export const resourceGroups: ResourceGroup[] = [
  {
    title: 'Pokémon', description: 'Espécies, formas, características e atributos', icon: Dna, color: '#8b5cf6',
    resources: [
      { endpoint: 'pokemon', label: 'Pokémon' }, { endpoint: 'ability', label: 'Habilidades' },
      { endpoint: 'characteristic', label: 'Características' }, { endpoint: 'egg-group', label: 'Grupos de ovos' },
      { endpoint: 'gender', label: 'Gêneros' }, { endpoint: 'growth-rate', label: 'Crescimento' },
      { endpoint: 'nature', label: 'Naturezas' }, { endpoint: 'pokeathlon-stat', label: 'Pokéathlon' },
      { endpoint: 'pokemon-color', label: 'Cores' }, { endpoint: 'pokemon-form', label: 'Formas' },
      { endpoint: 'pokemon-habitat', label: 'Habitats' }, { endpoint: 'pokemon-shape', label: 'Formatos' },
      { endpoint: 'pokemon-species', label: 'Espécies' }, { endpoint: 'stat', label: 'Atributos' },
      { endpoint: 'type', label: 'Tipos' },
    ],
  },
  {
    title: 'Combate', description: 'Golpes, estilos, alvos e efeitos de batalha', icon: Swords, color: '#ef4444',
    resources: [
      { endpoint: 'move', label: 'Golpes' }, { endpoint: 'move-ailment', label: 'Condições' },
      { endpoint: 'move-battle-style', label: 'Estilos' }, { endpoint: 'move-category', label: 'Categorias' },
      { endpoint: 'move-damage-class', label: 'Classes de dano' }, { endpoint: 'move-learn-method', label: 'Aprendizado' },
      { endpoint: 'move-target', label: 'Alvos' },
    ],
  },
  {
    title: 'Itens', description: 'Itens, categorias, bolsos e máquinas', icon: Gem, color: '#0ea5e9',
    resources: [
      { endpoint: 'item', label: 'Itens' }, { endpoint: 'item-attribute', label: 'Atributos' },
      { endpoint: 'item-category', label: 'Categorias' }, { endpoint: 'item-fling-effect', label: 'Efeitos de arremesso' },
      { endpoint: 'item-pocket', label: 'Bolsos' }, { endpoint: 'machine', label: 'Máquinas' },
    ],
  },
  {
    title: 'Mundo', description: 'Regiões, locais, áreas e parques', icon: Map, color: '#10b981',
    resources: [
      { endpoint: 'location', label: 'Locais' }, { endpoint: 'location-area', label: 'Áreas' },
      { endpoint: 'pal-park-area', label: 'Pal Park' }, { endpoint: 'region', label: 'Regiões' },
    ],
  },
  {
    title: 'Jogos', description: 'Gerações, versões e Pokédex regionais', icon: BookOpen, color: '#f59e0b',
    resources: [
      { endpoint: 'generation', label: 'Gerações' }, { endpoint: 'pokedex', label: 'Pokédex' },
      { endpoint: 'version', label: 'Versões' }, { endpoint: 'version-group', label: 'Grupos de versões' },
    ],
  },
  {
    title: 'Frutas', description: 'Berries, sabores e firmeza', icon: Apple, color: '#ec4899',
    resources: [
      { endpoint: 'berry', label: 'Berries' }, { endpoint: 'berry-firmness', label: 'Firmezas' },
      { endpoint: 'berry-flavor', label: 'Sabores' },
    ],
  },
  {
    title: 'Evolução', description: 'Cadeias e gatilhos evolutivos', icon: Zap, color: '#eab308',
    resources: [
      { endpoint: 'evolution-chain', label: 'Cadeias evolutivas' }, { endpoint: 'evolution-trigger', label: 'Gatilhos' },
    ],
  },
  {
    title: 'Encontros', description: 'Métodos e condições de encontro', icon: CircleDot, color: '#14b8a6',
    resources: [
      { endpoint: 'encounter-method', label: 'Métodos' }, { endpoint: 'encounter-condition', label: 'Condições' },
      { endpoint: 'encounter-condition-value', label: 'Valores de condição' },
    ],
  },
  {
    title: 'Concursos', description: 'Tipos, efeitos e super concursos', icon: Globe2, color: '#a855f7',
    resources: [
      { endpoint: 'contest-type', label: 'Tipos de concurso' }, { endpoint: 'contest-effect', label: 'Efeitos' },
      { endpoint: 'super-contest-effect', label: 'Super efeitos' },
    ],
  },
  {
    title: 'Idiomas', description: 'Idiomas disponíveis na API', icon: Languages, color: '#64748b',
    resources: [{ endpoint: 'language', label: 'Idiomas' }],
  },
]

export const allResources = resourceGroups.flatMap((group) => group.resources)
export const getResourceLabel = (endpoint: string) => allResources.find((item) => item.endpoint === endpoint)?.label ?? endpoint
