# ADR 0004: State Management Strategy for Jaeger UI

**Status**: In progress  
**Last Updated**: 2026-04-04

---

## TL;DR

Jaeger UI loads **very large, mostly immutable** traces (often 5,000–50,000+ spans). That workload needs **selective subscriptions** for UI state and a **dedicated cache** for server data—not a single global store that encourages wide re-renders.

**Decision**: Adopt **Zustand** for **client / UI state** and **TanStack Query** for **server state**. **`@tanstack/react-virtual`** is part of the stack (e.g. `FilteredList`); the trace timeline today uses a **custom virtualized `ListView`** (`TraceTimelineViewer/ListView`), not TanStack Virtual—future alignment is optional. **Redux is phased out** as slices migrate.

**Rejected for this codebase**:

| Option | Why not |
| ------ | ------- |
| **React Context** as primary global state | Broad context updates re-render large subtrees; at 50k-span scale this is a poor fit for timeline-adjacent UI. |
| **Redux only (incl. RTK)** | Works, but higher boilerplate and bundle cost than needed; contributor friction versus Zustand for our UI-heavy slices. |

**Complements**: [ADR 0005](./0005-current-state-management-architecture.md) documents how Redux, TanStack Query, URL, and local storage interact **today** during the transition.

---

## Context & Problem

### Product shape

- **Heavy object analysis**: fetch trace JSON once, filter, expand/collapse, visualize—not live collaborative editing.
- **Performance**: avoid store updates that fan out re-renders across virtualized trees.
- **Open source**: prefer shallow learning curves and small, well-maintained dependencies.

### Legacy state

Redux (classic `redux-actions` + `connect`) still holds **both** API-backed data and **UI** state (timeline, diff cohort, etc.). That coupling makes trace switches and caching harder than necessary. Some discovery APIs already use **TanStack Query** ([ADR 0005](./0005-current-state-management-architecture.md)).

### Split of concerns (target)

| Kind | Target | Examples |
| ---- | ------ | -------- |
| **Server state** | TanStack Query | Traces, search results, dependencies, DDG fetch, metrics, decorations |
| **Client UI state** | Zustand | Timeline collapse/details/layout prefs, trace diff cohort, archive UX, embedded flags (as needed) |
| **Config** | Keep behind `useConfig()` (implementation may move off Redux) | Feature flags from `getJaegerUiConfig()` |
| **Deep-linkable view** | URL (+ React Router) | Search params, trace id, compare segment, `uiFind` where applicable |

### Alternatives considered (summary)

We weighed three directions instead of “keep classic Redux forever”:

| Approach | Summary |
| -------- | ------- |
| **React Context** | Works for small, stable trees. As the **primary** global store for timeline-adjacent UI, a single context value change (e.g. hover or selection) can re-render large subtrees unless you split into many memoized contexts—high design cost for uncertain gain at tens of thousands of spans. |
| **Redux / Redux Toolkit only** | Solid and familiar; RTK improves ergonomics. Still tends toward more boilerplate and bundle surface than Zustand for the UI-heavy slices we intend to peel off first. |
| **Zustand + TanStack Query** (chosen) | Query owns **server-shaped** data (cache, stale, dedupe). Zustand owns **UI** state with **selective subscriptions** so consumers re-render only when their slice changes—aligned with “load trace once, interact heavily.” |

This section is intentionally brief. A longer evaluation (criterion-by-criterion grades, Context deep dive, appendix code) lived in earlier drafts of this ADR; the **outcome** is unchanged.

### Migration and implementation constraints

- **Class components** remain (e.g. `TraceTimelineViewer/ListView`, parts of Deep Dependencies). They cannot use `useStore()` directly. Prefer **`createStoreConnector`** in `utils/zustand-class-bridge.tsx` (a function wrapper uses `useStoreWithEqualityFn` + `shallow` and injects props into the class child), or imperative **`getState` / `subscribe`** when a HOC is awkward.
- **Virtualization** of span rows is **mandatory** at scale; state updates must not force full-tree re-renders. Today the timeline uses the custom **`ListView`**; **`@tanstack/react-virtual`** is already used elsewhere and can be adopted more widely over time without blocking this ADR.
- **`ReduxState`** should stay aligned with `combineReducers` (including slices such as `pathAgnosticDecorations`) to avoid silent type drift.

---

## Decision

1. **Standardize on Zustand + TanStack Query** for new and migrated code.
2. **Migrate incrementally**: one slice or vertical slice per phase; Redux stays until its last consumer is removed.
3. **Heavy derived work** (e.g. critical path): prefer **`useMemo` / module helpers** next to the trace reference, not a fat global store—unless profiling proves otherwise.
4. **Do not** adopt Context as the primary global store for timeline-scale UI state.

---

## Out of scope

- **Up-front normalization** of entire trace graphs in the client (e.g. span maps keyed by id) unless profiling shows clear lookup or memory wins.
- **Big-bang** conversion of all class components; convert opportunistically alongside state migration.
- **Real-time multi-user** or streaming ingestion in the UI—Jaeger’s model here is **historical snapshots**, not collaborative live editing.
- Replacing **URL + React Router** as the source of truth for deep-linkable views; this ADR assumes those stay primary where they already apply.

---

## Detailed change plan

Phases are **ordered by dependency and risk**. Sub-phases (**a**, **b**, …) are **incremental deliverables** (ideally one focused change-set each). Checkmarks reflect progress in this repository at **Last Updated**; update them when work merges.

### Phase 0 - Foundations

**Goal**: Dependencies, shared Query defaults, typing hygiene, and a class-component path to Zustand.

#### ✅ 0a. Shared TanStack Query client

- Implement in `packages/jaeger-ui/src/query/app-query-client.tsx`: `createAppQueryClient()`, a singleton `QueryClient`, and `AppQueryClientProvider` wrapping the app shell from `components/App/index.tsx`. Shared defaults include `staleTime` and `retry` for queries.
- **Follow-up (optional)**: central **query key** constants or helpers. Discovery hooks still use **inline** `queryKey` arrays in `hooks/useTraceDiscovery.ts` (`['services']`, `['spanNames', service]`); extracting them keeps new hooks consistent.

#### ✅ 0b. Zustand + class bridge

- Add **Zustand**; implement **`createStoreConnector`** for legacy class components that cannot use hooks.

#### ✅ 0c. Type alignment

- Remove stale `ReduxState` fields that are not in the real `combineReducers` shape (e.g. legacy `services` slice type if absent from the store).

---

### Phase 1 - Zustand for client UI state (Redux still holds server data)

**Goal**: Move **view / interaction** slices off Redux; keep fetches on Redux or Query until Phase 2.

#### ⬜ 1a. Trace compare (`traceDiff`)

- **Store**: `stores/trace-diff-store.ts` (`useTraceDiffStore`).
- **Removed** from Redux: `traceDiff` reducer.
- **Wiring**: `TraceDiff.tsx`, `SearchTracePage` (cohort actions + derived `diffCohort`), `TopNav` (Compare URL).

#### ⬜ 1b. Archive notifier (`archive` duck)

- Zustand (or colocated store) for archive UX; `TracePage` stops dispatching archive actions via Redux.

#### ⬜ 1c. Trace timeline UI (`traceTimeline` duck)

- Largest and most performance-sensitive slice; **split across multiple PRs** (e.g. layout/prefs vs collapse/detail vs `uiFind`-related behavior).
- Rewire or replace Redux **tracking middleware** hooks that listen to timeline action types.

#### ⬜ 1d. Deep Dependencies **client-only** modifiers

- Move **view modifier** actions from Redux `ddg` slice into Zustand (or a dedicated small store).
- Leave **DDG graph fetch** on Redux until Phase **2d** (or migrate together if one PR is cleaner).

#### ⬜ 1e. Embedded / `Page` / `TopNav` flags

- Migrate `embedded` (and related props) where they are pure UI; keep URL-derived initialization behavior.

#### ⬜ 1f. `config` Redux slice

- Already static for many apps; keep **`useConfig()`** as the public API and move implementation from Redux to a module or tiny store when Redux is removed.

---

### Phase 2 - TanStack Query for server state

**Goal**: Replace “dispatch → promise middleware → reducer” with **query/mutation** hooks and cache keys. Coordinate with [ADR 0002](./0002-otlp-api-v3-migration.md) / `api/v3` where applicable.

#### ⬜ 2a. Single trace load

- `TracePage` + `useOtelTrace` path: `useQuery` keyed by trace id; `staleTime` effectively infinite for immutable traces.

#### ⬜ 2b. Search + multi-trace fetch

- `searchTraces`, `fetchMultipleTraces`, `trace.search` / `rawTraces`: query key from serialized search params; handle **JSON file upload** as a separate path.

#### ⬜ 2c. Dependencies page

- `fetchDependencies` + `dependencies` reducer replaced by a query hook.

#### ⬜ 2d. Deep Dependencies graph fetch

- `fetchDeepDependencyGraph` as Query; Zustand (Phase **1d**) holds modifiers.

#### ⬜ 2e. Monitor metrics

- `metrics` reducer → one or more query hooks mirroring current loading/error shapes.

#### ⬜ 2f. Path-agnostic decorations

- `pathAgnosticDecorations` reducer → Query + optional small local/Zustand UI.

---

### Phase 3 - Derived state and selectors

#### ⬜ 3a. OTLP selectors / facades

- `selectOtelTrace` / `useOtelTrace` read from **Query data** + `OtelTraceFacade` (or equivalent), not Redux `trace.traces`.

#### ⬜ 3b. Heavy computations

- Keep critical path / stats as **memoized derivations** next to the trace; avoid stuffing them into global UI stores unless measured wins justify it.

---

### Phase 4 - Remove Redux

#### ⬜ 4a. Audit

- Eliminate `react-redux` `connect`, `useSelector`, `configure-store`, and unused actions/reducers.

#### ⬜ 4b. Dependencies

- Remove `redux`, `react-redux`, `redux-actions`, `redux-promise-middleware` when nothing imports them.

#### ⬜ 4c. Tests & docs

- Replace Redux `Provider` test wrappers with Query + Zustand test patterns.
- Update [ADR 0005](./0005-current-state-management-architecture.md) and contributor docs to describe the **post-Redux** layout.

---

## Rollback

Phases are designed to be **reverted independently**: e.g. reintroduce a Redux slice and `connect` for a feature if a migration PR must be backed out.

---

## Success criteria (lightweight)

- No regression in **trace view**, **search**, **compare**, **DDG**, or **monitor** flows.
- **Large traces** remain usable with virtualization; no systematic re-render storms on hover/collapse.
- **Contributor docs** state where new state belongs (Query vs Zustand vs URL vs local `useState`).

---

## References

- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [ADR 0002: OTLP / API v3](./0002-otlp-api-v3-migration.md)
- [ADR 0005: Current state management architecture](./0005-current-state-management-architecture.md)
