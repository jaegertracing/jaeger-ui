# ADR-0009: Service Filter for Trace Timeline View

**Status**: Proposed
**Date**: 2026-04-20

## Context

When viewing large traces that span many microservices, users often want to focus on a subset of services. Currently the trace timeline shows every span from every service, and the only way to reduce visual noise is to manually collapse individual subtrees. There is no way to say "show me only spans from services A, B, and C."

A service filter would allow users to select which services are visible in the trace timeline. Spans belonging to unselected services — along with their full subtrees — would be pruned from the view. This is a non-destructive view-only filter: the underlying trace data is unchanged.

### Goals

1. **Filter button** in the Services column header — hollow/gray when inactive, filled brand color when active.
2. **Popup** explaining the feature: allows selecting which services are visible; unselected services' spans and their full subtrees are pruned.
3. **Pruning indicator**: the parent span of a pruned subtree shows a synthetic "N spans pruned" row with a gray dot and italic text.
4. **State persistence**: filter state stored in Zustand, synced to localStorage (user defaults) and the URL (shareable links).
5. **URL precedence**: if a service filter is encoded in the URL, it overrides localStorage defaults. If absent from the URL, localStorage defaults apply.

### Current Architecture

The trace timeline is rendered by `VirtualizedTraceView`, which calls `generateRowStates()` to build the visible row list from `trace.spans`. Rows are skipped when their depth exceeds a collapse threshold set by `childrenHiddenIDs`.

Key types and components:
- `IOtelTrace.services`: `ReadonlyArray<{ name: string; numberOfSpans: number }>` — the trace already has a sorted service list.
- `IOtelSpan.resource.serviceName`: how each span references its service.
- `IOtelSpan.childSpans`: `ReadonlyArray<IOtelSpan>` — direct children of a span.
- `IOtelSpan.hasChildren`, `IOtelSpan.depth`: tree structure metadata.
- `SpanBarRow`: renders one span row; receives `span`, `color`, service name extracted from `span.resource`.
- Zustand stores: `store.timeline.ts` (interaction state per trace), `store.layout.ts` (layout preferences persisted to localStorage).
- URL params: `packages/jaeger-ui/src/components/TracePage/url/index.ts` uses `query-string` to encode `uiFind` and other params.

## Decision

### 1. Filter Button UI

Add a **filter icon button** to the `TimelineHeaderRow` component, positioned in the Services column header (left of the column divider).

| State | Appearance |
|---|---|
| Inactive (all services visible) | Hollow/outline filter icon, gray color |
| Active (some services pruned) | Filled filter icon, brand color (`var(--accent-color)`) |

Clicking the button opens a **popover** (antd `Popover` with `trigger="click"`) containing:

```
┌─────────────────────────────────────────────┐
│ Filter Services                             │
│                                             │
│ Select which services are visible.          │
│ Unselected services will be pruned along    │
│ with their full subtrees.                   │
│                                             │
│ [Select All] [Select None]                  │
│ ─────────────────────────────────────────── │
│ ☑ service-a                    (12 spans)   │
│ ☑ service-b                     (8 spans)   │
│ ☐ service-c                     (3 spans)   │
│ ☑ service-d                     (1 span)    │
│ ─────────────────────────────────────────── │
│ [Apply]                                     │
└─────────────────────────────────────────────┘
```

- Service list is derived from `trace.services` (already sorted by span count descending in the trace model).
- Each row shows the service name and span count.
- "Select All" / "Select None" convenience buttons.
- Changes are applied on clicking **Apply** (not live-filtered on each checkbox toggle) to avoid disorienting layout shifts while the user is still deciding.
- Each service name is shown with its color dot (same color as used in the span bars) to help identify services.

### 2. URL Encoding: Hex Bitmask

The filter state is encoded in the URL as a compact hex bitmask to keep URLs short and shareable.

**Algorithm:**

1. Collect all service names from `trace.services`.
2. Sort them **lexicographically** (locale-independent, case-sensitive `Array.sort()`). This ensures the same trace always produces the same index assignment regardless of span count ordering.
3. Assign each service an index `0..N-1` in sorted order.
4. Compute a **checksum** of the sorted service name list (see below).
5. Build a bitmask where bit `i` is `1` if service at index `i` is **visible**, `0` if pruned.
6. Encode as `svcFilter=<checksum>.<bitmask>` where both parts are hex strings.

**Checksum:**

The bitmask is only meaningful for a specific set of sorted service names. If a trace is reloaded after new spans have been ingested, the service list may have changed — new services appear, shifting indices and making an old bitmask map to the wrong services.

A compact checksum detects this staleness. Compute it as:

```typescript
// Join sorted service names with NUL separator, hash to 16-bit value
function svcChecksum(sortedNames: ReadonlyArray<string>): string {
  const input = sortedNames.join('\0');
  let h = 0x811c;  // seed (first two bytes of FNV offset basis)
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 0x0101) & 0xffff;
  }
  return h.toString(16);  // 1-4 hex chars
}
```

This is a 16-bit hash — not cryptographic, just a fingerprint. The 1-in-65536 false-positive rate is acceptable: we are detecting accidental staleness from trace reloads, not adversarial input. The checksum adds at most 4 hex characters plus a `.` separator to the URL.

**URL parameter**: `svcFilter=<checksum>.<bitmask>`

Example with 8 services (sorted: `api`, `auth`, `cache`, `db`, `frontend`, `gateway`, `queue`, `worker`):
- Only `api` and `frontend` visible (indices 0 and 4): `svcFilter=a3f1.11` (where `a3f1` is the checksum of the 8 service names)
- No filter active: `svcFilter` param is **absent** from URL (equivalent to all-visible)

**Decoding with checksum validation:**

1. Split the `svcFilter` value on `.` into `[checksumHex, bitmaskHex]`.
2. Compute the checksum of the current trace's sorted service names.
3. If the checksums **match**: decode the bitmask normally — the service list hasn't changed.
4. If the checksums **don't match**: the service list has changed since the URL was generated. **Discard the bitmask** and fall back to no filter (all services visible). Optionally show a transient notification: _"Service filter cleared — trace services have changed since this link was created."_

**Other edge cases:**
- When all services are selected, the `svcFilter` param is **removed** from the URL entirely (clean URL = no filter).
- Malformed `svcFilter` values (no `.` separator, non-hex characters) are silently ignored (no filter applied).

**Implementation:** A utility module `src/components/TracePage/url/svcFilter.ts`:

```typescript
/**
 * Compute a 16-bit checksum of the sorted service name list.
 * Used to detect when the service list has changed since a URL was generated.
 */
export function svcChecksum(sortedNames: ReadonlyArray<string>): string;

/**
 * Encode a service visibility selection as "<checksum>.<bitmask>" hex string.
 * @param serviceNames - lexicographically sorted service names for the trace
 * @param visibleServices - Set of service names that should be visible
 * @returns encoded string, or null if all services are visible (no filter needed)
 */
export function encodeSvcFilter(
  serviceNames: ReadonlyArray<string>,
  visibleServices: ReadonlySet<string>
): string | null;

/**
 * Decode a "<checksum>.<bitmask>" string into a Set of visible service names.
 * Returns null if the checksum doesn't match (service list has changed),
 * the format is invalid, or the bitmask decodes to all-visible.
 * @param serviceNames - lexicographically sorted service names for the trace
 * @param encoded - the "<checksum>.<bitmask>" value from the URL
 * @returns { visibleServices, stale } or null if invalid/empty.
 *          stale=true when checksum mismatched and filter was discarded.
 */
export function decodeSvcFilter(
  serviceNames: ReadonlyArray<string>,
  encoded: string
): { visibleServices: Set<string>; stale: boolean } | null;
```

The hex bitmask uses big-endian bit ordering within each nibble: bit 0 is the MSB of the first hex character. For traces with more than 4 services, the hex string grows by one character per 4 services. A trace with 20 services needs at most 5 hex characters.

For large traces with many services (>52, exceeding a single JS number's safe integer bits), use `BigInt` for the bitmask arithmetic internally. The hex encoding/decoding with `BigInt.toString(16)` and `BigInt('0x' + hex)` handles arbitrary lengths.

### 3. State Management

#### Zustand Store

Add service filter state to `store.timeline.ts` (the per-trace interaction store), since the filter is trace-specific — different traces have different service lists:

```typescript
// Added to TraceTimelineInteractionStore
prunedServices: Set<string>;           // services currently pruned (empty = no filter)
setPrunedServices: (pruned: Set<string>) => void;
clearServiceFilter: () => void;
```

Using `prunedServices` (what's pruned) rather than `visibleServices` (what's visible) means the empty set is the natural default (no filter = nothing pruned), which avoids needing to initialize with all service names.

#### localStorage (User Defaults)

Store user's default pruned services in localStorage under key `svcFilter.defaults`:

```json
{
  "prunedServices": ["service-c", "service-d"]
}
```

This is a **cross-trace preference** — if a user always wants to hide certain services (e.g., infrastructure services like `istio-proxy`), they can set defaults that apply to any trace.

**Lifecycle:**
- On trace load: read `svcFilter` from URL. If present, decode and apply. If absent, read `svcFilter.defaults` from localStorage and apply (hiding any services that exist in this trace and are in the defaults list).
- On filter change: update Zustand store, update URL param, and optionally update localStorage defaults (via a "Save as default" checkbox or button in the popover).

#### URL Sync

The URL is the **source of truth for shared state**. When the filter changes:

1. Compute the new `svcFilter` hex value.
2. Call `navigate({ search: queryString.stringify({ ...currentParams, svcFilter }) }, { replace: true })` to update the URL without a history entry.
3. If all services are visible, remove `svcFilter` from the URL params.

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

### 4. Span Pruning Logic

Modify `generateRowStates()` in `VirtualizedTraceView.tsx` to accept an additional `prunedServices: Set<string>` parameter.

**Pruning rules:**
1. When iterating spans, if a span's `resource.serviceName` is in `prunedServices`, skip it **and set a collapse depth** to also skip all its descendants (regardless of their service name).
2. This means pruning is subtree-based: if a parent is pruned, the entire subtree below it is pruned — even children that belong to visible services. This is the correct semantic because those children are only reachable through the pruned parent.
3. When a span is visible but some of its direct children are pruned, insert a **synthetic pruned indicator row** after the span's row.

**Pruned indicator row:**

A new row type in `RowState`:

```typescript
type RowState = {
  span: IOtelSpan;
  isDetail: boolean;
  spanIndex: number;
} | {
  span: IOtelSpan;              // the parent span whose children were pruned
  isDetail: false;
  isPrunedPlaceholder: true;    // synthetic row: "N spans pruned"
  prunedChildrenCount: number;  // number of direct children pruned
  spanIndex: number;
};
```

The `isPrunedPlaceholder` flag marks a **synthetic placeholder row** inserted after a visible parent to indicate that some of its direct children were pruned by the service filter. The `span` field points to the **parent** (for indentation and context), not to any pruned span.

Rendered as a `PrunedSpanRow` component:
- Indented to `depth + 1` of the parent span (same as where children would appear).
- Shows a **gray dot** (instead of a colored service dot) and **italic text**: _"N spans pruned"_ (where N is the count of direct children pruned, not the total subtree size — this keeps the number meaningful and small).
- No expand/collapse control, no timeline bar, no click interaction.
- Uses a muted/secondary text color (`var(--text-secondary)` or similar design token).

**Modified `generateRowStates` pseudocode:**

```typescript
function generateRowStates(
  spans: ReadonlyArray<IOtelSpan>,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState>,
  detailPanelMode: 'inline' | 'sidepanel',
  prunedServices: Set<string>          // new parameter
): RowState[] {
  let collapseDepth: number | null = null;
  let serviceFilterDepth: number | null = null;  // new: tracks service-filter pruning
  const rowStates: RowState[] = [];
  // Track pruned direct-child counts per parent spanID
  const prunedChildCounts = new Map<string, number>();

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { spanID, depth } = span;

    // Reset service filter depth when we've exited the pruned subtree
    if (serviceFilterDepth != null && depth <= serviceFilterDepth) {
      serviceFilterDepth = null;
    }

    // Existing collapse logic
    if (collapseDepth != null) {
      if (depth >= collapseDepth) continue;
      collapseDepth = null;
    }

    // Service filter pruning
    if (serviceFilterDepth != null && depth > serviceFilterDepth) {
      continue;  // inside a pruned subtree
    }

    if (prunedServices.size > 0 && prunedServices.has(span.resource.serviceName)) {
      serviceFilterDepth = depth;
      // Count this as a pruned child of its parent
      // (parent identification: find the last emitted row with depth = depth - 1)
      // ... increment prunedChildCounts for parent
      continue;
    }

    // Emit visible span row
    rowStates.push({ span, isDetail: false, spanIndex: i });

    if (childrenHiddenIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }

    // Inline detail row (existing logic)
    if (detailPanelMode !== 'sidepanel' && detailStates.has(spanID)) {
      rowStates.push({ span, isDetail: true, spanIndex: i });
    }
  }

  // Insert pruned indicator rows after each parent that had children pruned
  // (second pass, or tracked inline during the first pass)
  // ...

  return rowStates;
}
```

**Parent identification for pruned counts:** Since spans are ordered depth-first, the parent of a pruned span at depth `d` is the most recently emitted visible span at depth `d - 1`. We can track this with a stack or a `Map<depth, spanID>` updated as we emit rows.

### 5. Component Structure

```
TimelineHeaderRow
  └── ServiceFilterButton          (new: filter icon, opens popover)
        └── ServiceFilterPopover   (new: checkbox list + apply)

VirtualizedTraceView
  ├── SpanBarRow                   (existing: visible spans)
  ├── SpanDetailRow                (existing: detail expansion)
  └── PrunedSpanRow                (new: "N spans pruned" indicator)
```

**New files:**

| File | Purpose |
|---|---|
| `src/components/TracePage/TraceTimelineViewer/ServiceFilter/index.tsx` | `ServiceFilterButton` + `ServiceFilterPopover` |
| `src/components/TracePage/TraceTimelineViewer/ServiceFilter/index.test.tsx` | Tests |
| `src/components/TracePage/TraceTimelineViewer/ServiceFilter/ServiceFilter.css` | Styles |
| `src/components/TracePage/TraceTimelineViewer/PrunedSpanRow.tsx` | Synthetic pruned indicator row |
| `src/components/TracePage/TraceTimelineViewer/PrunedSpanRow.test.tsx` | Tests |
| `src/components/TracePage/url/svcFilter.ts` | Hex bitmask encode/decode |
| `src/components/TracePage/url/svcFilter.test.ts` | Tests |

**Modified files:**

| File | Change |
|---|---|
| `store.timeline.ts` | Add `prunedServices`, `setPrunedServices`, `clearServiceFilter` |
| `VirtualizedTraceView.tsx` | Pass `prunedServices` to `generateRowStates`, render `PrunedSpanRow`, read/write URL `svcFilter` param |
| `TimelineHeaderRow.tsx` | Add `ServiceFilterButton` to the services column header |
| `TracePage/url/index.ts` | Add `svcFilter` to URL param handling |

### 6. Interaction Flows

#### Opening a trace via URL with `svcFilter`

```
1. TracePage mounts, parses URL params
2. Finds svcFilter=1a (example)
3. Calls decodeSvcFilter(trace.services sorted names, "1a") → Set of visible services
4. Computes prunedServices = allServices - visibleServices
5. Sets prunedServices in Zustand store
6. VirtualizedTraceView reads prunedServices, passes to generateRowStates
7. Filter button renders as filled/brand-color (active state)
```

#### Opening a trace via URL without `svcFilter`

```
1. TracePage mounts, parses URL params
2. No svcFilter param
3. Reads localStorage svcFilter.defaults
4. If defaults exist: intersect with this trace's service names → prunedServices
5. If no defaults: prunedServices = empty set (no filter)
6. Sets prunedServices in Zustand store
```

#### User toggles filter

```
1. User clicks filter button → popover opens
2. User checks/unchecks services, clicks Apply
3. Compute new prunedServices set
4. Update Zustand store
5. Encode visible services as hex → update URL svcFilter param (replace)
6. generateRowStates re-runs with new prunedServices
7. Pruned spans disappear, pruned indicators appear
8. Filter button updates to active/inactive based on whether any services are pruned
```

#### User clicks "Save as default"

```
1. Current prunedServices written to localStorage under svcFilter.defaults
2. Future traces (without URL svcFilter) will apply these defaults
```

### 7. Edge Cases

| Scenario | Behavior |
|---|---|
| All services unchecked | Prevent this — disable Apply when selection is empty, show warning "At least one service must be visible" |
| Root service pruned | A trace may have multiple root spans (orphans, multi-root). If pruning a service would remove **all** root spans, disable Apply and show warning _"Cannot prune — at least one root span must remain visible."_ The popover should mark root-span services with a subtle indicator (e.g., a "root" badge) so the constraint is visible before the user hits Apply. |
| Single-service trace | Filter button is hidden or disabled (nothing to filter) |
| Filter active + user collapses a span | Both filters compose: manual collapse and service filter are independent. A collapsed span hides its children regardless of service filter. |
| Trace comparison view | Service filter applies independently to each trace in the comparison |
| `uiFind` + service filter | Both apply: `uiFind` highlights matching spans among the visible (non-pruned) spans. Pruned spans are not searchable. |
| URL `svcFilter` references more services than trace has | Extra bits are ignored |
| URL `svcFilter` references fewer services than trace has | Missing services (higher indices) default to visible |

## Implementation Plan

### Phase 1: Core Infrastructure

1. **URL encoding utilities** (`url/svcFilter.ts` + tests) — pure functions, no UI dependency.
2. **Zustand store changes** (`store.timeline.ts`) — add `prunedServices` state and actions.
3. **localStorage integration** — read/write `svcFilter.defaults` in the store initialization.

### Phase 2: Pruning Logic

4. **Modify `generateRowStates`** — add `prunedServices` parameter and pruning logic.
5. **`PrunedSpanRow` component** — render the synthetic "N spans pruned" indicator row.
6. **Wire into `VirtualizedTraceView`** — pass `prunedServices` from Zustand, render `PrunedSpanRow` for the new row type.

### Phase 3: UI

7. **`ServiceFilterButton` + `ServiceFilterPopover`** — filter icon, popover with checkbox list, Apply button.
8. **`TimelineHeaderRow` integration** — mount the filter button in the services column header.
9. **URL sync** — update `svcFilter` URL param on filter change, read on mount.

### Phase 4: Polish

10. **"Save as default" button** in the popover.
11. **Accessibility** — keyboard navigation in the popover, ARIA labels on the filter button.
12. **Responsive design** — popover positioning for narrow viewports, long service name truncation.

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
