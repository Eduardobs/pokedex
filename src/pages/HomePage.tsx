import { ArrowRight, BookOpen, Database, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { resourceGroups } from '../data/resources'

const featured = [
  { id: 1, name: 'bulbasaur', color: '#74c856' },
  { id: 4, name: 'charmander', color: '#f07a46' },
  { id: 7, name: 'squirtle', color: '#5bb7db' },
  { id: 25, name: 'pikachu', color: '#f2c94c' },
]

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> SEU GUIA PARA O MUNDO POKÉMON</span>
          <h1>Descubra. Explore.<br /><em>Capture conhecimento.</em></h1>
          <p>De Kanto a Paldea, conheça espécies, habilidades, evoluções, itens, regiões e cada detalhe deste universo.</p>
          <div className="hero-actions">
            <Link to="/pokemon" className="button primary">Abrir Pokédex <ArrowRight size={18} /></Link>
            <Link to="/explorar" className="button secondary">Explorar universo</Link>
          </div>
          <div className="hero-stats">
            <span><b>1.000+</b> Pokémon</span><span><b>20</b> tipos</span><span><b>9</b> gerações</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Pokémon em destaque">
          <div className="hero-rings" />
          {featured.map((pokemon, index) => (
            <Link to={`/pokemon/${pokemon.name}`} key={pokemon.name} className={`hero-pokemon p${index + 1}`} style={{ '--accent': pokemon.color } as React.CSSProperties}>
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`} alt={pokemon.name} />
            </Link>
          ))}
          <div className="hero-ball"><span /></div>
        </div>
      </section>

      <section className="quick-section content-width">
        <div className="section-heading"><div><span className="eyebrow">COMECE A EXPLORAR</span><h2>Todo o universo em um só lugar</h2></div><Link to="/explorar">Ver todas as categorias <ArrowRight size={17} /></Link></div>
        <div className="quick-grid">
          <Link to="/pokemon" className="quick-card red"><div className="quick-icon"><BookOpen /></div><div><h3>Pokédex Nacional</h3><p>Conheça todos os Pokémon, seus atributos e evoluções.</p></div><ArrowRight /></Link>
          <Link to="/explorar/move" className="quick-card purple"><div className="quick-icon"><Sparkles /></div><div><h3>Golpes e habilidades</h3><p>Compare poder, precisão, efeitos e formas de aprender.</p></div><ArrowRight /></Link>
          <Link to="/explorar/region" className="quick-card green"><div className="quick-icon"><MapPin /></div><div><h3>Regiões e locais</h3><p>Viaje por regiões, cidades e áreas de encontro.</p></div><ArrowRight /></Link>
          <Link to="/explorar" className="quick-card blue"><div className="quick-icon"><Database /></div><div><h3>Enciclopédia completa</h3><p>Acesse {resourceGroups.reduce((sum, group) => sum + group.resources.length, 0)} coleções da API.</p></div><ArrowRight /></Link>
        </div>
      </section>
    </>
  )
}
