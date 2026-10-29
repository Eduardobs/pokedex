import { BookOpen, Compass, Heart, House, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

const destinations = [
  { to: '/', icon: House, label: 'nav.home' },
  { to: '/pokemon', icon: BookOpen, label: 'nav.pokedex' },
  { to: '/explore', icon: Compass, label: 'nav.explore' },
  { to: '/teams', icon: UsersRound, label: 'nav.teamShortcut' },
  { to: '/favorites', icon: Heart, label: 'nav.favorites' },
] as const

export function PrimaryShortcuts() {
  const { t } = useLanguage()
  return (
    <nav className="primary-shortcuts" aria-label={t('nav.shortcuts')}>
      {destinations.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} aria-label={t('nav.open', { destination: t(label) })}>
          <Icon size={21} aria-hidden="true" />
          <span>{t(label)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
