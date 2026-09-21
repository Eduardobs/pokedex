---
name: atlas-test-change
description: Add, repair, or review tests for Atlas Pokémon with Vitest, JSDOM, and Testing Library, then run the repository quality gates. Use for regressions, new behavior, flaky tests, or explicit verification work; do not use to change product behavior without authorization.
---

# Test an Atlas change

Test contracts and user-observable behavior, not implementation trivia.

## Select the test boundary

- Test pure parsing, formatting, sorting, statistics, type effectiveness, storage validation, and other domain rules beside their module as `*.test.ts`.
- Test hooks with `renderHook`, `act`, and `waitFor`; verify cancellation, retry, stale-data prevention, and state transitions where relevant.
- Test components and pages through accessible roles, labels, text, and user interactions. Use `MemoryRouter` and the real providers when routing or context is part of the behavior.
- Mock the true boundary: network transport, browser observer, time, or an expensive child component. Keep the domain code under test real.
- Add a regression test that demonstrates a reported defect before changing production code.

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

## Run the gates

1. Run the affected file while iterating, for example `npm test -- src/lib/api.test.ts`.
2. Run the complete suite with `npm test` when the focused test passes.
3. Run `npm run check` before completion; this is the repository's required lint, test, type-check, and production-build gate.
4. Report the exact commands and outcomes. If an unrelated failure exists, identify it precisely rather than weakening the test.
