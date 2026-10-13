import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { localizedApiTerm, localizedTextResult } from '../lib/api'
import { array, record, reference } from '../lib/resource-data'
import { SelectMenu } from './SelectMenu'

export function VersionDescriptions({ entries }: { entries: unknown }) {
  const { language, apiLanguage, t } = useLanguage()
  const [selected, setSelected] = useState('')
  const rows = array(entries)
  const versions = [
    ...new Set(
      rows.flatMap((entry) => {
        const row = record(entry)
        const version = reference(row.version ?? row.version_group)
        return version ? [version.name] : []
      }),
    ),
  ]
  const version = versions.includes(selected) ? selected : versions[0]
  const text = localizedTextResult(
    rows.filter((entry) => {
      const row = record(entry)
      return reference(row.version ?? row.version_group)?.name === version
    }),
    undefined,
    apiLanguage,
  )
  if (!versions.length) return null
  return (
    <section className="info-card resource-tool">
      <h2>{t('tools.versionDescriptions')}</h2>
      <SelectMenu
        icon={<BookOpen size={18} />}
        label={t('tools.game')}
        value={version}
        onChange={setSelected}
        options={versions.map((value) => ({ value, label: localizedApiTerm(value, language) }))}
      />
      <p lang={text.language}>{text.text || t('tools.noData')}</p>
      {text.fallback && <small className="language-fallback">{t('detail.fallbackLanguage')}</small>}
    </section>
  )
}
