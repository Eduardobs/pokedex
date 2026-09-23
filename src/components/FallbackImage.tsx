import { useState, type ImgHTMLAttributes } from 'react'

export type FallbackImageSource = {
  src: string
  alt?: string
  className?: string
}

type FallbackImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'alt' | 'className' | 'onError'
> & {
  sources: readonly FallbackImageSource[]
  alt: string
  className?: string
  preserveLastOnError?: boolean
}

export function FallbackImage({
  sources,
  alt,
  className,
  preserveLastOnError = false,
  ...imageProps
}: FallbackImageProps) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const source = sources[sourceIndex]
  if (!source) return null

  return (
    <img
      {...imageProps}
      src={source.src}
      alt={source.alt ?? alt}
      className={source.className ?? className}
      onError={() => {
        const nextIndex = sourceIndex + 1
        if (nextIndex < sources.length || !preserveLastOnError) setSourceIndex(nextIndex)
      }}
    />
  )
}
