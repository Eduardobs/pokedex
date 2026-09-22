---
name: atlas-optimize-performance
description: Diagnose and improve Atlas Pokémon loading, rendering, network, bundle, and large-list performance without weakening correctness or accessibility. Use for explicit performance work or a measured regression; do not invoke for speculative micro-optimization.
---

# Optimize Atlas performance

Optimize an observed bottleneck and preserve a before-and-after signal.

## Required project context

Before analyzing or changing the project, read [`../../PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) and treat every definition there as an invariant. When a request establishes a new durable, project-wide definition, add it concisely to that document in the same change. Do not add temporary implementation details or change an existing definition without explicit user instruction.

## Locate the cost

Classify the problem before editing:

- initial bundle or route chunk;
- network latency, duplicate work, payload size, or request fan-out;
- expensive derived catalog data;
- unnecessary React renders or effects;
- image loading and layout shift;
- large grids, tables, or infinite-scroll DOM growth.

Record a reproducible indicator such as a production chunk size, request count, render trigger, item count, or timing. Do not add memoization merely because a value can be memoized.

## Use the existing performance model

- Keep secondary pages lazy-loaded in `src/App.tsx` and avoid imports that pull route-only modules into the eager graph.
- Reuse `apiFetch` caching and in-flight deduplication. Preserve the 250-entry, five-minute REST cache and 15-second timeout unless evidence justifies a configured change.
- Fetch independent data concurrently, cancel obsolete work, and avoid per-item catalog waterfalls. Use fixed, field-limited GraphQL catalog queries only when they replace excessive REST fan-out.
- Keep search, sort, filtering, and parsing as pure derived calculations. Memoize only expensive work with stable dependencies; avoid storing derived state that can drift.
- Preserve paged or infinite disclosure for large collections. Keep a manual load-more control and bound each rendered increment.
- Use `content-visibility` and intrinsic sizing only where off-screen card rendering is demonstrably costly and accessibility remains intact.
- Give images dimensions, use appropriate artwork sizes, lazy-load below-the-fold media, and reserve high priority for the principal above-the-fold image.

## Protect correctness

- Never trade away runtime validation, CSP, cancellation, error states, translations, keyboard behavior, or reduced-motion support for speed.
- Make caches finite and define invalidation. Do not cache failures or leak stale data across a changed endpoint.
- Avoid global event listeners without cleanup, unbounded observers, timers, promises, or arrays.
- Prefer removing work over hiding it behind longer debounces or loading indicators.

## Verify the result

1. Add a regression test for the performance invariant when it can be expressed reliably, such as request deduplication, bounded pagination, or lazy rendering.
2. Run the same indicator before and after a production build or focused scenario.
3. Run `npm run check`.
4. Report the measured improvement, unchanged correctness constraints, and any tradeoff. If no reliable improvement appears, revert the speculative optimization.
