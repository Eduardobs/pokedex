import { useMemo, useState } from 'react'
import { Image } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { localizedApiTerm } from '../../lib/api'
import { spriteGallery } from '../../lib/sprite-gallery'
import type { Pokemon } from '../../types'
import { SelectMenu } from '../SelectMenu'
import { FallbackImage } from '../FallbackImage'

export function SpriteGallery({ sprites }: { sprites: Pokemon['sprites'] }) {
  const { language, t } = useLanguage()
  const groups = useMemo(() => spriteGallery(sprites), [sprites])
  const [selected, setSelected] = useState('')
  const [animate, setAnimate] = useState(false)
  const group = groups.find((entry) => entry.name === selected) ?? groups[0]
  const shown = group?.sprites.filter((sprite) => animate || !sprite.animated) ?? []
  const label = (key: string) =>
    [
      t(key.includes('back') ? 'detail.back' : 'detail.front'),
      t(key.includes('shiny') ? 'detail.shiny' : 'detail.normal'),
      ...(key.includes('female') ? [t('tools.female')] : []),
      ...(key.includes('gray') ? [t('tools.gray')] : []),
      ...(key.includes('transparent') ? [t('tools.transparent')] : []),
    ].join(' · ')
  return (
    <article className="info-card technical-card sprites-card resource-tool">
      <h2>
        <Image />
        {t('tools.gallery')}
      </h2>
      {!!groups.length && (
        <SelectMenu
          icon={<Image size={18} />}
          label={t('tools.gallerySource')}
          value={group.name}
          onChange={setSelected}
          options={groups.map(({ name }) => ({
            value: name,
            label: name
              ? name
                  .split('/')
                  .filter((part) => part !== 'versions' && part !== 'other')
                  .map((part) => localizedApiTerm(part, language))
                  .join(' · ')
              : t('detail.normal'),
          }))}
        />
      )}
      <label className="tool-checkbox">
        <input type="checkbox" checked={animate} onChange={(event) => setAnimate(event.target.checked)} />
        {t('tools.animation')}
      </label>
      {shown.length ? (
        <div className="sprite-grid">
          {shown.map((sprite) => (
            <figure key={sprite.url + sprite.key}>
              <FallbackImage
                sources={[{ src: sprite.url }]}
                alt={label(sprite.key)}
                width="96"
                height="96"
                loading="lazy"
              />
              <figcaption>{label(sprite.key)}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p>{t('tools.noData')}</p>
      )}
    </article>
  )
}
