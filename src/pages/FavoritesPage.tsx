import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FavoritePokemonCard } from '../components/FavoritePokemonCard'
import { useFavoritesContext } from '../contexts/FavoritesContext'

export function FavoritesPage() {
  const { favorites } = useFavoritesContext()
  return (
    <section className="page content-width">
      <div className="page-title"><div><span className="eyebrow">SUA COLEÇÃO</span><h1>Pokémon favoritos</h1><p>Seus companheiros ficam salvos neste dispositivo.</p></div></div>
      {favorites.length ? <div className="pokemon-grid">{favorites.map((name) => <FavoritePokemonCard key={name} name={name} />)}</div> : <div className="empty favorites-empty"><Heart /><h2>Sua coleção está vazia</h2><p>Toque no coração de um Pokémon para encontrá-lo rapidamente aqui.</p><Link to="/pokemon" className="button primary">Explorar Pokédex</Link></div>}
    </section>
  )
}
