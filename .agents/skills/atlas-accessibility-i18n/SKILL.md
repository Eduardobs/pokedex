---
name: atlas-accessibility-i18n
description: Implement or audit accessibility and internationalization in Atlas Pokémon across Portuguese, English, and Spanish. Use when UI copy, semantics, keyboard behavior, focus, locale formatting, translated API content, or inclusive interaction changes; do not use for non-UI domain logic.
---

# Preserve accessibility and internationalization

Treat accessible behavior and all supported languages as part of the feature contract, not a cleanup pass.

## Required project context

Before analyzing or changing the project, read [`../../PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) and treat every definition there as an invariant. When a request establishes a new durable, project-wide definition, add it concisely to that document in the same change. Do not add temporary implementation details or change an existing definition without explicit user instruction.

## Internationalize the change

- Add user-visible copy, labels, announcements, errors, empty states, placeholders, tooltips, and image context to `src/i18n/messages.ts` for `pt-BR`, `en`, and `es` in the same change.
- Keep the Portuguese dictionary as the typed key source through `TranslationKey`. Reuse existing keys only when meaning is identical.
- Use interpolation through `t(key, variables)` and locale-aware `formatNumber` or `formatDecimal`; do not assemble grammar from translated fragments when word order can vary.
- Use `apiLanguage` and the localized API helpers for PokéAPI names or prose. Make English or Portuguese fallback visible only when that distinction helps the user.
- For a new route, provide localized page title and description through `Layout.tsx`. Preserve `document.documentElement.lang` updates.
- Keep technical identifiers untranslated where translation would break routes, API parameters, or domain meaning.

## Build semantic interaction

- Prefer native `button`, `a`, `input`, `select`, headings, lists, tables, `main`, and `nav` elements before adding ARIA.
- Give icon-only controls an accessible name. Decorative icons must be hidden from assistive technology.
- Expose selected, expanded, pressed, busy, invalid, and current states with the matching semantic or ARIA attribute.
- Announce concise dynamic results with `role="status"` or `aria-live="polite"`; reserve `role="alert"` for failures needing immediate attention.
- Preserve logical heading order and label regions when several similar sections exist.
- Give meaningful images useful alternative text and decorative imagery empty alternative text or `aria-hidden`.

## Keyboard and focus

- All actions must work without a pointer and show a visible focus indicator.
- Use roving `tabIndex` and arrow-key behavior for true tablists; keep `aria-controls`, `aria-selected`, and panel labels consistent.
- Trap focus only for a modal-like mobile navigation state, close it with Escape, and restore focus to its trigger.
- On pathname navigation, preserve the existing main-content focus behavior. Query-string-only updates must not steal focus.
- Keep skip navigation functional and intentional scroll containers keyboard focusable.

## Visual inclusion

- Maintain readable contrast in light and dark themes and never use color as the only state signal.
- Support 200% zoom, reflow at the existing `720px` breakpoint, touch targets near 44 CSS pixels, and content expansion from longer translations.
- Honor `prefers-reduced-motion` and avoid flashing, forced animation, or hover-only information.

## Verify

- Test critical behavior with accessible role/name queries and keyboard events. Include language switching or fallback logic when changed.
- Manually reason through tab order, focus after navigation, announcements, zoom/reflow, both themes, and all three languages.
- Run focused tests and then `npm run check`.
