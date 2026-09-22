---
name: atlas-review-security
description: Review or harden Atlas Pokémon against client-side security and privacy risks in network access, routes, storage, rendering, CSP, dependencies, and deployment. Use for explicit security reviews or security-sensitive changes; do not invoke as a generic code-review checklist.
---

# Review Atlas security

Base findings on reachable behavior in this repository. Atlas is a static public client with no server, database, account system, or legitimate place for secrets.

## Required project context

Before analyzing or changing the project, read [`../../PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) and treat every definition there as an invariant. When a request establishes a new durable, project-wide definition, add it concisely to that document in the same change. Do not add temporary implementation details or change an existing definition without explicit user instruction.

## Establish the threat model

Map the affected trust boundaries before judging risk:

- route and query parameters controlled by the user;
- REST and GraphQL responses controlled outside the application;
- URLs embedded in API payloads;
- browser storage that may be malformed or unavailable;
- remote images, media, and fonts permitted by CSP;
- external links, build dependencies, GitHub Actions, and Pages deployment.

Do not claim server-side, authorization, session, or database risks that cannot exist in this architecture.

## Inspect the controls

- `src/lib/api-client.ts`: HTTPS-only allowlist, exact origin and API-path checks, no credentials, timeout, bounded cache, safe abort behavior, and invalid response handling.
- `src/lib/pokemon-catalog.ts`: fixed GraphQL operations, bounded results, explicit field validation, cancellation, timeout, and `credentials: 'omit'`.
- `src/lib/storage.ts` and callers: allowlisted keys, runtime validators, size/count limits, graceful failures, and no sensitive data.
- Pages and links: encoded route segments, bounded query values, no unsafe HTML injection, and `rel="noopener noreferrer"` on new-tab links.
- `index.html`: least-privilege CSP, referrer policy, exact connect/image/media/font origins, `object-src 'none'`, `base-uri 'self'`, and `form-action 'self'`.
- `package.json`, lockfile, Dependabot, and workflow actions: pinned reproducible install, minimal permissions, maintained packages, and no secrets exposed to the bundle.

## Security invariants

- Never put credentials, tokens, private endpoints, or security decisions in a client-side environment variable or bundle.
- Treat every external payload as `unknown` where malformed data could change control flow, generate URLs, or allocate large work.
- Encode dynamic path segments and validate resource names before interpolation. Keep URL allowlisting centralized.
- Bound strings, arrays, pagination, caches, concurrent requests, and storage values to limit resource exhaustion.
- Avoid `dangerouslySetInnerHTML`, DOM `innerHTML`, dynamic script execution, open redirects, and permissive URL schemes.
- Do not widen CSP with `*`, `data:` for scripts, or `unsafe-eval`. Add an origin only to the directive that needs it and only after establishing necessity.
- Preserve independent cancellation for shared requests; one consumer must not cancel another, and abandoned transports must not run indefinitely.
- Keep errors useful to users without exposing stack traces or internal data in the rendered UI.

## Report or fix

For a review, report only substantiated findings. Include severity, affected file and location, attack path, impact, evidence, and the smallest practical remediation. Separate confirmed findings from defense-in-depth suggestions.

For requested hardening, add a regression test that fails before the fix when feasible. Re-run focused tests and `npm run check`. Call out CSP changes, dependency changes, or residual risk explicitly.
