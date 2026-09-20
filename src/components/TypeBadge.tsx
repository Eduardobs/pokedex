import { prettyName } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { TypeIcon } from './TypeIcon'

export function TypeBadge({ type }: { type: string }) {
  const { language } = useLanguage()
  const labels: Record<string, Record<string, string>> = {
    'pt-BR': { fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta', ice: 'Gelo', fighting: 'Lutador', poison: 'Veneno', ground: 'Terrestre', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio', steel: 'Metal', fairy: 'Fada', stellar: 'Estelar', shadow: 'Sombra', unknown: 'Desconhecido' },
    en: {},
    es: { fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada', stellar: 'Estelar', shadow: 'Sombra', unknown: 'Desconocido' },
  }
  return <span className={`type-badge type-${type}`}><TypeIcon type={type} />{labels[language][type] ?? prettyName(type)}</span>
}
