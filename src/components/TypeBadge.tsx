import { prettyName } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { TypeIcon } from './TypeIcon'
import type { Language } from '../contexts/LanguageContext'

const labels: Record<Language, Record<string, string>> = {
  'pt-BR': { fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta', ice: 'Gelo', fighting: 'Lutador', poison: 'Veneno', ground: 'Terrestre', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio', steel: 'Metal', fairy: 'Fada', stellar: 'Estelar', shadow: 'Sombra', unknown: 'Desconhecido' },
  en: {},
  es: { fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada', stellar: 'Estelar', shadow: 'Sombra', unknown: 'Desconocido' },
}

export const typeLabel = (type: string, language: Language) => labels[language][type] ?? prettyName(type)

export function TypeBadge({ type, iconOnly = false }: { type: string; iconOnly?: boolean }) {
  const { language } = useLanguage()
  const label = typeLabel(type, language)
  return (
    <span className={`type-badge type-${type}`} aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}>
      <TypeIcon type={type} />
      {!iconOnly && label}
    </span>
  )
}
