import { useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber, localizedApiTerm } from '../lib/api'
import { itemPrices } from '../lib/resource-data'
import { ResourceValue } from './ResourceValue'
import { SelectMenu } from './SelectMenu'

export function ItemPrices({ value }: { value: unknown }) {
  const { language, t } = useLanguage()
  const prices = itemPrices(value)
  const versions = [...new Set(prices.map((price) => price.version.name))]
  const [selected, setSelected] = useState('')
  const version = versions.includes(selected) ? selected : versions[0]
  return (
    <section className="info-card resource-tool">
      <h2>{t('tools.prices')}</h2>
      {versions.length ? (
        <>
          <SelectMenu
            icon={<Gamepad2 size={18} />}
            label={t('tools.game')}
            value={version}
            onChange={setSelected}
            options={versions.map((value) => ({ value, label: localizedApiTerm(value, language) }))}
          />
          <div className="tool-table-scroll" tabIndex={0} role="region" aria-label={t('tools.prices')}>
            <table className="tool-table">
              <thead>
                <tr>
                  <th scope="col">{t('tools.currency')}</th>
                  <th scope="col">{t('tools.purchase')}</th>
                  <th scope="col">{t('tools.sell')}</th>
                </tr>
              </thead>
              <tbody>
                {prices
                  .filter((price) => price.version.name === version)
                  .map((price, index) => (
                    <tr key={`${price.currency.name}-${index}`}>
                      <th scope="row">
                        <ResourceValue value={price.currency} />
                      </th>
                      <td>
                        {price.purchase === null ? t('tools.unavailablePrice') : formatNumber(price.purchase, language)}
                      </td>
                      <td>{price.sell === null ? t('tools.unavailablePrice') : formatNumber(price.sell, language)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>{t('tools.noData')}</p>
      )}
    </section>
  )
}
