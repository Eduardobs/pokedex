import { lazy, type ComponentType } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorState } from './components/ErrorState'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { HomePage } from './pages/HomePage'

function lazyPage<T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await load())[name] }))
}

const PokedexPage = lazyPage(() => import('./pages/PokedexPage'), 'PokedexPage')
const PokemonDetailPage = lazyPage(() => import('./pages/PokemonDetailPage'), 'PokemonDetailPage')
const FormsPage = lazyPage(() => import('./pages/FormsPage'), 'FormsPage')
const ExplorePage = lazyPage(() => import('./pages/ExplorePage'), 'ExplorePage')
const ResourceListPage = lazyPage(() => import('./pages/ResourceListPage'), 'ResourceListPage')
const ResourceDetailPage = lazyPage(() => import('./pages/ResourceDetailPage'), 'ResourceDetailPage')
const FavoritesPage = lazyPage(() => import('./pages/FavoritesPage'), 'FavoritesPage')
const TypesTablePage = lazyPage(() => import('./pages/TypesTablePage'), 'TypesTablePage')
const MapsPage = lazyPage(() => import('./pages/MapsPage'), 'MapsPage')
const KantoMapPage = lazyPage(() => import('./pages/KantoMapPage'), 'KantoMapPage')
const PaldeaMapPage = lazyPage(() => import('./pages/PaldeaMapPage'), 'PaldeaMapPage')
const KitakamiMapPage = lazyPage(() => import('./pages/KitakamiMapPage'), 'KitakamiMapPage')
const TerrariumMapPage = lazyPage(() => import('./pages/TerrariumMapPage'), 'TerrariumMapPage')
const HisuiMapPage = lazyPage(() => import('./pages/HisuiMapPage'), 'HisuiMapPage')
const LumioseMapPage = lazyPage(() => import('./pages/LumioseMapPage'), 'LumioseMapPage')

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
              <Route path="mapas" element={<MapsPage />} />
              <Route path="mapas/kanto" element={<KantoMapPage />} />
              <Route path="mapas/paldea" element={<PaldeaMapPage />} />
              <Route path="mapas/kitakami" element={<KitakamiMapPage />} />
              <Route path="mapas/terrarium" element={<TerrariumMapPage />} />
              <Route path="mapas/hisui-region" element={<HisuiMapPage />} />
              <Route path="mapas/lumiose-city" element={<LumioseMapPage />} />
              <Route
                path="*"
                element={<ErrorState titleKey="error.notFoundTitle" messageKey="error.notFoundDesc" home />}
              />
            </Route>
          </Routes>
        </FavoritesProvider>
      </LanguageProvider>
    </HashRouter>
  )
}
