import {
  Check,
  ChevronDown,
  Compass,
  Grid3X3,
  Heart,
  Languages,
  MapPinned,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { Language, useLanguage } from '../contexts/LanguageContext'
import { STORAGE_KEYS } from '../config/app'
import { writeStorageString } from '../lib/storage'
import { Logo } from './Logo'
import { Loading } from './Loading'
import { ScrollToTop } from './ScrollToTop'

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const headerRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const previousPathnameRef = useRef<string | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const languageRef = useRef<HTMLDivElement>(null)
  const languageButtonRef = useRef<HTMLButtonElement>(null)
  const languageOptionRefs = useRef<Record<Language, HTMLButtonElement | null>>({
    'pt-BR': null,
    en: null,
    es: null,
  })
  const { favorites, notice, clearNotice, toggle } = useFavoritesContext()
  const { language, setLanguage, t } = useLanguage()

  const routeTitle = location.pathname.startsWith('/pokemon/')
    ? t('pokedex.title')
    : location.pathname === '/pokemon'
      ? t('nav.pokedex')
      : location.pathname === '/formas'
        ? t('nav.forms')
        : location.pathname === '/types-table'
          ? t('typesTable.title')
          : location.pathname === '/mapas/kanto'
            ? t('maps.kantoTitle')
            : location.pathname === '/mapas/paldea'
              ? t('maps.paldeaTitle')
              : location.pathname === '/mapas/kitakami'
                ? t('maps.kitakamiTitle')
                : location.pathname === '/mapas/terrarium'
                  ? t('maps.terrariumTitle')
                  : location.pathname === '/mapas/hisui-region'
                    ? t('maps.hisuiTitle')
                    : location.pathname === '/mapas/lumiose-city'
                      ? t('maps.lumioseTitle')
                      : location.pathname === '/mapas'
                        ? t('maps.title')
                        : location.pathname === '/favoritos'
                          ? t('nav.favorites')
                          : location.pathname.startsWith('/explorar')
                            ? t('nav.explore')
                            : location.pathname === '/'
                              ? 'Atlas Pokémon'
                              : t('error.notFoundTitle')
  const routeDescription = location.pathname.startsWith('/pokemon/')
    ? t('pokedex.description')
    : location.pathname === '/pokemon'
      ? t('pokedex.description')
      : location.pathname === '/formas'
        ? t('forms.description')
        : location.pathname === '/types-table'
          ? t('typesTable.description')
          : location.pathname.startsWith('/mapas')
            ? t('maps.description')
            : location.pathname === '/favoritos'
              ? t('favorites.description')
              : location.pathname.startsWith('/explorar')
                ? t('explore.description')
                : location.pathname === '/'
                  ? t('home.description')
                  : t('error.notFoundDesc')

  useEffect(() => {
    document.title = routeTitle === 'Atlas Pokémon' ? routeTitle : `${routeTitle} · Atlas Pokémon`
    document.querySelector('meta[name="description"]')?.setAttribute('content', routeDescription)
  }, [routeDescription, routeTitle])

  useEffect(() => {
    if (previousPathnameRef.current === location.pathname) return
    previousPathnameRef.current = location.pathname
    setMenuOpen(false)
    if (navigationType !== 'POP') window.scrollTo({ top: 0, behavior: 'auto' })
    window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }))
  }, [location.pathname, navigationType])

  useEffect(() => {
    if (!menuOpen) return
    const nav = document.getElementById('main-navigation')
    const focusable = Array.from(nav?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
    window.requestAnimationFrame(() => focusable[0]?.focus())
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
      if (event.key !== 'Tab' || !focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!languageOpen) return
    window.requestAnimationFrame(() => languageOptionRefs.current[language]?.focus())
    const closeLanguageMenu = (event: PointerEvent) => {
      if (!languageRef.current?.contains(event.target as Node)) setLanguageOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLanguageOpen(false)
        languageButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeLanguageMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeLanguageMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [language, languageOpen])

  const handleLanguageTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setLanguageOpen(true)
  }

  const handleLanguageOptionsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const languages: Language[] = ['pt-BR', 'en', 'es']
    const currentIndex = languages.findIndex((item) => languageOptionRefs.current[item] === document.activeElement)
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? languages.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % languages.length
            : event.key === 'ArrowUp'
              ? (currentIndex - 1 + languages.length) % languages.length
              : -1
    if (nextIndex < 0) return
    event.preventDefault()
    languageOptionRefs.current[languages[nextIndex]]?.focus()
  }

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(clearNotice, 4500)
    return () => window.clearTimeout(timeout)
  }, [clearNotice, notice])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.colorScheme = nextTheme
    writeStorageString(STORAGE_KEYS.theme, nextTheme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', nextTheme === 'dark' ? '#101419' : '#e33535')
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (value) {
      navigate(`/pokemon?q=${encodeURIComponent(value)}`)
      setQuery('')
      setMenuOpen(false)
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t('nav.skip')}
      </a>
      <header className="topbar" ref={headerRef}>
        <NavLink to="/" className="brand">
          <Logo />
        </NavLink>
        <form className="global-search" onSubmit={submit} role="search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            aria-label={t('nav.searchLabel')}
            maxLength={64}
            autoComplete="off"
            enterKeyHint="search"
          />
          {query ? (
            <button className="search-clear" type="button" onClick={() => setQuery('')} aria-label={t('common.clear')}>
              <X size={15} />
            </button>
          ) : (
            <kbd>↵</kbd>
          )}
        </form>
        <nav id="main-navigation" className={menuOpen ? 'nav open' : 'nav'} aria-label={t('nav.main')}>
          <NavLink to="/pokemon" onClick={() => setMenuOpen(false)}>
            {t('nav.pokedex')}
          </NavLink>
          <NavLink to="/formas" onClick={() => setMenuOpen(false)}>
            <Sparkles size={17} /> {t('nav.forms')}
          </NavLink>
          <NavLink to="/explorar" onClick={() => setMenuOpen(false)}>
            <Compass size={17} /> {t('nav.explore')}
          </NavLink>
          <NavLink to="/types-table" onClick={() => setMenuOpen(false)}>
            <Grid3X3 size={17} /> {t('nav.types')}
          </NavLink>
          <NavLink to="/mapas" onClick={() => setMenuOpen(false)}>
            <MapPinned size={17} /> {t('nav.maps')}
          </NavLink>
          <NavLink to="/favoritos" onClick={() => setMenuOpen(false)}>
            <Heart size={17} /> {t('nav.favorites')} <span className="nav-count">{favorites.length}</span>
          </NavLink>
        </nav>
        <div
          className="language-select"
          ref={languageRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setLanguageOpen(false)
          }}
        >
          <button
            ref={languageButtonRef}
            className="language-select-trigger"
            type="button"
            aria-label={t('language.label')}
            aria-haspopup="listbox"
            aria-expanded={languageOpen}
            aria-controls="language-options"
            onClick={() => setLanguageOpen((open) => !open)}
            onKeyDown={handleLanguageTriggerKeyDown}
          >
            <Languages className="language-icon" size={17} aria-hidden="true" />
            <span>{language === 'pt-BR' ? 'PT' : language.toUpperCase()}</span>
            <ChevronDown className={languageOpen ? 'open' : ''} size={14} aria-hidden="true" />
          </button>
          {languageOpen && (
            <div
              className="language-options"
              id="language-options"
              role="listbox"
              aria-label={t('language.label')}
              onKeyDown={handleLanguageOptionsKeyDown}
            >
              {(['pt-BR', 'en', 'es'] as Language[]).map((item) => (
                <button
                  ref={(node) => {
                    languageOptionRefs.current[item] = node
                  }}
                  type="button"
                  role="option"
                  aria-selected={language === item}
                  tabIndex={language === item ? 0 : -1}
                  key={item}
                  onClick={() => {
                    setLanguage(item)
                    setLanguageOpen(false)
                    languageButtonRef.current?.focus()
                  }}
                >
                  <span className="language-code">{item === 'pt-BR' ? 'PT' : item.toUpperCase()}</span>
                  <span>{t(`language.${item}`)}</span>
                  {language === item && <Check size={15} aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
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
        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={t('nav.menu')}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      <p className="sr-only" aria-live="polite">
        {routeTitle}
      </p>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <div className="floating-actions">
        {notice && (
          <div className="favorite-toast" role="status">
            <span>
              {notice.action === 'limit'
                ? t('favorites.limit')
                : t(notice.action === 'added' ? 'favorites.added' : 'favorites.removed', {
                    name: notice.name,
                  })}
            </span>
            {notice.action !== 'limit' && (
              <button
                type="button"
                onClick={() => {
                  toggle(notice.name)
                  clearNotice()
                }}
              >
                {t('favorites.undo')}
              </button>
            )}
            <button type="button" className="toast-close" onClick={clearNotice} aria-label={t('common.clear')}>
              <X size={16} />
            </button>
          </div>
        )}
        <ScrollToTop />
      </div>
      <footer>
        <Logo />
        <p>
          {t('footer.text').split('PokéAPI')[0]}
          <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">
            PokéAPI
          </a>
          {t('footer.text').split('PokéAPI')[1]}
        </p>
      </footer>
    </div>
  )
}
