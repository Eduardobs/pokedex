# Atlas Pokémon

Atlas Pokémon is a responsive Pokémon encyclopedia built with React, TypeScript, and Vite. It combines the public [PokéAPI](https://pokeapi.co/) with a focused interface for browsing the National Pokédex, comparing type matchups, inspecting special forms, and exploring the API's wider data model.

The application is a client-side static site: it has no application server or database, and can be hosted on GitHub Pages or any static-file host.

## Highlights

- **National Pokédex** with name/number search, type filtering, infinite scrolling, rarity indicators, and sorting by name, number, or base stats.
- **Detailed Pokémon pages** with species information, training and breeding data, complete evolution requirements, abilities, forms, shiny sprites, cries, held items, game indices, present and past base stats, defensive type matchups, compatible moves, and version-filtered encounter methods, levels, chances, and conditions.
- **Special forms catalog** for regional variants, Mega Evolutions, and Gigantamax forms.
- **Pokémon type chart** with an interactive damage calculator for one or two defending types.
- **Interactive game maps** for FireRed/LeafGreen's Kanto, Scarlet/Violet's Paldea, Kitakami, and Terarium, and Legends: Arceus's Hisui, with cataloged pins, clustering, category filters, search, panning, and progressive-resolution zoom.
- **Favorites** saved locally in the browser, including search and sorting. Up to 200 favorites can be stored per device.
- **API explorer** covering PokéAPI v2 collections such as moves, abilities, items, berries, regions, locations, generations, versions, evolution chains, encounters, contests, and languages.
- **Internationalization** for Portuguese (Brazil), English, and Spanish. The selected language is remembered locally.
- **Light and dark themes**, responsive layouts, keyboard-friendly controls, loading and error states, and reduced-motion support.
- **Code splitting** for secondary pages, so route-specific code is loaded on demand.

## Application routes

| Route | Purpose |
| --- | --- |
| `#/` | Home page and featured Pokémon |
| `#/pokemon` | Searchable and sortable National Pokédex |
| `#/pokemon/:name` | Pokémon detail page |
| `#/formas` | Regional, Mega, and Gigantamax forms |
| `#/types-table` | Type effectiveness table and calculator |
| `#/mapas` | Available interactive game maps |
| `#/mapas/kanto` | Interactive FireRed/LeafGreen map of Kanto |
| `#/mapas/paldea` | Interactive Scarlet/Violet map of Paldea |
| `#/mapas/kitakami` | Interactive Scarlet/Violet map of Kitakami |
| `#/mapas/terrarium` | Interactive Scarlet/Violet map of the Terarium |
| `#/mapas/hisui-region` | Interactive Pokémon Legends: Arceus map of Hisui |
| `#/mapas/lumiose-city` | Interactive Pokémon Legends: Z-A map of Lumiose City |
| `#/favoritos` | Locally stored favorites |
| `#/explorar` | Categories from the PokéAPI encyclopedia |
| `#/explorar/:resource` | Paginated records for an API collection |
| `#/explorar/:resource/:name` | Details for an individual API record |

The app uses `HashRouter`, which makes the same build work at both a domain root and a GitHub Pages project path without server-side rewrite rules.

## Requirements

- Node.js **22.22.2 or newer**
- npm (the repository includes a lockfile, so use `npm ci` for reproducible installs in CI)
- Network access to the PokéAPI REST API and, for some classifications, its GraphQL endpoint

## Getting started

Clone the repository, install the exact dependency versions, and start the Vite development server:

```bash
git clone <repository-url>
cd pokedex
npm ci
npm run dev
```

Vite will print the local URL in the terminal. The development server supports hot module replacement.

To serve a production build locally:

```bash
npm run build
npm run preview
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check the project and create `dist/` |
| `npm run preview` | Serve the generated production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm test` | Run the Vitest test suite once |
| `npm run release:patch` | Increment the patch version and create a Git commit and tag |
| `npm run release:minor` | Increment the minor version and create a Git commit and tag |
| `npm run release:major` | Increment the major version and create a Git commit and tag |
| `npm run check` | Run linting, tests, and the production build |

Before opening a pull request, run:

```bash
npm run check
```

## Versioning

The project follows [Semantic Versioning](https://semver.org/) and starts at `0.0.1` while it is in alpha. The version in `package.json` is the source of truth and is kept in sync with `package-lock.json` by npm.

During the `0.x` phase:

- Use `npm run release:patch` for fixes and small compatible improvements.
- Use `npm run release:minor` for larger changes or changes that may break existing behavior.
- Reserve `npm run release:major` for the first stable release (`1.0.0`) and later breaking changes.

Each release command updates the package files, creates a version commit, and adds a Git tag such as `v0.0.2`. Run it only from a clean working tree after `npm run check` succeeds, then push the commit and tag with `git push --follow-tags`.

## Project structure

```text
src/
├── components/       Reusable UI, cards, badges, loading, and error states
├── config/           API, network, storage, and catalog configuration
├── contexts/         Shared language and favorites state
├── data/             API resource catalog and summary helpers
├── hooks/            Async data, infinite scrolling, visibility, and favorites hooks
├── i18n/             Translation dictionaries for supported languages
├── lib/              API access, caching, persistence, sorting, and domain logic
├── pages/            Route-level screens
└── test/             Shared test setup
```

The main data flow is intentionally layered:

- `src/lib/api-client.ts` owns validated HTTP access, request cancellation, caching, timeouts, and request deduplication.
- `src/lib/api.ts` provides the Pokémon-specific API facade and maps remote data into UI-friendly structures.
- Hooks and contexts coordinate asynchronous data and shared interface state.
- Pages compose screens, while components focus on presentation and user interaction.
- `PokemonCatalogFilters` and `usePokemonCatalogDetails` centralize the shared catalog controls and on-demand metadata used by the Pokédex and form directory.
- `GameMapPage` owns shared map navigation and filtering; each region provides a validated local marker catalog and tile configuration under `src/data/`.
- `src/data/game-map.ts` prepares and validates the shared category, marker, and total-count contract for every regional map.

## Data, caching, and persistence

Atlas Pokémon reads data from the following fixed endpoints:

- REST: `https://pokeapi.co/api/v2`
- GraphQL: `https://graphql.pokeapi.co/v1beta2`
- Game map tiles: `https://tiles.mapgenie.io/games`

REST responses use an in-memory LRU-style cache with a maximum of 250 entries and a five-minute TTL. Concurrent requests for the same URL share one underlying request, while each consumer retains independent cancellation. Requests time out after 15 seconds.
REST payloads are limited to 8 MiB and checked for a JSON content type and bounded nesting, collection sizes, object keys, and strings before being cached or rendered.

The browser's `localStorage` stores favorites, language, and theme preferences. Stored values are validated before use, and storage failures gracefully fall back to in-memory defaults. Clearing site data removes these preferences and favorites.

## Security and reliability

- API URLs are restricted to the documented HTTPS PokéAPI origin and API path.
- Route parameters are encoded before being used in requests.
- The Content Security Policy limits scripts, connections, images, media, fonts, and forms to the origins required by the application.
- Invalid API responses, timeouts, and unavailable resources produce user-facing error states.
- A top-level error boundary prevents an isolated rendering failure from taking down the whole page.
- The application does not require API keys or expose private configuration.
- GitHub Actions are pinned to exact commits, and Pages/OIDC write permissions are isolated to the deployment job.

## Deployment to GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on pushes to `main` or `master`, and can also be started manually from the **Actions** tab. It:

1. Installs dependencies with `npm ci`.
2. Runs ESLint, Vitest, and the TypeScript/Vite production build.
3. Uploads `dist/` as a Pages artifact.
4. Deploys the artifact to GitHub Pages.

To enable deployment for a repository:

1. Open **Settings → Pages** on GitHub.
2. Select **GitHub Actions** under **Build and deployment**.
3. Push to `main`/`master`, or run **Deploy to GitHub Pages** manually.

Because routing uses hash URLs and assets are built by Vite, no additional base-path or rewrite configuration is required for a project site such as `https://<user>.github.io/<repository>/`.

## Technology stack

- React 19 and React DOM
- TypeScript 7
- Vite 8
- React Router 7
- Lucide React icons
- Vitest, JSDOM, and Testing Library
- GitHub Actions and GitHub Pages

## Attribution

Pokémon data is provided by the community-maintained [PokéAPI](https://pokeapi.co/). The FireRed/LeafGreen Kanto, Scarlet/Violet Paldea, Kitakami, and Terarium, Legends: Arceus Hisui, and Legends: Z-A Lumiose City map tiles and factual location catalogs are provided by [MapGenie](https://mapgenie.io/), and game cover artwork is presented for identification. Pokémon and Pokémon character names are trademarks of their respective owners. This project is an independent, non-commercial interface and is not affiliated with Nintendo, Creatures Inc., Game Freak, The Pokémon Company, or MapGenie.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for the full text.
