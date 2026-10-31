# RFC 0006: Target State Management Architecture

* **Status**: Partially Implemented
* **Created**: 2026-04-09
* **Last Updated**: 2026-07-28

> Originally filed as ADR-0008. It describes a target architecture that does not exist yet rather than a decision taken, so it now lives here.

---

## Relationship to other documents

| Document | Role |
| :--- | :--- |
| **[ADR-0004](../adr/0004-state-management-strategy.md)** | **The decision**: Zustand for client UI state, TanStack Query for server state, and why. |
| **[RFC 0004](./0004-state-management-strategy.md)** | **The analysis and the plan**: alternatives weighed, plus the phased migration checklist (Phase 0–4) with rollback and testing notes. |
| **[ADR-0005](../adr/0005-current-state-management-architecture.md)** | **Where the code actually is**: how Query, Zustand, URL, localStorage, and the residual Redux interact today, while the migration is incomplete. |
| **This RFC (0006)** | **The target**: where each kind of state *should* live when the migration is complete, and how data flows between layers. |

Execution order and checkmarks belong in [RFC 0004 → Migration Path](./0004-state-management-strategy.md#migration-path), not here. Where this document and [RFC 0004](./0004-state-management-strategy.md) disagree on strategic direction, RFC 0004 wins.

Read the store shapes below as the intended design at the time of writing, not as an inventory of the code — that inventory is in [ADR-0005](../adr/0005-current-state-management-architecture.md), and the two have diverged as stores were split and renamed during the migration.

---

## TL;DR

| Layer | Owns | Does NOT own | Key files |
| :--- | :--- | :--- | :--- |
| **TanStack Query** | Server responses: traces, search results, services, metrics, DDG graph payloads, dependencies | Interaction state; layout settings | `src/query/app-query-client.tsx`, `src/hooks/`, `src/api/v3/` |
| **Zustand** | Shared client UI state: span collapse/expand, open detail panels, column widths, compare cohort, DDG view modifiers, embedded flags | Primary trace JSON; URL-derived navigation params | `src/stores/` (target location) |
| **URL** | Current view: trace id, search params, `uiFind`, compare params; anything that should survive a copy-paste link | Large objects; transient hover / focus state | `src/utils/url.ts`, per-page `url.ts` modules |
| **Local storage** | User preferences that survive sessions: theme, last search service/operation, column widths, detail-panel mode | Server data; application state | `store` utility, direct `localStorage` for per-preference keys |
| **`useState` / `useMemo`** | Transient leaf UI (hover, draft inputs) and heavy derivations (critical path, stats) keyed to a trace reference | Global sharing; URL persistence | Colocated in component files |

**Redux is absent** in the target. During migration, see **[ADR-0005](../adr/0005-current-state-management-architecture.md)** for the current hybrid wiring.

---

## Architecture overview

The diagram below shows the **target** data flow by actual page/component. Until migration completes, Redux sits between some of these boxes - see **[ADR-0005](../adr/0005-current-state-management-architecture.md)** for the current picture.

```mermaid
flowchart LR
  URL["URL"]
  LS["Local storage"]
  Pages["Pages &\ncomponents"]
  Query["TanStack Query\n(server state)"]
  Zustand["Zustand stores\n(client UI state)"]
  Local["useState / useMemo\n(local / derived)"]
  API["Jaeger API"]

  URL -->|"parse on navigation"| Pages
  LS  -->|"hydrate preferences"| Pages
  Pages -->|"write back"| URL

  Pages <-->|"useQuery hooks"| Query
  Query <-->|"fetch / cache"| API

  Pages <-->|"fine-grained selectors"| Zustand

  Pages --- Local
```

### Trace page: data movement in detail

How `TracePage` works once server state lives fully in Query and timeline UI in Zustand:

```mermaid
flowchart TD
  Router["URL / Router\n/trace/:traceId?uiFind=…"]
  Query["TanStack Query\n(fetches & caches trace)"]
  API["Jaeger API"]
  Page["TracePage\n(derives facade, criticalPath)"]
  Store["traceTimeline store\n(expand, collapse, widths)"]

  Router -->|"traceId + uiFind"| Page
  Page -->|"useTraceQuery"| Query
  Query -->|"cache miss → fetch"| API
  API -->|"OTLP trace"| Query
  Query -->|"stable trace reference"| Page
  Page <-->|"toggle / setWidth"| Store
  Page -->|"navigate(uiFind)"| Router
```

---

## URL state: mapping pattern

Every navigable page follows a consistent two-file pattern for reading and writing URL state.

### Pattern

```
src/components/<Page>/
└── url.ts          ← getUrl(state) + getUrlState(search) helpers
```

`getUrlState(search: string)` parses the query string into a typed object. `getUrl(state)` serialises it back. Components never build URLs by hand.

### Read: URL → component state

```tsx
// Inside SearchTracePage
const { search } = useLocation();                // raw query string
const urlState = getUrlState(search);            // typed { service, operation, tags, … }

// Passing `search` as the React key forces a full remount (and re-read)
// when the URL changes, so the form always reflects the URL.
<SearchForm key={search} defaultValue={urlState} />
```

### Write: user action → URL

```tsx
// User picks a service in the form
function onServiceChange(service: string) {
  const next = getUrl({ ...urlState, service });
  navigate(next);                                // URL becomes source of truth
}
```

### What gets encoded per page

| Page | URL params | Notes |
| :--- | :--- | :--- |
| **Search** | `service`, `operation`, `tags`, `start`, `end`, `limit`, `lookback`, `traceID[]`, `span[]` | Fully round-trips; `span[]` encodes `spanId@traceId` for linked spans |
| **Trace view** | `traceId` (route segment), `uiFind` (query) | Column widths, expand state **not** in URL (local storage / Zustand) |
| **Trace diff** | `cohort[]`, `a`, `b` (query params) | Parsed from URL into `traceDiff` store on mount |
| **Deep Dependencies** | `service`, `operation`, `start`, `end`, `visEncoding`, `showOperations` | All view modifiers in URL; DDG store holds same shape during session |
| **Monitor** | `service` | Minimal; page fetches metrics from Query on mount |

### Class components

Legacy class components receive URL-derived props via the project's `withRouteProps` HOC (`src/utils/withRouteProps.tsx`), which wraps React Router v7's `useLocation`, `useParams`, and `useNavigate` hooks and injects them as props (`location`, `search`, `params`, `navigate`). The same HOC pattern applies for Zustand: `createStoreConnector` in `utils/zustand-class-bridge.tsx` wraps a class component to inject store state as props.

---

## Zustand stores: target state shapes

The tables below document the **intended** store shapes. For migration steps — which Redux ducks these replace and which components need rewiring — see **[RFC 0004](./0004-state-management-strategy.md)**, Phase 1.

**How the delivered stores differ from the shapes below.** The inventory of what exists is in [ADR-0005](../adr/0005-current-state-management-architecture.md); four divergences are worth naming here, because each one was a deliberate departure from this design rather than an omission:

- The single `useTraceTimelineStore` proposed below was **delivered as two stores**, split by lifetime: `useTraceTimelineStore` (`store.timeline.ts`) for state that resets with the trace, and `useLayoutPrefsStore` (`store.layout.ts`) for preferences that outlive it. The reset rule below then needs no exceptions, which is why the split was made.
- `hoverIndentGuideIds` is **still in Redux** — the last field held exclusively by the `traceTimeline` duck ([RFC 0004](./0004-state-management-strategy.md), Phase 1c step 3).
- `prunedServices` was added to the interaction store after this was written, for the timeline service filter ([ADR-0009](../adr/0009-service-filter-trace-timeline.md)).
- The DDG store shipped as `useDdgViewModifiersStore`, and its graph query as `useDeepDependencyGraphQuery`.

Stores also did not all land in `src/stores/` as this document assumes. The convention that emerged is `src/stores/` when more than one feature reads a store, and a `store.<slice>.ts` beside the owning feature otherwise.

### `useTraceTimelineStore`

| Field | Type | Description | Persisted to |
| :--- | :--- | :--- | :--- |
| `traceID` | `string \| null` | Currently loaded trace; reset resets interaction state | - |
| `childrenHiddenIDs` | `Set<string>` | Span IDs whose children are collapsed | - |
| `detailStates` | `Map<string, DetailState>` | Open detail panels per span ID | - |
| `hoverIndentGuideIds` | `Set<string>` | Span IDs with active indent-guide hover highlight | - |
| `spanNameColumnWidth` | `number` | Fraction of timeline width for the name column (0.15–0.85) | `localStorage['spanNameColumnWidth']` |
| `sidePanelWidth` | `number` | Fraction for side-panel column (0.2–0.7) | `localStorage['sidePanelWidth']` |
| `detailPanelMode` | `'inline' \| 'sidepanel'` | Whether span details appear inline or in a side panel | `localStorage['detailPanelMode']` |
| `timelineBarsVisible` | `boolean` | Whether the Gantt bars column is shown | `localStorage['timelineVisible']` |
| `shouldScrollToFirstUiFindMatch` | `boolean` | One-shot flag; set after `uiFind` focus, cleared by the list | - |

**Key behaviour**: when `traceID` changes, all ephemeral fields (`childrenHiddenIDs`, `detailStates`, `hoverIndentGuideIds`, `shouldScrollToFirstUiFindMatch`) reset; persistent layout fields (`spanNameColumnWidth`, `sidePanelWidth`, `detailPanelMode`, `timelineBarsVisible`) carry over across traces.

### `useTraceDiffStore`

| Field | Type | Description |
| :--- | :--- | :--- |
| `cohort` | `string[]` | Ordered list of trace IDs selected for comparison |
| `a` | `string \| null` | Trace ID pinned to the left (A) pane |
| `b` | `string \| null` | Trace ID pinned to the right (B) pane |

Actions: `addToCohort(traceId)`, `removeFromCohort(traceId)`, `setA(traceId)`, `setB(traceId)`. Removing a trace from the cohort also clears `a` or `b` if they match.

### `useDdgModifiersStore`

Holds **view modifier flags** only. The DDG graph JSON (nodes + edges) lives in TanStack Query (`useDDGQuery`).

| Field | Type | Description |
| :--- | :--- | :--- |
| `showOperations` | `boolean` | Toggle operation-level nodes |
| `visEncoding` | `string \| null` | Visual encoding preset key |
| `density` | `'summary' \| 'full'` | Node density |

### `useEmbeddedStore`

| Field | Type | Description |
| :--- | :--- | :--- |
| `isEmbedded` | `boolean` | Hide full-app chrome when running inside an iframe |
| `disableLogFinder` | `boolean` | Suppress log search UI |
| *(other chrome flags)* | `boolean` | Derived from query param `embed` on app boot |

---

## Where do I put new state? (target)

1. **Fetched from the server or cached by HTTP semantics?** → **TanStack Query** - create a hook in `src/hooks/` and a client method in `src/api/v3/`.
2. **Shared UI that is not URL-derived and not server data?** → **Zustand** - add to an existing store (prefer) or create a focused new one in `src/stores/`.
3. **Should survive refresh and live in the URL?** → **URL** - use the page's `url.ts` `getUrl` / `getUrlState` helpers; never construct URLs inline.
4. **Must survive a session across browser tabs?** → **Local storage** - use the existing `store` utility or `localStorage` for simple string keys.
5. **Only this component needs it, or it is a pure function of a trace reference?** → **`useState` / `useMemo`** - keep it colocated; avoid globalising heavy derivations.
6. **App configuration or feature flags?** → Keep a stable hook surface (e.g. **`useConfig()`**); implementation may be a Zustand slice or module constant - do **not** spread raw Redux selectors or global singletons in components.

---

## Principles (from RFC 0004)

1. **Standardize on Zustand + TanStack Query** for new and migrated code.
2. **Prefer colocated heavy derivations** (`useMemo`, pure module helpers) over global stores for trace-sized computations.
3. **Selective subscriptions**: Zustand selectors must be fine-grained so virtualized rows do not re-render on unrelated store changes.

---

## Rollback and verification

Rollback strategy and phase-level testing are defined next to the migration checklist in **[RFC 0004 — Migration Path](./0004-state-management-strategy.md#migration-path)**. This RFC does not duplicate them.

---

## References

- **[ADR-0004: State management strategy](../adr/0004-state-management-strategy.md)** - the decision.
- **[RFC 0004: State management strategy](./0004-state-management-strategy.md)** - comparison and migration checklist.
- **[RFC 0002: Making Jaeger UI OpenTelemetry-Native](./0002-otel-native-jaeger-ui.md)** - server API direction; Query hooks align with `api/v3`.
- **[ADR-0005: Current state management architecture](../adr/0005-current-state-management-architecture.md)** - current wiring, valid during migration.
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
