---
name: atlas-evolve-architecture
description: Plan and implement architectural changes in Atlas Pokémon, including module boundaries, shared state, data flow, routing, and incremental refactors. Use when a change affects multiple layers or ownership is unclear; do not invoke for a small local component edit.
---

# Evolve the Atlas architecture

Improve boundaries without turning a static client application into a needlessly complex platform.

## Model the current flow

Use this dependency direction as the default:

`config/types -> lib/data -> hooks/contexts -> components -> pages -> App`

- `src/lib/api-client.ts` owns REST URL policy, transport, timeouts, cache, request deduplication, and independent consumer cancellation.
- `src/lib/api.ts` is the public Pokémon-oriented facade and formatting layer.
- Specialized, validated catalog queries belong in `src/lib/pokemon-catalog.ts` or a similarly focused domain module.
- Pure domain rules belong in focused `src/lib/*.ts` modules.
- Hooks adapt asynchronous or browser behavior to React. Contexts hold only genuinely cross-route state.
- Components render reusable interface units; pages compose route-level use cases.

## Decide before moving code

1. Trace callers, tests, and data ownership with repository search.
2. Name the concrete pressure: duplication, circular knowledge, stale state, coupling, performance, or testability.
3. Choose the lowest layer that can own the rule without importing React or UI details.
4. Define the intended public contract and migration path. Preserve callers while moving internals when an incremental change is possible.
5. Reject abstractions that have only one trivial caller or hide important domain constraints.

## Architectural invariants

- Keep the application deployable as static files with `HashRouter`; do not assume server rewrites, a database, or secret runtime configuration.
- Keep pages lazy-loaded except the home route. Avoid barrels that accidentally make lazy chunks eager.
- Do not let components or pages bypass the API facade, storage helpers, or validated domain utilities.
- Keep remote DTOs distinct from derived UI models when transformation is non-trivial.
- Keep persistent browser values versionable, bounded, and validated. A storage read must be allowed to fail gracefully.
- Prefer composition and pure functions over inheritance, global mutable state, service locators, or framework-like internal abstractions.
- Introduce a dependency only after checking bundle cost, maintenance, CSP impact, browser support, and whether native APIs already solve the problem.

## Execute incrementally

- Add characterization tests before changing behavior that is not already well specified.
- Move one responsibility at a time and keep commits or review units coherent.
- Update imports and tests with each move; do not leave duplicate sources of truth.
- When a public contract changes, update every caller in the same change and document the migration in the final report.

## Validate the architecture

- Confirm TypeScript has no new cycles or widened types and that route chunks remain split as intended.
- Run focused tests after each boundary move, then `npm run check`.
- Summarize the old and new ownership, the tradeoff accepted, and any deferred migration. Update the README architecture section when the durable project structure changes.
