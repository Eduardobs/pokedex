# Complete screen presentation inventory

## Direction and scope

[Stitch project: Clear visual discovery](https://stitch.withgoogle.com/projects/13217619331164250601) supplies the current reference. The revised presentation uses artwork-led catalogs, grouped category panels, compact quick facts, and distinct overview, editing, and comparison workspaces. It replaces the sparse chapter/ledger treatment. Generated cry controls, Japanese labels, speculative competitive advice, and invented data are excluded; all existing application behavior and semantic type colors remain authoritative.

`src/components/NotebookSection.tsx` provides accessible section composition. `src/styles/notebook.css` implements the responsive reading patterns after the shared visual tokens in `field-guide.css`. Headings no longer display decorative chapter numbers. Light and dark themes share the same layout and hierarchy.

## Route inventory

Every route declaration in `src/App.tsx` is included below. Dynamic records share presentation templates, and all 50 Explore endpoint families are exercised separately with deterministic reference data.

| Route                      | New information pattern                                                   | Additional views                                                                        |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `/`                        | Search-first introduction, featured artwork and destination cards         | Random highlight and three fixed starter links                                          |
| `/pokemon`                 | Responsive cards with prominent artwork, identity, types and sorting fact | Filters, query, shiny, pagination                                                       |
| `/forms`                   | Variation cards with full names and category/variation facts              | Regional, Mega, Gigantamax, all categories                                              |
| `/favorites`               | Personal collection of Pokémon cards                                      | Populated, truly empty and filtered empty states                                        |
| `/pokemon/:name`           | Framed identity and quick facts followed by a grouped overview dashboard  | Overview, Evolution, Moves, Encounters, Data, 3D                                        |
| `/explore`                 | Category panels with descriptive headings and icon-led destinations       | Search and resource group selection                                                     |
| `/explore/:resource`       | Numbered collection rows with identity and metadata lanes                 | Ordinary, Pokémon, item, berry, move, ability, type, gender, damage-class lists         |
| `/explore/:resource/:name` | Summary metric tiles, full-width prose and grouped relationship records   | Supplemental moves, prices, growth curve, form conditions, historical data              |
| `/teams`                   | Roster tabs and separate build, moves and training panels                 | Full labels, complete item descriptions, labeled EV/IV records, team actions            |
| `/battle`                  | Preparation panel, stable arena, two-column actions and readable history  | Preparation, active battle, replacement, details, complete tooltip descriptions, result |
| `/compare-moves`           | Paired selectors, desktop comparison table and labeled mobile records     | Effects and historical values                                                           |
| `/types-table`             | Generation selector, framed calculator and keyboard-accessible matrix     | Historical types and keyboard matrix                                                    |
| `/maps`                    | Visual game-cover cards with clear regional entry points                  | Kanto, Hisui, Lumiose, Paldea, Kitakami, Terarium                                       |
| `/maps/kanto`              | Map fact strip, filter register and geographic viewport                   | Mobile overlay, zoom, point details                                                     |
| `/maps/paldea`             | Map fact strip, filter register and geographic viewport                   | Mobile overlay, zoom, point details                                                     |
| `/maps/kitakami`           | Map fact strip, filter register and geographic viewport                   | Mobile overlay, zoom, point details                                                     |
| `/maps/terrarium`          | Map fact strip, filter register and geographic viewport                   | Mobile overlay, zoom, point details                                                     |
| `/maps/hisui-region`       | Map fact strip, filter register and geographic viewport                   | Mobile overlay, zoom, point details                                                     |
| `/maps/lumiose-city`       | Map fact strip, filter register and geographic viewport                   | Mobile overlay, zoom, point details                                                     |
| `*`                        | Recovery slate with diagnostic text and action strip                      | Not found, API failure, retry                                                           |

## Text contract

- Words are not forcibly split. Normal wrapping between words is intentional and necessary at 320px and with enlarged text.
- Names, descriptions and selected values do not use ellipses or line clamps. Rows expand to fit their contents.
- Mobile catalogs use one record per row. Artwork is separated from the identity lane; long names have sufficient width.
- Training, comparison and structured resource tables expose labels beside each record value instead of squeezing a desktop table into the phone viewport. Their native table structure remains available to assistive technology.
- Whole matrices and evolution diagrams retain their intentional, keyboard-accessible inspection viewports. Their data is not hidden to force them into a narrow column.
- Map geography, intrinsic battle sprite dimensions and battle order remain intact.

## Verification

`e2e/presentation.spec.ts` traverses each collection list and detail, each top-level/map route, all six Pokémon tabs, the populated team editor, battle preparation and active battle, and language/long-option cases. It tests actual rendered word rectangles, clipping ancestors, and page overflow. Reference fixtures supply repeatable content without depending on a live API. This checks every screen template and collection family; it does not claim to test every Pokémon or every remote record.

The existing suites additionally exercise filters, keyboard navigation, focus restoration, pagination, evolution branches, editing, maps, loading, failures and recovery. Chromium screenshots are attached to the presentation test results for review. Light/dark mobile checks use 320px and 390px; the existing responsive suite covers up to 1440px.

## Explore collection coverage

Each endpoint below has a list and a detail/redirect check in both themes:

- `/explore/pokemon` and its record route.
- `/explore/ability` and its record route.
- `/explore/characteristic` and its record route.
- `/explore/egg-group` and its record route.
- `/explore/gender` and its record route.
- `/explore/growth-rate` and its record route.
- `/explore/nature` and its record route.
- `/explore/pokeathlon-stat` and its record route.
- `/explore/pokemon-color` and its record route.
- `/explore/pokemon-form` and its record route.
- `/explore/pokemon-habitat` and its record route.
- `/explore/pokemon-shape` and its record route.
- `/explore/pokemon-species` and its record route.
- `/explore/stat` and its record route.
- `/explore/type` and its record route.
- `/explore/move` and its record route.
- `/explore/move-ailment` and its record route.
- `/explore/move-battle-style` and its record route.
- `/explore/move-category` and its record route.
- `/explore/move-damage-class` and its record route.
- `/explore/move-learn-method` and its record route.
- `/explore/move-target` and its record route.
- `/explore/item` and its record route.
- `/explore/currency` and its record route.
- `/explore/item-attribute` and its record route.
- `/explore/item-category` and its record route.
- `/explore/item-fling-effect` and its record route.
- `/explore/item-pocket` and its record route.
- `/explore/machine` and its record route.
- `/explore/location` and its record route.
- `/explore/location-area` and its record route.
- `/explore/pal-park-area` and its record route.
- `/explore/region` and its record route.
- `/explore/generation` and its record route.
- `/explore/pokedex` and its record route.
- `/explore/version` and its record route.
- `/explore/version-group` and its record route.
- `/explore/berry` and its record route.
- `/explore/berry-firmness` and its record route.
- `/explore/berry-flavor` and its record route.
- `/explore/evolution-chain` and its record route.
- `/explore/evolution-trigger` and its record route.
- `/explore/evolution-variable` and its record route.
- `/explore/encounter-method` and its record route.
- `/explore/encounter-condition` and its record route.
- `/explore/encounter-condition-value` and its record route.
- `/explore/contest-type` and its record route.
- `/explore/contest-effect` and its record route.
- `/explore/super-contest-effect` and its record route.
- `/explore/language` and its record route.

## Responsive visual review

`e2e/screen-layouts.spec.ts` traverses every route family at 768px and 1440px in both themes, including populated teams and active battles. It captures screenshots and checks that text remains inside visible component frames. `e2e/presentation.spec.ts` covers all 50 Explore collections and records, every Pokémon tab, maps, tools, empty/recovery states, and populated editors at 320px/390px. `e2e/catalog-filter-sizing.spec.ts` covers expanded filters and open selectors at five widths. These are layout and behavior checks; fixture data is deterministic and does not represent a live API availability test.
