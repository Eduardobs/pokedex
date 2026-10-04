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

## Maintenance

- Record in this section every new lasting, project-wide definition introduced by a request.
- Write each definition briefly and unambiguously, without temporary implementation details.
- Do not change or remove an existing definition without explicit user instruction.
