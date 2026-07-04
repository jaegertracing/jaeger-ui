# ADR-0009: Service Filter for Trace Timeline View

* **Status**: Implemented
* **Date**: 2026-04-20

## Context

When viewing large traces that span many microservices, users often want to focus on a subset of services. Currently the trace timeline shows every span from every service, and the only way to reduce visual noise is to manually collapse individual subtrees. There is no way to say "show me only spans from services A, B, and C."

A service filter allows users to select which services are visible in the trace timeline. Spans belonging to unselected services — along with their full subtrees — are pruned from the view. This is a non-destructive view-only filter: the underlying trace data is unchanged.

### Goals

1. **Filter button** in the Services column header — hollow/gray when inactive, filled brand color when active.
2. **Popup** explaining the feature: allows selecting which services are visible; unselected services' spans and their full subtrees are pruned.
3. **Pruning indicator**: the parent span of a pruned subtree shows a synthetic "N spans pruned" row with a gray dot and italic text, with error bubbling from pruned subtrees.
4. **State persistence**: filter state stored in Zustand, synced to localStorage (user defaults) and the URL (shareable links).
5. **URL precedence**: if a service filter is encoded in the URL, it overrides localStorage defaults. If absent from the URL, localStorage defaults apply.

## Decision

### URL Encoding

The filter state is encoded in the URL as `svcFilter=<checksum>.<bitmask>`:

- Service names are sorted lexicographically and assigned bit indices `0..N-1`.
- A 16-bit checksum of the sorted names detects staleness when a trace is reloaded with different services. If the checksum doesn't match, the filter is discarded.
- The bitmask is a variable-length hex string where bit `i = 1` means service at index `i` is visible.
- When all services are visible, the `svcFilter` param is removed from the URL entirely.
- `BigInt` is used internally for bitmask arithmetic to support arbitrarily many services.

See `src/components/TracePage/url/svcFilter.ts` for the implementation.

### State Management

- **Zustand** (`store.timeline.ts`): `prunedServices: Set<string>` — services currently pruned (empty = no filter). Using "pruned" (not "visible") means the empty set is the natural default. Reset on trace change.
- **localStorage** (`svcFilter.defaults`): cross-trace user preference for services to always prune (e.g., infrastructure services). Applied when no `svcFilter` URL param is present.
- **URL**: source of truth for shared state. Updated on filter change via `navigate({ search }, { replace: true })`.

On initial trace page load:

```
URL has svcFilter? ──yes──▶ decode hex → set prunedServices in Zustand
        │
        no
        ▼
localStorage has svcFilter.defaults? ──yes──▶ intersect with trace's services → set prunedServices
        │
        no
        ▼
No filter (all services visible)
```

### Pruning Rules

1. Subtree-based: if a span's service is pruned, the span **and its entire subtree** are removed — even children belonging to visible services.
2. A synthetic **pruned placeholder row** is inserted after visible parents that had children pruned, showing "N spans pruned" (total spans in pruned subtrees, not just direct children) with a gray dot.
3. **Error bubbling**: errors in pruned subtrees are counted and displayed on the placeholder row with a hollow error icon (matching the existing convention: solid = own error, hollow = descendant error).
4. The placeholder row reuses `SpanTreeOffset` for proper tree line rendering and always appears as the last child (terminated vertical line).

5. **Critical path bubbling**: when a span has pruned children, critical path segments from the pruned subtrees are merged onto the parent span bar — analogous to how collapsed spans bubble up their children's critical path. Only sections from pruned descendants are merged; visible children retain their own critical path rendering.

### Root Service Protection

- **Single root service name** (even across multiple root spans): that service's checkbox is disabled — it cannot be pruned. Select None keeps it selected.
- **Multiple root service names**: all are deselectable, but the Apply button is disabled if all root services would be pruned. Root services are marked with a "(root)" badge.

### Side Panel Interaction

When a selected span's service is pruned (in side panel mode), `detailStates` is cleared — the side panel returns to its default view.

### Edge Cases

| Scenario | Behavior |
|---|---|
| All services unchecked | Prevent — disable Apply, show warning |
| Single-service trace | Filter button hidden (nothing to filter) |
| Filter active + manual collapse | Both compose independently |
| `uiFind` + service filter | Both apply — pruned spans are not searchable |
| Stale URL `svcFilter` (checksum mismatch) | Filter discarded, falls back to all-visible |
| Malformed `svcFilter` | Silently ignored |

## Implementation Plan

### ✅ Phase 1: Core Infrastructure

- URL encoding utilities (`url/svcFilter.ts`) — `svcChecksum`, `encodeSvcFilter`, `decodeSvcFilter`, `getSortedServiceNames`
- Zustand store changes (`store.timeline.ts`) — `prunedServices`, `setPrunedServices`, `clearServiceFilter`
- localStorage integration — read/write `svcFilter.defaults` on trace load

### ✅ Phase 2: Pruning Logic

- Modified `generateRowStates` in `VirtualizedTraceView.tsx` — `prunedServices` parameter, subtree pruning, pruned child/error counting, placeholder row insertion
- `PrunedSpanRow` component — reuses `SpanTreeOffset` for tree hierarchy, hollow error icon, endpoint-name font
- `RowState` discriminated union with `isPrunedPlaceholder` variant

### ✅ Phase 3: UI and Wiring

- `ServiceFilter` component — funnel icon button (hollow/filled), antd Popover with checkbox list, color dots, root badge, Apply button with validation
- `TimelineHeaderRow` — `serviceFilterNode` prop rendered between title and collapser
- `TraceTimelineViewer/index.tsx` — URL sync (read `svcFilter` on mount, write on change), localStorage fallback, side panel cleanup on prune
- Root service locking for single-root traces

### ✅ Phase 4: Polish

- "Save as Default" button — applies filter and persists `prunedServices` to `localStorage` under `svcFilter.defaults`
- Accessibility — `role`, `aria-label`, `aria-pressed` on filter button; keyboard open via Enter/Space; `role="dialog"` and `role="group"` on popover; `role="alert"` on warnings
- Responsive design — `min-width`/`max-width` on popover; `text-overflow: ellipsis` + `title` attribute on service names; `focus-visible` outline on filter button

## Consequences

### Positive

- Users can focus on relevant services in large multi-service traces.
- Shareable filtered views via URL — a team member can send a link that highlights the services relevant to an investigation.
- User defaults in localStorage reduce repetitive filtering for users who consistently ignore infrastructure services.
- The hex bitmask URL encoding is compact (5 chars for 20 services) and deterministic.

### Negative

- Subtree pruning may prune spans from visible services if they are descendants of a pruned service's span. This is intentional (the pruned service is the "entry point" to that subtree) but could surprise users who expect to see all spans of a visible service. The pruned placeholder helps surface this.
- The bitmask encoding is tied to the lexicographic sort of service names. If a trace is reloaded after new spans are ingested, the service list changes and the old bitmask would map to wrong services. The 16-bit checksum prefix detects this and discards the stale filter, falling back to all-visible. The cost is 2-5 extra characters in the URL (`<checksum>.`).
- Additional complexity in `generateRowStates` — the function is already the hot path for trace rendering. The added `Set.has()` check per span is O(1) and should not impact performance.

### Alternatives Considered

1. **Span-level filtering (not subtree pruning)**: Prune only spans of pruned services, keep their children visible. Rejected because it produces confusing gaps in the tree — a child span at depth 5 would appear with no visible parent at depth 4.
2. **Regex-based service filter in URL**: More flexible but harder to share (URL-encoding regex is ugly) and harder to build a checkbox UI for.
3. **Base64 bitmask encoding**: More compact for very large service counts but less readable/debuggable than hex. Hex is sufficient — even 100 services is only 25 hex characters.
4. **Store visible services instead of pruned services**: Requires knowing all services upfront to initialize the set. Using `prunedServices` with empty-set-means-no-filter is simpler.
