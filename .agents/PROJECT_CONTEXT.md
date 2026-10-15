# Required project context

This document contains lasting definitions that every change to Atlas Pokémon must preserve.

## Definitions

- The colors and icons associated with Pokémon types must not be changed.
- The Mega Evolution icon must not be changed.
- The evolution tree must preserve and make the branches and conditions of every alternative evolution visually unambiguous.
- Evolution tree links must open the default variety of each species when the species name and the routable Pokémon name differ.
- Species list links must open each Pokémon's routable default variety.
- Related Pokémon lists in Explore resources must display an image, name, number, and, when relevant, the data that defines the relationship.
- The list of Pokémon required for evolution on gender pages must use the variety and artwork corresponding to the selected gender.
- Lists of a species' forms must display the artwork corresponding to each form when available, preserving the variety artwork as a fallback.
- The Pokédex and variations catalogs start with no type selected and allow up to two types, numbered by selection order; selecting a third replaces the oldest selection. The All button clears only the selected types.
- The variations catalog must combine search, region, sorting, type, rarity, and shiny display with the dedicated filters for regional forms, Mega Forms, and Gigantamax.
- Pokémon details opened from a catalog must offer a return path to the source catalog; without a recognized source, they must return to the Pokédex.
- Every vertically scrollable page must provide a global back-to-top control that is visible only when the page is not at the top.
- Damage classes must use the provided Pokémon Scarlet/Violet category sprites, with orange, blue, and gray for Physical, Special, and Status, respectively.
- The move list must display name, type, damage class, power, accuracy, and PP.
- The ability list must display name and description, indicating when the description does not exist in the selected language.
- Game maps must preserve the geography of the represented version and provide detailed zoom, navigation, and keyboard-accessible point-of-interest filters; the mouse wheel over the map must control zoom only, without scrolling the page.
- Maps must not shift the page when filters change or display an empty state when no category is selected.
- Pokémon Scarlet/Violet must provide separate maps for Paldea, Kitakami, and the Terarium.
- Pokémon Legends: Arceus must provide only the Hisui region map (`hisui-region`).
- Pokémon Legends: Z-A must provide only the Lumiose City map (`lumiose-city`).
- Search fields and selectors displayed side by side must use the shared components and have the same visual height.
- Source code, identifiers, comments, and test descriptions must be written in English; user-visible text must remain in the catalogs for the supported languages.
- Every translation must live in the corresponding file under `src/i18n/locales`; `messages.ts` must only compose and type the catalogs.
- Application route segments must be written in English, independently of the selected interface language.

- Explore collection search must cover the entire resource directory by original name or number, not only the current page.
- Mobile map filters must overlay the map without shifting its position and restore focus to their trigger when closed.
- The header must hide the Atlas Pokémon wordmark before replacing its navigation links with a hamburger menu at narrower widths.

- All paginated lists must use the shared pagination component with direct page selection and first/last navigation.
- Selectable item, move, nature, ability, and other option lists use alphabetical order while preserving semantic placeholder and numeric sequences.
- Resource lists under `/explore` preserve the PokéAPI numeric order.

## Maintenance

- Teams are saved locally in the browser, support multiple teams with at most six Pokémon each, and allow at most four compatible moves and one held item per member.
- A team can be exported as a versioned team file and imported without losing any editable team or member data.
- Team builds default to level 100, non-shiny, random gender where available, and the Pokémon's first type as its Tera type; EVs are limited to 252 per stat and 510 total, and IVs to 31 per stat.
- Team-member friendship is editable from 0 to 255 and defaults to 255; saved teams created before this field remain compatible and use the default until edited.
- Team-member friendship uses a slider with small and large heart endpoints, while keeping the current numeric value visible.
- Team builds keep level, shiny, and friendship aligned in one row; the gender control must remain usable without overflow on mobile screens.
- Gender uses icon-labelled radio controls, Tera types reuse the shared type icons and colors, and training can be reset to zero EVs and maximum IVs.
- A locally persisted team-level competitive preset documents unrestricted, singles, and doubles battle composition without enforcing seasonal ban lists.
- Random team creation saves a complete six-member team only after every selected Pokémon has loaded successfully, using the bundled Gen 9 Pokémon Showdown Random Battle set catalog and its species, type, weakness, level, Tera, and set-selection rules.
- Random Battle is a local singles battle at `/battle` between a complete saved team and a generated six-Pokémon opponent, reusing the team-builder data model.
- In Random Battle, each Pokémon may Terastallize once; the selected transformation resolves only after the turn's actions.
- Random Battle applies entry hazards on every switch and honors pivot and forced-switch moves before the next action choice.
- Random Battle is controlled by a build-time feature flag and is enabled by default.
- Team members are edited in tabs with Pokémon thumbnails and names; EV sliders must preserve the same limits as numeric inputs.
- Team move selectors display the move name, type, damage-class icon, power, accuracy, and PP inside each option. Nature labels show their stat modifiers when applicable.
- Team move and item selectors use progressively loaded searchable lists. Item options display the item icon, localized name, and description.
- Team member tabs use Pokémon HOME sprites above the Pokémon name, and gender is edited through a radio selection.
- Team training offers an explicitly applied Showdown-style estimated EV and Nature spread based on the member's four moves, item, ability, level, and base stats; manual training remains available.
- The MapGenie integration is controlled by a build-time feature flag and is enabled by default.

- Record in this section every new lasting, project-wide definition introduced by a request.
- Write each definition briefly and unambiguously, without temporary implementation details.
- Do not change or remove an existing definition without explicit user instruction.
