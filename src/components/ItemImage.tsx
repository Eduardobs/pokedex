import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { Gem, type LucideIcon } from 'lucide-react'
import { itemSpriteSources } from '../lib/api'

type ItemImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  name: string
  preferredSource?: string | null
  fallbackIcon?: LucideIcon
  fallbackClassName?: string
}

export function ItemImage({
  name,
  preferredSource,
  fallbackIcon: FallbackIcon = Gem,
  fallbackClassName,
  ...imageProps
}: ItemImageProps) {
  const sources = itemSpriteSources(name, preferredSource)
  const [sourceIndex, setSourceIndex] = useState(0)

  useEffect(() => setSourceIndex(0), [name, preferredSource])

  const source = sources[sourceIndex]
  if (!source) {
    const fallback = <FallbackIcon className="item-image-fallback" aria-hidden="true" />
    return fallbackClassName ? <span className={fallbackClassName}>{fallback}</span> : fallback
  }

  return <img {...imageProps} src={source} onError={() => setSourceIndex((index) => index + 1)} />
}
