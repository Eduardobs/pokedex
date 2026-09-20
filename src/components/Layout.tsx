import { Compass, Heart, Languages, Menu, Moon, Search, Sparkles, Sun, X } from 'lucide-react'
import { Suspense, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { Language, useLanguage } from '../contexts/LanguageContext'
import { STORAGE_KEYS } from '../config/app'
import { writeStorageString } from '../lib/storage'
import { Logo } from './Logo'
import { Loading } from './Loading'

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const navigate = useNavigate()
  const { favorites } = useFavoritesContext()
  const { language, setLanguage, t } = useLanguage()

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.colorScheme = nextTheme
    writeStorageString(STORAGE_KEYS.theme, nextTheme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      nextTheme === 'dark' ? '#101419' : '#e33535',
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = query.trim().toLowerCase().replace(/\s+/g, '-')
    if (value) { navigate(`/pokemon/${value}`); setQuery(''); setMenuOpen(false) }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand"><Logo /></NavLink>
        <form className="global-search" onSubmit={submit} role="search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('nav.searchPlaceholder')} aria-label={t('nav.searchLabel')} maxLength={64} autoComplete="off" />
          <kbd>↵</kbd>
        </form>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label={t('nav.main')}>
          <NavLink to="/pokemon" onClick={() => setMenuOpen(false)}>{t('nav.pokedex')}</NavLink>
          <NavLink to="/formas" onClick={() => setMenuOpen(false)}><Sparkles size={17} /> {t('nav.forms')}</NavLink>
          <NavLink to="/explorar" onClick={() => setMenuOpen(false)}><Compass size={17} /> {t('nav.explore')}</NavLink>
          <NavLink to="/favoritos" onClick={() => setMenuOpen(false)}><Heart size={17} /> {t('nav.favorites')} <span className="nav-count">{favorites.length}</span></NavLink>
        </nav>
        <label className="language-select" title={t('language.label')}>
          <Languages size={17} aria-hidden="true" />
          <span className="sr-only">{t('language.label')}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t('language.label')}>
            <option value="pt-BR">PT</option><option value="en">EN</option><option value="es">ES</option>
          </select>
        </label>
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? t('theme.dark') : t('theme.light')}
          title={theme === 'light' ? t('theme.dark') : t('theme.light')}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={t('nav.menu')}>{menuOpen ? <X /> : <Menu />}</button>
      </header>
      <main><Suspense fallback={<Loading />}><Outlet /></Suspense></main>
      <footer>
        <Logo />
        <p>{t('footer.text').split('PokéAPI')[0]}<a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokéAPI</a>{t('footer.text').split('PokéAPI')[1]}</p>
      </footer>
    </div>
  )
}
