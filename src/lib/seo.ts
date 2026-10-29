export function normalizeSiteUrl(value: string | undefined) {
  if (!value) return undefined
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_SITE_URL must be an absolute HTTP(S) URL without credentials, query, or fragment')
  }
  return `${url.href.replace(/\/+$/, '')}/`
}

export function canonicalUrl(siteUrl: string | undefined, pathname: string, historyRouting: boolean) {
  const base = normalizeSiteUrl(siteUrl)
  if (!base) return undefined
  return historyRouting ? new URL(pathname.replace(/^\/+/, ''), base).href : base
}

export function updateMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = content
}

export function updateCanonical(url: string | undefined) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!url) {
    existing?.remove()
    document.head.querySelector('meta[property="og:url"]')?.remove()
    return
  }
  const link = existing ?? document.createElement('link')
  link.rel = 'canonical'
  link.href = url
  if (!existing) document.head.append(link)
  updateMeta('property', 'og:url', url)
}
