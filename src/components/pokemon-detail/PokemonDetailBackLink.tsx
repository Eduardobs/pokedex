import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'

type DetailLocationState = {
  fromCatalog?: unknown
}

export function PokemonDetailBackLink() {
  const { t } = useLanguage()
  const { state } = useLocation()
  const fromForms =
    typeof state === 'object' &&
    state !== null &&
    (state as DetailLocationState).fromCatalog === 'forms'

  return (
    <Link to={fromForms ? '/formas' : '/pokemon'} className="back-link">
      <ArrowLeft aria-hidden="true" /> {t(fromForms ? 'nav.forms' : 'nav.pokedex')}
    </Link>
  )
}
