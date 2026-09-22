---
name: atlas-integrate-pokeapi
description: Add or modify Atlas Pokémon data access, PokéAPI resources, GraphQL catalog queries, caching, parsing, and async hooks. Use when work touches remote Pokémon data or network behavior; do not use for a presentation-only change.
---

# Integrate PokéAPI data

Treat every remote response and URL as untrusted while preserving responsive, cancellable UI behavior.

## Required project context

Before analyzing or changing the project, read [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) and treat every definition there as an invariant. When a request establishes a new durable, project-wide definition, add it concisely to that document in the same change. Do not add temporary implementation details or change an existing definition without explicit user instruction.

## Choose the access path

- For REST, call `apiFetch` or a focused facade function from `src/lib/api.ts`. Pass relative API paths or URLs returned by PokéAPI; `resolveApiUrl` must remain the authority for allowed REST origins and paths.
- For list endpoints, use or extend `listResource` and keep `limit` and `offset` bounded.
- Use GraphQL only for a fixed, field-limited catalog operation that REST cannot provide efficiently. Keep the endpoint in `src/config/app.ts` and the query, parser, timeout, cancellation, and cache in a focused `src/lib/` module.
- Never scatter `fetch` calls through pages or components.

## Define and validate data

1. Add the smallest required remote type to `src/types.ts` or the owning domain module.
2. Parse security- or logic-sensitive payloads from `unknown`. Validate object shape, primitive types, array bounds, accepted names, numeric ranges, duplicates, and GraphQL `errors` before use.
3. Map remote DTOs to a smaller domain or UI model when the screen does not need the complete payload.
4. Encode path segments and query values. Never concatenate an unvalidated route parameter into an absolute URL.

## Preserve network invariants

- Forward `AbortSignal` through every asynchronous layer. Abort on unmount, dependency change, superseding search, and when the last shared consumer leaves.
- Keep a finite timeout and distinguish timeout, HTTP, unsafe URL, invalid response, consumer abort, and not-found behavior.
- Do not cache failures. Bound caches by entry count or known catalog size and make their lifetime explicit.
- Reuse in-flight identical work rather than issuing duplicate requests. Keep independent consumer cancellation intact.
- Use `credentials: 'omit'` for direct cross-origin requests and retain a restrictive referrer policy.
- Avoid waterfalls: fetch independent resources concurrently, but do not create unbounded fan-out across an entire catalog.

## Connect data to React

- Use `useApi` for ordinary endpoint state. It intentionally clears previous-path data to prevent stale content during navigation.
- Build a focused hook when orchestration needs multiple requests, progressive enrichment, or a retry contract; keep parsing and calculations outside React.
- Expose explicit loading, error, retry, empty, and partial-data states. Ignore `AbortError` as a user-facing failure.
- Localize names and prose with `localizedName`, `localizedTextResult`, `localizedApiTerm`, and the active `apiLanguage` when the API offers translations.

## Test and verify

- Unit-test URL rejection, payload validation, limits, mapping, cache behavior, cancellation, timeout, retry, and deduplication relevant to the change.
- Mock network boundaries, not internal calculations. Include malformed success responses as well as HTTP failures.
- If a new origin or media host is genuinely required, update the exact CSP directive in `index.html` and justify the expansion.
- Run focused tests, then `npm run check`.
