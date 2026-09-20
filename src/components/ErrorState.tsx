import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../contexts/LanguageContext'

type Props = {
  title?: string
  message?: string
  titleKey?: TranslationKey
  messageKey?: TranslationKey
  retry?: () => void
  home?: boolean
}

export function ErrorState({ title, message, titleKey, messageKey, retry, home = false }: Props) {
  const { t } = useLanguage()
  return (
    <section className="state-page" role="alert">
      <div className="state-icon"><AlertTriangle /></div>
      <h1>{title ?? t(titleKey ?? 'error.title')}</h1><p>{message ?? t(messageKey ?? 'error.message')}</p>
      <div className="state-actions">
        {retry && <button type="button" className="button primary" onClick={retry}>{t('common.retry')}</button>}
        <Link to={home ? '/' : '/pokemon'} className="button secondary"><ArrowLeft size={18} /> {t(home ? 'error.home' : 'error.back')}</Link>
      </div>
    </section>
  )
}
