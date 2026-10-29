# Atlas interface design

[Stitch design project](https://stitch.withgoogle.com/projects/1567854827663085291)

## Expedition art direction

The application uses a bold Pokémon atlas visual system: midnight navy title bands, vivid crimson actions and artwork stages, warm ivory canvas, oversized Outfit headlines, and readable DM Sans controls. Numbered task cards, subtle technical dot patterns, large specimen artwork and generous rounded frames give each page a recognizable identity. The direction replaces the earlier restrained white-card treatment.

The shared implementation lives in `src/styles/redesign.css`. `PageHeader` provides consistent title and action composition. `PrimaryShortcuts` exposes five localized destinations in a mobile bottom bar and a large-screen side rail, with native links and current-route semantics.

## Page treatments

- Home: asymmetric navy/crimson stage featuring Charizard, a direct search entry, starter links, numbered task tiles and planning shortcuts.
- Pokédex, forms and favorites: navy collection headers, a separate filter workspace, and type-tinted artwork cards with prominent names and dex numbers.
- Pokémon details: a large artwork stage beside the species summary, high-contrast selected tabs, and framed information panels. Evolution branches retain their explicit relationships.
- Explore: colorful category headers, compact directory rows, and a dedicated search and shortcut area.
- Resource lists and details: a strong record header above neutral, readable reference rows and detail panels.
- Teams: trainer workspace banner, separate toolbar, prominent roster tabs, and grouped member-editing panels.
- Battle: a framed preparation console and arena, cohesive trainer summaries and log surfaces, preserving sprite dimensions, field geometry and mobile action order.
- Type tools and move comparison: title bands above separated control and comparison workspaces, preserving intentional table scrolling and keyboard matrix navigation.
- Maps: larger image-led regional cards and clear map entry points; explorer filters retain overlay behavior and the original geography.
- Feedback: distinct empty-state panels and readable retry surfaces in both themes.

## Responsive and accessible behavior

Pages use 16px mobile outside margins. Mobile cards and reference controls reflow at 720px. Persistent shortcuts appear at widths up to 900px and as a side rail from 1300px. Mobile content and floating actions reserve space for the bottom navigation and device safe areas. Existing header navigation breakpoints remain intact.

New navigation labels live in all three translation catalogs. Controls retain visible focus, current/selected states, and practical 44px targets. Motion respects reduced-motion preferences. Pokémon type colors, Stellar and Tera badges, category sprites and Mega Evolution icons preserve their existing definitions.

Stitch screens guide visual composition. Invented competitive telemetry, tier labels, seasonal rules, social metrics and other mockup-only features are excluded; existing application data and behavior remain authoritative.
