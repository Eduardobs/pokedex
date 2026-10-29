import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { getResourceMeta } from '../data/resources'
import { canonicalUrl, updateCanonical, updateMeta } from '../lib/seo'

export function Seo({ title, description }: { title: string; description: string }) {
  const { pathname } = useLocation()
  const { language, t } = useLanguage()

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    let pageTitle = title
    let pageDescription = description
    if (segments[0] === 'pokemon' && segments.length === 2) {
      const name = segments[1].replaceAll('-', ' ')
      pageTitle = t('seo.pokemonTitle', { name })
      pageDescription = t('seo.pokemonDescription', { name })
    } else if (segments[0] === 'explore' && segments[1]) {
      const resource = getResourceMeta(segments[1], language)
      if (resource && segments.length <= 3) {
        const name = segments[2]?.replaceAll('-', ' ')
        pageTitle = name ? `${name} · ${resource.label}` : resource.label
        pageDescription = name
          ? t('seo.resourceDetailDescription', { name, resource: resource.label })
          : t('seo.resourceDescription', { resource: resource.label })
      }
    } else if (pathname === '/') {
      pageTitle = t('seo.homeTitle')
      pageDescription = t('seo.homeDescription')
    }

    const fullTitle = `${pageTitle} · Atlas Pokémon`
    document.title = fullTitle
    updateMeta('name', 'description', pageDescription)
    updateMeta('name', 'robots', title === t('error.notFoundTitle') ? 'noindex, follow' : 'index, follow')
    updateMeta('property', 'og:title', fullTitle)
    updateMeta('property', 'og:description', pageDescription)
    updateMeta('property', 'og:type', 'website')
    updateMeta('property', 'og:site_name', 'Atlas Pokémon')
    updateMeta('property', 'og:locale', language === 'pt-BR' ? 'pt_BR' : language === 'en' ? 'en_US' : 'es_ES')
    updateMeta('name', 'twitter:card', 'summary')
    updateMeta('name', 'twitter:title', fullTitle)
    updateMeta('name', 'twitter:description', pageDescription)
    updateCanonical(
      canonicalUrl(import.meta.env.VITE_SITE_URL, pathname, import.meta.env.VITE_ROUTER_MODE === 'history'),
    )
  }, [pathname, title, description, language, t])

  return null
}
