# Atlas interface design

The current information architecture is documented in [the complete screen presentation inventory](screen-presentation-audit.md). Screens use visually grouped content panels and labeled attributes, with responsive artwork-led cards for Pokémon catalogs and native desktop tables for comparisons.

[Current Stitch design project](https://stitch.withgoogle.com/projects/13217619331164250601)

See [the field guide design decisions](field-guide-design.md) for the current palette, shared geometry, evidence and evaluation of the generated reference.

## Field guide art direction

The application uses a mineral neutral canvas, teal actions, direct editorial page titles, Outfit headlines and readable DM Sans controls. Compact 4px controls and 6px panels, separators, restrained elevation and prominent Pokémon artwork create a consistent reference workspace in light and dark themes.

The current shared presentation lives in `src/styles/field-guide.css`, layered after the existing page composition styles. `PageHeader` provides consistent title and action composition. `PrimaryShortcuts` exposes five localized destinations in a mobile bottom bar and a large-screen side rail, with native links and current-route semantics.

## Page treatments

- Home: asymmetric neutral/dark artwork stage featuring a random national Pokémon on each visit or refresh, a direct search entry, starter links, destination cards and planning shortcuts.
- Pokédex, forms and favorites: direct editorial collection headers, a separate filter workspace, and type-tinted artwork cards with prominent names and dex numbers.
- Pokémon details: a compact identity and artwork header, a mobile grid of six tabs, and quick physical facts beside identity and a separate overview dashboard with description, stats, biology and abilities. The evolution workspace is a connected flowchart designed with Stitch: compact species nodes, measured orthogonal SVG arrows, and requirements on parent-child connections. It flows left to right on desktop and top to bottom on mobile, with a common distribution rail for sibling branches. Zoom, fit and native keyboard scrolling keep larger families explorable without whole-page overflow. Alternative methods stay separated by OR and the current species is highlighted.
- Explore: colorful category headers, compact directory rows, and a dedicated search and shortcut area.
- Resource lists and details: a strong record header above neutral, readable reference rows and detail panels.
- Teams: trainer workspace heading, separate toolbar, prominent roster tabs, and grouped member-editing panels.
- Battle: a framed preparation console and arena, cohesive trainer summaries and log surfaces, preserving sprite dimensions, field geometry and mobile action order.
- Type tools and move comparison: editorial headings above separated control and comparison workspaces, preserving intentional table scrolling and keyboard matrix navigation.
- Maps: larger image-led regional cards and clear map entry points; explorer filters retain overlay behavior and the original geography.
- Feedback: distinct empty-state panels and readable retry surfaces in both themes.

## Responsive and accessible behavior

Pages use 16px mobile outside margins. Mobile cards and reference controls reflow at 720px. Persistent shortcuts appear at widths up to 900px and as a side rail from 1300px. Mobile content and floating actions reserve space for the bottom navigation and device safe areas. Existing header navigation breakpoints remain intact.

New navigation labels live in all three translation catalogs. Controls retain visible focus, current/selected states, and practical 44px targets. Motion respects reduced-motion preferences. Pokémon type colors, Stellar and Tera badges, category sprites and Mega Evolution icons preserve their existing definitions.

Stitch screens guide visual composition. Invented competitive telemetry, tier labels, seasonal rules, social metrics and other mockup-only features are excluded; existing application data and behavior remain authoritative.
