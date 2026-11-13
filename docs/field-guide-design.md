# Unified field guide design

The shared presentation in `src/styles/field-guide.css` supersedes the Expedition colors and rounded framing described in `interface-design.md`. The existing page composition, routes, translated copy and interaction contracts remain authoritative.

## Stitch reference and evaluation

[Stitch project: Atlas Pokémon](https://stitch.withgoogle.com/projects/14573098343539141838), generated on 2026-11-12, proposes a mineral editorial workspace with teal accents, Outfit headings, DM Sans controls, 4px controls and 6px panels. The generated mobile reference was inspected before implementation.

Adopted: neutral light/dark surfaces, compact corners, restrained shadows, direct page headings, clear separators and type-derived artwork plates. Rejected: altered type colors and Stellar gradient, replacement favorite/brand icons, fabricated metadata, disabled third-type selection, different pagination and language controls, filter drawers and extra product features. Existing bottom shortcuts, header breakpoints, battle geometry and evolutionary flow remain intact. The reference is guidance, not an accessibility certification.

## Shared rules

- Light: mineral canvas `#f5f7f8`, white surfaces, ink `#17252d`, teal text `#09677e`.
- Dark: graphite canvas `#0d1419`, surfaces `#161f26`, ink `#eef5f7`, teal text `#79d9ec`.
- Filled primary actions use `#0e7490` with white text in both themes; text accents use separate theme-aware tokens.
- Panels use 6px corners; controls use 4px. Type badges, Tera crystals, map pins, Pokémon artwork and semantic battle indicators keep their existing styling.
- Inner page headings sit directly on the canvas with a separating rule, making search and data visible earlier. Home pairs a neutral reading surface with a dark artwork stage.
- Existing mobile layouts form the baseline; larger screens add breathing room. Side-by-side search/select controls retain their shared height. Selection retains native ARIA and visual indicators; focus remains visible.
- Resting cards use borders and tonal separation. Hover changes their border without decorative movement or elevated shadows. Existing loading, error, empty and success components inherit the shared palette.

## Evidence informing the adaptation

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [W3C focus appearance guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) inform focus visibility, contrast and target sizing. [NN/g mobile usability research](https://www.nngroup.com/reports/mobile-website-and-application-usability/) and [visual hierarchy principles](https://media.nngroup.com/media/articles/attachments/Principles_Visual_Design-A4.pdf) inform task prominence and consistent grouping. These sources support the principles; they do not establish that a particular palette or corner radius improves usability. No new user study was performed.

## Interior page composition

A second [Stitch screen](https://stitch.withgoogle.com/projects/14573098343539141838) (`c28788f2c0294b6a95301db3e853460e`) informed the interior page pass: compact identity/artwork, aligned statistics and separated reference sections. The generated competitive integration, altered type badges, extra form controls and invented team content were excluded.

- Catalogs: a clear filter workspace with a teal rule and consistent artwork-card spacing; all filter semantics remain intact.
- Pokémon details: a smaller artwork stage, readable identity, physical summary strip, and ruled statistics. Tabs and the connected evolution diagram retain their existing operation.
- Resource lists: continuous rows with shared column headers. Resource details group metrics and prose with clear section dividers.
- Teams: creation/import/export actions live in their own responsive row, followed by team selection, roster tabs and grouped editing sections.
- Tools: calculator descriptions occupy a dedicated row above aligned type selectors and an explicit full-width result. Move comparison uses paired selection surfaces and ruled data rows.
- Maps: compact covers precede region actions on mobile and sit beside them on wide screens. The map itself and overlay/filter behavior retain their geometry.
- Battle: preparation and log headings inherit the workspace framing; field geometry, action ordering and combat behavior remain intact.

The home highlight draws uniformly from national IDs 1–1025, excluding the last highlight stored in the current tab. It remains stable during rerenders, uses the selected Pokémon's name and route, and retains a usable numbered link while its summary loads or fails. Summary retrieval reuses the shared cancellable API hook and bounded transport. Artwork falls back to the HOME sprite when necessary. The three starter links remain fixed.
