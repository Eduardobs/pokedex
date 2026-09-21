---
name: atlas-develop-feature
description: Implement or change an Atlas Pokémon feature end to end in React and TypeScript. Use for functional product work that crosses pages, components, state, domain logic, translations, or tests; do not use for a security-only audit or a purely visual restyle.
---

# Develop an Atlas feature

Deliver the smallest complete vertical slice that matches the request and the repository's existing conventions.

## Establish the change

1. Read the affected route, its components, nearby domain utilities, tests, and translation keys before editing.
2. State the observable behavior and important edge cases. Preserve existing behavior unless the request changes it.
3. Check the working tree and keep unrelated user changes intact.

## Place responsibilities

- Put PokéAPI transport and validation in `src/lib/`; never issue an ordinary REST request directly from a page.
- Put reusable domain calculations, sorting, parsing, and formatting in pure functions under `src/lib/` and test them there.
- Put reusable asynchronous behavior in `src/hooks/` and app-wide shared state in `src/contexts/`. Do not create context for page-local state.
- Keep route composition in `src/pages/`, reusable UI in `src/components/`, shared types in `src/types.ts`, and constants or limits in `src/config/app.ts`.
- Add route-level screens to `src/App.tsx`; lazy-load secondary screens, while keeping the home route eager.
- Keep shareable filters, search, sort, pagination, and selected catalog views in URL search parameters when practical.

## Implement safely

- Keep TypeScript strict. Model data precisely; do not introduce `any`, unchecked casts, or duplicated remote types.
- Reuse `useApi`, `apiFetch`, `SearchField`, `Loading`, `ErrorState`, cards, badges, and existing CSS patterns before creating alternatives.
- Every asynchronous screen must define loading, error with retry when useful, empty, partial, and success states. Cancel obsolete work with `AbortSignal` and never publish stale results after navigation.
- Treat API payloads, route parameters, query parameters, and browser storage as untrusted input. Normalize, validate, bound, and encode at their boundary.
- Route user-visible copy through `src/i18n/messages.ts` for `pt-BR`, `en`, and `es`.
- Preserve keyboard use, focus behavior, semantic HTML, dark theme, mobile layout, and reduced-motion behavior.
- Avoid new dependencies unless they remove more complexity than they add and are justified by the requested feature.

## Verify the slice

- Add focused tests for domain rules and observable user behavior, including failure and stale-request cases when relevant.
- Run the narrowest affected tests while iterating, then run `npm run check` before completion.
- Update `README.md` only when routes, setup, architecture, security behavior, or user-facing capabilities materially change.
- Report changed behavior, verification performed, and any remaining risk or intentional follow-up.
