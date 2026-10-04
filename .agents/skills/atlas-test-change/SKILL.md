---
name: atlas-test-change
description: Add, repair, or review unit, integration, and end-to-end tests for Atlas Pokémon with Vitest, Testing Library, and Playwright. Use for regressions, critical user journeys, new behavior, flaky tests, or explicit verification work; do not use to change product behavior without authorization.
---

# Test an Atlas change

Prove changed contracts at the lowest reliable boundary, then protect critical user journeys across real application boundaries. Test user-observable behavior, not implementation trivia.

## Required project context

Before analyzing or changing the project, read [`../../PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) and treat every definition there as an invariant. When a request establishes a new durable, project-wide definition, add it concisely to that document in the same change. Do not add temporary implementation details or change an existing definition without explicit user instruction.

## Select the test boundary

- Test pure parsing, formatting, sorting, statistics, type effectiveness, storage validation, and other domain rules beside their module as `*.test.ts`.
- Test hooks with `renderHook`, `act`, and `waitFor`; verify cancellation, retry, stale-data prevention, and state transitions where relevant.
- Test one component or page through accessible roles, labels, text, and user interactions. Use `MemoryRouter` and the real providers when routing or context is part of that contract.
- Add a Vitest integration test under `src/` as `*.integration.test.tsx` when behavior crosses the app router, providers, storage, data hooks, or several real components. Render the real `App` and mock only external boundaries such as HTTP, browser observers, or time.
- Add a Playwright test under `e2e/` when the contract depends on a real browser or protects a critical journey: navigation through the running app, hash and search-parameter history, reload persistence, focus or keyboard behavior, responsive interaction, or recovery across a complete user flow.
- Do not repeat every assertion at every layer. Keep exhaustive edge cases at the narrowest useful layer and reserve E2E for a small set of high-value paths.
- Add a regression test that demonstrates a reported defect before changing production code.

## Build integration coverage

- Follow `src/App.integration.test.tsx` for app-level setup. Set the initial hash and storage before rendering, then exercise the real router, contexts, hooks, and components together.
- Stub `fetch` by parsed URL and return minimal valid typed payloads. Make retries, request counts, late responses, and unexpected endpoints explicit; never call the live PokéAPI from a test.
- Assert visible state, accessible announcements, URL changes, and persisted storage rather than internal calls unless the call itself is the boundary contract.
- Clean up rendered UI, storage, fake timers, mocks, and stubbed globals after each test so the complete suite is order-independent.

## Build E2E coverage

- Follow `e2e/pokedex.spec.ts` and the existing `playwright.config.ts`. Use its `baseURL`, Chromium project, managed Vite server, retry policy, traces, and failure screenshots instead of starting another server in the test.
- Register `page.route` handlers before `page.goto`, intercept every PokéAPI request involved in the journey, and use small deterministic fixtures. Fail or return an intentional error for unrecognized requests so missing mocks remain visible.
- Keep tests isolated and parallel-safe: do not depend on another test's storage, request counters, order, or server state. Persist within one test only when reload persistence is the behavior under test.
- Drive the page with role, label, and visible-name locators. Synchronize with Playwright web assertions such as `await expect(locator).toBeVisible()`; do not use arbitrary sleeps or `networkidle` as a readiness signal.
- Verify outcomes at user boundaries: visible content, accessible status, URL, focus, and state that survives reload. Avoid CSS selectors and DOM structure assertions unless structure is itself the contract.

## Cover meaningful cases

For each changed contract, choose the relevant cases:

- normal success and boundary values;
- loading, empty, partial, failure, and retry states;
- malformed or oversized external data;
- cancellation on unmount or navigation and late response ordering;
- URL search-parameter changes and history behavior;
- keyboard interaction, focus retention, and accessible state;
- unavailable or corrupt browser storage;
- absence of `IntersectionObserver` and repeated infinite-scroll pages.

Avoid snapshots for behavior, testing private state, arbitrary sleeps, broad mocks, and assertions that merely repeat the implementation.

## Keep tests deterministic

- Reset mocks, timers, storage, and stubbed globals after each test. Restore fake timers and global implementations.
- Prefer `findBy*` or `waitFor` for asynchronous UI. Use fake timers only when time itself is the contract.
- Provide valid minimal typed fixtures and make the exceptional field obvious. Do not copy giant API responses into tests.
- Query by role and accessible name first. A difficult query often indicates an accessibility problem in the component.
- Exercise fallback controls for infinite loading instead of relying only on observer callbacks.
- Treat a flaky test as a synchronization, isolation, or contract problem. Do not hide it with sleeps, widened timeouts, unconditional retries, or weakened assertions.

## Run the gates

1. Run the affected Vitest file while iterating, for example `npm test -- src/App.integration.test.tsx`.
2. Run the affected Playwright file with `npm run test:e2e -- e2e/pokedex.spec.ts`; use `--grep` after `--` when one journey is enough during iteration.
3. Run `npm test` and `npm run test:e2e` after focused tests pass when either layer changed.
4. Run `npm run check` before completion. It is the repository's required formatting, lint, complete Vitest, complete Playwright, type-check, and production-build gate.
5. Report the exact commands and outcomes. If Chromium is unavailable, a trace or screenshot is produced, or an unrelated failure exists, identify it precisely rather than skipping the layer or weakening the test.
