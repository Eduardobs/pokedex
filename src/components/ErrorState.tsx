import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

export function ErrorState({ title, message }: { title?: string; message?: string }) {
  const { t } = useLanguage()
  return (
    <section className="state-page">
      <div className="state-icon"><AlertTriangle /></div>
      <h1>{title ?? t('error.title')}</h1><p>{message ?? t('error.message')}</p>
      <Link to="/pokemon" className="button"><ArrowLeft size={18} /> {t('error.back')}</Link>
    </section>
  )
}
