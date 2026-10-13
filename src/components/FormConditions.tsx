import { useLanguage, type TranslationKey } from '../contexts/LanguageContext'
import { array, record, reference } from '../lib/resource-data'
import { localizedApiTerm } from '../lib/api'
import { ResourceValue } from './ResourceValue'

const triggers: Record<string, TranslationKey> = {
  'held-item': 'tools.held-item',
  ability: 'tools.ability',
  move: 'tools.move',
  'gigantamax-factor': 'tools.gigantamax-factor',
}
export function FormConditions({ conditions }: { conditions: unknown }) {
  const { language, t } = useLanguage()
  const rows = array(conditions, 30)
  if (!rows.length) return null
  return (
    <section className="form-conditions">
      <h3>{t('tools.formGuide')}</h3>
      <ul>
        {rows.map((value, index) => {
          const row = record(value)
          const resource = reference(row)
          const base = reference(row.base_form)
          const trigger = typeof row.trigger === 'string' ? row.trigger : ''
          return (
            <li key={index}>
              <span>
                {triggers[trigger] ? t(triggers[trigger]) : localizedApiTerm(trigger, language) || t('tools.condition')}
              </span>
              {resource && <ResourceValue value={resource} />}
              {base && (
                <div>
                  {t('tools.baseForm')}: <ResourceValue value={base} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
