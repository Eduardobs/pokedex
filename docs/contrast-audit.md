# Interface contrast audit

Date: 2026-11-03

## Scope and constraints

Reviewed the shared styles used by all routes, including light/dark overrides, mobile rules, labels, controls, icons, semantic states, tables, maps, Pokémon detail tabs, team editing and battle information. Icon geometry, Pokémon type palettes (including Tera and Stellar), and damage-class colors are unchanged.

Stitch reference: [Atlas contrast reference](https://stitch.withgoogle.com/projects/1567854827663085291). Its suggested contrast figures were not treated as measurements of the application.

## Corrections

- Replaced fixed faint gray metadata with theme-aware text tokens.
- Separated filled action backgrounds from the lighter dark-theme red text accent; corrected selected gender controls, counters and battle Tera controls.
- Supplied the missing focus token and opaque focus outlines. Strengthened input boundaries and placeholder text.
- Corrected resource counters and category accents, gender percentages, form counts, selected-tab counters, loading/error messages, home artwork captions and map cluster hover colors.
- Darkened effectiveness result backgrounds without changing Pokémon type or damage-class colors.
- Kept battle tooltip containers at 50% transparency, with opaque backing immediately under content. This makes text independent of sprites and underlying arena colors. Stat tiles and HP numbers also have stable backgrounds.
- Added theme-aware stat gains/losses, battle log semantics, hazard icons and gender icons. Bright major-status fills retain their colors with dark text/icons.

## Browser verification

`e2e/contrast.spec.ts` measures computed text colors using sRGB luminance and alpha compositing. Thresholds are 4.5:1 for ordinary text and 3:1 for large text. It covers:

- Active Pokémon, move, replacement and battle-log tooltips in both themes; the active tooltip is checked over black and white arena backdrops.
- Mobile battle details at 320px, including horizontal overflow.
- Home, Explore, favorites, type matrix, move comparison, maps and all six regional map routes, teams, catalog, variations, move list/detail, and Pokémon detail tabs.
- Catalog failure states and empty list states use deterministic HTTP fixtures; the Pokémon detail fixture supplies an evolution family. This is coverage of reusable screen structures, not every possible API record.

The text helper intentionally excludes protected type/damage badges, hidden/decorative content and unresolved image/gradient backgrounds. It is not a general WCAG conformance checker: icon contrast, arbitrary image backgrounds, opacity effects and third-party embedded maps need separate visual review. Existing responsive and battle interaction suites cover keyboard, touch, layout and dialog behavior.

## Preserved limitations

Some protected badges use white artwork/text over bright type or damage-class backgrounds. Their palettes and artwork were deliberately preserved; this audit does not certify those combinations as passing text contrast. Decorative background numbers and artwork are not informational text targets.
