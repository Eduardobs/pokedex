---
name: atlas-design-screen
description: Build or redesign Atlas Pokémon pages and reusable UI while preserving its visual system, responsive behavior, themes, routing, and interaction states. Use for screen, layout, component, or UX work; do not use for data-only or backend-style refactors.
---

# Design an Atlas screen

Make new UI feel native to Atlas rather than like an isolated mockup.

## Required project context

Before analyzing or changing the project, read [`../../PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) and treat every definition there as an invariant. When a request establishes a new durable, project-wide definition, add it concisely to that document in the same change. Do not add temporary implementation details or change an existing definition without explicit user instruction.

## Study the neighboring experience

- Inspect the closest existing page and reusable components before designing. Reuse its information hierarchy and interaction vocabulary where appropriate.
- Inspect relevant selectors in `src/styles.css`, both light and dark theme rules, and the mobile breakpoint before adding classes.
- Identify the route, entry point, primary task, data states, and narrow-screen behavior.

## Compose the screen

- Use a semantic page landmark and the established `page content-width` shell for standard inner routes. Use `page-title`, `eyebrow`, existing toolbars, cards, grids, buttons, and state components where they fit.
- Keep pages responsible for composition and data orchestration. Extract repeated or independently testable presentation into `src/components/`.
- Add secondary routes with `lazy` in `src/App.tsx` and place them under `Layout` so navigation, metadata, focus restoration, theme, and providers remain consistent.
- Extend route title and description selection in `Layout.tsx` for a new top-level experience.
- Represent shareable screen state in `useSearchParams`; use local state only for ephemeral details such as an open menu or visual toggle.

## Preserve the visual language

- Prefer the existing CSS custom properties (`--ink`, `--muted`, `--line`, `--page-bg`, `--surface`, `--surface-soft`, `--red`) and contextual variables such as `--theme`, `--type-color`, or `--resource-color`.
- Use `Outfit` for display hierarchy and the inherited `DM Sans` for body and controls, following nearby selectors.
- Define explicit hover, focus-visible, disabled, loading, selected, empty, and error states. Do not communicate state by color alone.
- Verify both themes. Any new fixed light color usually needs a dark-theme counterpart.
- Design from the current compact layout at `max-width: 720px`; keep controls usable at 44 CSS pixels where possible and prevent horizontal overflow. Intentional data-table scrolling must remain keyboard reachable.
- Respect `prefers-reduced-motion`; avoid decorative motion that is essential to understanding.

## Treat data states as part of the design

- Use stable skeleton dimensions for content whose geometry is known and `Loading` for generic waits.
- Use `ErrorState` or an inline error with a retry action according to scope.
- Give empty search results and truly empty collections distinct explanations and recovery actions.
- Reserve space for media with width and height, supply meaningful alternative text, and avoid layout shift.

## Finish

- Put every visible string and accessible label in all three translation dictionaries.
- Add behavior-focused Testing Library coverage for the screen's critical interaction.
- Check keyboard flow, focus visibility, mobile layout, light/dark themes, and loading/error/empty/success states.
- Run `npm run check`.
