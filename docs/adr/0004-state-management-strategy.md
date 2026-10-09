# ADR-0004: State Management Strategy

* **Status**: Accepted — graduated from [RFC 0004](../rfc/0004-state-management-strategy.md), which tracks the migration
* **Date**: 2026-01-06

## Context

Jaeger UI held nearly all shared state in Redux: traces, search results, services, configuration, dependencies, the DDG graph, and the trace timeline's interaction state. That worked when the app was small, but it collides with the shape of Jaeger UI's workload.

The workload is **heavy object analysis, not high-frequency updates**. A trace is a large immutable JSON document — routinely thousands of spans, up to 80k in traces we have tested — loaded once and then filtered, expanded, and visualised. The problem is not update throughput; it is that a single store update must not cause a re-render sweep across a virtualized list of that size, and that the document must not be copied.

Two properties of the Redux setup made that hard. Global store subscriptions mean fine-grained subscription has to be reconstructed with carefully written selectors at every row component. And the `redux-actions` / `redux-promise-middleware` pattern wrapped every fetch in dispatch-plus-reducer-plus-selector boilerplate that duplicated caching, loading, and error handling that an off-the-shelf query library already provides.

[RFC 0004](../rfc/0004-state-management-strategy.md) evaluated React Context + Hooks, Zustand, and Redux Toolkit against memory efficiency, re-render scalability, governance, contributor ergonomics, and server-state integration. This ADR records the decision it reached.

## Decision

**Split state by kind, and use a different tool for each:**

| Kind of state | Tool |
| --- | --- |
| Server data (traces, search results, services, metrics, dependencies, DDG payloads) | **TanStack Query** |
| Shared client UI state (collapse/expand, open detail panels, column widths, compare cohort, view modifiers) | **Zustand** |
| Deep-linkable view state | **URL**, via per-page `url.ts` helpers |
| Cross-session preferences | **localStorage** |
| Transient leaf UI and heavy derivations | **`useState` / `useMemo`**, colocated |

**Redux is removed**, not kept alongside. **`@tanstack/react-virtual` is mandatory** for any list that can hold a span per row — no state management choice makes rendering tens of thousands of rows viable on its own.

Three points decided the tool choices:

- **Selective subscription is the deciding property, not bundle size.** Zustand components subscribe to a selector result and re-render only when that value changes, which is what keeps a virtualized row from re-rendering when an unrelated span expands. React Context was rejected on this alone: every consumer re-renders on any provider value change, which is unusable at this scale even with virtualization.
- **Server state is not application state.** Caching, deduplication, staleness, and retry are TanStack Query's job. Traces are immutable once fetched, which fits a cache with a long `staleTime` almost exactly.
- **Redux Toolkit was viable but not better.** It would have solved the boilerplate and works with selectors, but it keeps a heavier runtime and more concepts to learn while offering nothing Zustand does not, so it did not justify staying.

## Consequences

- New code has an unambiguous home for each kind of state, and `useConfig()` is kept as a stable hook surface so configuration can move without touching call sites.
- The migration is long-running and interleaves with the OTLP work in [ADR-0002](./0002-otlp-api-v3-migration.md). While it runs, the codebase genuinely has two state systems; [ADR-0005](./0005-current-state-management-architecture.md) documents the hybrid, and [RFC 0004](../rfc/0004-state-management-strategy.md) tracks the phases.
- Zustand's ergonomics cut both ways: a store is easy enough to create that stores can proliferate. [RFC 0006](../rfc/0006-target-state-management-architecture.md) records where each one should live — `src/stores/` when more than one feature reads it, a `store.<slice>.ts` beside the owning feature otherwise.
- Losing Redux DevTools time-travel is a real cost for debugging interaction sequences. Zustand's devtools middleware is a partial substitute.
- The trace timeline's Redux duck cannot be deleted just by moving its state, because analytics tracking is implemented as a Redux middleware keyed on action types. Migrated interactions dual-write — Redux first, so the middleware still sees pre-update state, then Zustand — until the analytics call sites are relocated. This is the one item in the migration with a design question left in it rather than mechanical work.

## References

- [RFC 0004: State Management Strategy for Jaeger UI](../rfc/0004-state-management-strategy.md) - the three options, the trade-off matrix, and the phased migration checklist
- [RFC 0006: Target State Management Architecture](../rfc/0006-target-state-management-architecture.md) - where each kind of state should live, and the target data flows
- [ADR-0005: Current State Management Architecture](./0005-current-state-management-architecture.md) - how the code is wired while the migration is in progress
- [Zustand](https://github.com/pmndrs/zustand), [TanStack Query](https://tanstack.com/query/latest), [TanStack Virtual](https://tanstack.com/virtual/latest)
