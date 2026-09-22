import { lazy } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorState } from './components/ErrorState'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { HomePage } from './pages/HomePage'

const PokedexPage = lazy(() =>
  import('./pages/PokedexPage').then(({ PokedexPage }) => ({ default: PokedexPage })),
)
const PokemonDetailPage = lazy(() =>
  import('./pages/PokemonDetailPage').then(({ PokemonDetailPage }) => ({
    default: PokemonDetailPage,
  })),
)
const FormsPage = lazy(() =>
  import('./pages/FormsPage').then(({ FormsPage }) => ({ default: FormsPage })),
)
const ExplorePage = lazy(() =>
  import('./pages/ExplorePage').then(({ ExplorePage }) => ({ default: ExplorePage })),
)
const ResourceListPage = lazy(() =>
  import('./pages/ResourceListPage').then(({ ResourceListPage }) => ({
    default: ResourceListPage,
  })),
)
const ResourceDetailPage = lazy(() =>
  import('./pages/ResourceDetailPage').then(({ ResourceDetailPage }) => ({
    default: ResourceDetailPage,
  })),
)
const FavoritesPage = lazy(() =>
  import('./pages/FavoritesPage').then(({ FavoritesPage }) => ({ default: FavoritesPage })),
)
const TypesTablePage = lazy(() =>
  import('./pages/TypesTablePage').then(({ TypesTablePage }) => ({ default: TypesTablePage })),
)

export default function App() {
  return (
    <HashRouter>
      <LanguageProvider>
        <FavoritesProvider>
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
              <Route path="types-table" element={<TypesTablePage />} />
              <Route
                path="*"
                element={
                  <ErrorState titleKey="error.notFoundTitle" messageKey="error.notFoundDesc" home />
                }
              />
            </Route>
          </Routes>
        </FavoritesProvider>
      </LanguageProvider>
    </HashRouter>
  )
}
