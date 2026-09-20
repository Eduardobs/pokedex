import { Compass, Heart, Menu, Search, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { Logo } from './Logo'

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { favorites } = useFavoritesContext()

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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por nome ou número..." aria-label="Buscar Pokémon" />
          <kbd>↵</kbd>
        </form>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Navegação principal">
          <NavLink to="/pokemon" onClick={() => setMenuOpen(false)}>Pokédex</NavLink>
          <NavLink to="/explorar" onClick={() => setMenuOpen(false)}><Compass size={17} /> Explorar</NavLink>
          <NavLink to="/favoritos" onClick={() => setMenuOpen(false)}><Heart size={17} /> Favoritos <span className="nav-count">{favorites.length}</span></NavLink>
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Alternar menu">{menuOpen ? <X /> : <Menu />}</button>
      </header>
      <main><Outlet /></main>
      <footer>
        <Logo />
        <p>Dados fornecidos pela <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokéAPI</a>. Feito para treinadores curiosos.</p>
      </footer>
    </div>
  )
}
