import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ExplorePage } from './pages/ExplorePage'
import { FavoritesPage } from './pages/FavoritesPage'
import { FormsPage } from './pages/FormsPage'
import { HomePage } from './pages/HomePage'
import { PokedexPage } from './pages/PokedexPage'
import { PokemonDetailPage } from './pages/PokemonDetailPage'
import { ResourceDetailPage } from './pages/ResourceDetailPage'
import { ResourceListPage } from './pages/ResourceListPage'

export default function App() {
  return (
    <HashRouter>
      <LanguageProvider><FavoritesProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="pokemon" element={<PokedexPage />} />
            <Route path="pokemon/:name" element={<PokemonDetailPage />} />
            <Route path="formas" element={<FormsPage />} />
            <Route path="explorar" element={<ExplorePage />} />
            <Route path="explorar/:resource" element={<ResourceListPage />} />
            <Route path="explorar/:resource/:name" element={<ResourceDetailPage />} />
            <Route path="favoritos" element={<FavoritesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </FavoritesProvider></LanguageProvider>
    </HashRouter>
  )
}
