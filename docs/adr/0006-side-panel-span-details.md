# ADR-0006: Side Panel Span Details and Tree-Only Mode for Trace Timeline

**Status**: Proposed
**Date**: 2026-03-04

## Context

The Jaeger trace timeline view currently displays span details by expanding them **in-place** below the span bar row. When a user clicks a span, a detail row is inserted into the virtualized list showing accordion sections for Attributes, Resource, Events, Links, and Warnings.

This inline expansion was a significant UX improvement over the old Zipkin UI modal dialog -- it keeps the timeline visible and allows multiple spans to be expanded simultaneously. However, it has notable limitations compared to the approach taken by many modern/vendor tracing UIs:

- **Limited real estate**: Detail content is constrained in height, attributes are shown as collapsed summary lines rather than full tables.
- **Scroll displacement**: Expanding a detail row pushes subsequent spans down, causing the user to lose their position in the overall trace. With large traces, this is disorienting.
- **No independent scrolling**: The detail content scrolls with the trace timeline. A user examining a span's attributes cannot simultaneously keep an eye on the trace structure.
- **Height estimation**: The virtualized `ListView` uses fixed height estimates (161px / 197px) for detail rows, which don't reflect actual content height and cause layout jitter.

Many modern tracing UIs address these issues by showing span details in a right-side panel that scrolls independently of the trace view. While this limits display to one span at a time, the trade-offs (more space for details, independent scrolling, stable trace layout) are compelling for many workflows.

Additionally, users working primarily with the span hierarchy (e.g., analyzing service dependencies or call patterns) have no way to hide the timeline bars to reclaim horizontal space for service/operation names.

### Current Architecture

```
TracePage (index.tsx)
  TracePageHeader (view mode switcher, search, slim view toggle)
  TraceTimelineViewer (index.tsx)
    TimelineHeaderRow (column headers + VerticalResizer divider)
    VirtualizedTraceView (Redux-connected virtualized span list)
      ListView (custom virtual scroller, window-scroll mode)
        SpanBarRow (left: service tree, right: timeline bar)
        SpanDetailRow (inline detail, inserted when span expanded)
          SpanDetail (Attributes, Resource, Events, Links, Warnings accordions)
```

Key state in Redux (`TTraceTimeline` via `duck.ts`):
- `detailStates: Map<string, DetailState>` -- which spans have details expanded, and accordion open/close state per span
- `childrenHiddenIDs: Set<string>` -- collapsed parent spans in the tree
- `spanNameColumnWidth: number` -- ratio (0-1) for the left/right column split, persisted to localStorage

The two-column layout uses flexbox with `TimelineRow.Cell` components. `VerticalResizer` provides drag-to-resize between columns (min 0.15, max 0.85, default 0.25).

Row generation in `VirtualizedTraceView.generateRowStates()` iterates through spans and inserts `{isDetail: true}` rows for any span present in the `detailStates` Map.

## Decision

Introduce two independent, optional layout enhancements:

1. **Side panel mode**: When enabled, clicking a span shows its details in a fixed right-side panel instead of expanding inline. Only one span's details are shown at a time. The panel scrolls independently.
2. **Tree-only mode**: When enabled, the timeline bar column is hidden entirely, and the service/operation hierarchy fills the available width.

These are **independent boolean toggles**, yielding four valid layout combinations:

| Detail Mode       | Timeline Bars | Description                                   |
|-------------------|---------------|-----------------------------------------------|
| Inline (default)  | Visible       | Current behavior, no changes                  |
| Inline            | Hidden        | Tree-only with inline expand                  |
| Side panel        | Visible       | Timeline visible, detail in right panel       |
| Side panel        | Hidden        | Tree-only with detail in right panel          |

The current inline behavior remains the default. Users opt in to the new layouts via toggle controls in the timeline header.

### Configuration (Feature Flag)

Side panel mode is shipped as an experimental feature behind a config flag. Two new options are added to the `Config` type (`types/config.ts`) and `default-config.ts`:

```typescript
// in types/config.ts, under the existing Config type
// traceTimeline controls the trace timeline viewer layout options.
traceTimeline?: {
  // enableSidePanel enables the side panel layout option in the trace timeline.
  // When false, the side panel toggle is hidden and only inline detail mode is available.
  // Default: false (experimental, opt-in).
  enableSidePanel?: boolean;

  // defaultDetailPanelMode sets the initial detail panel mode when enableSidePanel is true.
  // 'inline' preserves the current behavior as the default.
  // 'sidepanel' makes the side panel the default experience.
  // Users can still toggle between modes at runtime; this only controls the initial state.
  // Default: 'inline'.
  defaultDetailPanelMode?: 'inline' | 'sidepanel';
};
```

Default config in `default-config.ts`:

```typescript
traceTimeline: {
  enableSidePanel: false,
  defaultDetailPanelMode: 'inline',
},
```

The tree-only mode toggle (hide timeline bars) does not require a feature flag since it is a simpler, lower-risk enhancement that does not change the detail viewing paradigm.

When `enableSidePanel` is false:
- The side panel toggle icon is not rendered in the `TimelineHeaderRow`
- The Redux initial state always uses `detailPanelMode: 'inline'`
- Any `detailPanelMode` value in localStorage is ignored

When `enableSidePanel` is true:
- The side panel toggle icon appears in the `TimelineHeaderRow`
- The Redux initial state reads `detailPanelMode` from localStorage, falling back to `defaultDetailPanelMode` from config
- Users can switch between inline and side panel modes at runtime

The config flows through the existing pattern: `useConfig()` hook in `TracePage` → prop to `TraceTimelineViewer` → prop to `TimelineHeaderRow` and `VirtualizedTraceView`.

### Settings Menu (replaces Keyboard Shortcuts button)

The layout toggles are infrequent global settings, not navigation controls, so they belong at the page header level rather than in the `TimelineHeaderRow` (which would become too crowded, and where the expand/collapse icons are logically scoped to tree navigation).

The `TracePageHeader` title row currently has this layout:

```
[← Back] [ExternalLinks] [▶ Title] [SearchBar] [⌘] [View ▾] [Archive] [↗]
```

The `[⌘]` button (`KeyboardShortcutsHelp` component) is replaced with a **Settings gear icon** (`IoSettingsOutline` from `react-icons/io5`) that opens an antd `Dropdown` menu. The dropdown contains:

```
┌──────────────────────────┐
│ ✓ Show Timeline          │   ← toggles timelineBarsVisible
│   Show Span in Sidebar   │   ← toggles detailPanelMode (only when enableSidePanel config is true)
│ ───────────────────────  │
│   Keyboard Shortcuts     │   ← opens the existing KeyboardShortcutsHelp modal
└──────────────────────────┘
```

**Menu item details:**

1. **"Show Timeline"** -- checkmark when `timelineBarsVisible === true`. Clicking toggles the value. Always present.
2. **"Show Span in Sidebar"** -- checkmark when `detailPanelMode === 'sidepanel'`. Clicking toggles between `'inline'` and `'sidepanel'`. Only rendered when `enableSidePanel` config is true.
3. **Divider** -- antd menu divider separating layout settings from other items.
4. **"Keyboard Shortcuts"** -- clicking opens the existing `KeyboardShortcutsHelp` modal (reuse the `getHelpModal()` function and modal state). No checkmark.

**Implementation approach:**

The new component `TraceViewSettings` (or inline in `TracePageHeader`) replaces `KeyboardShortcutsHelp` in the title row. It follows the same `Dropdown` + `Button` pattern as `AltViewOptions`:

```tsx
<Dropdown menu={{ items: settingsItems }} trigger={['click']}>
  <Button className="TraceViewSettings">
    <IoSettingsOutline />
  </Button>
</Dropdown>
```

The checkmark pattern uses antd's menu item API -- items with a check icon prefix (e.g., `IoCheckmark` from `react-icons/io5`) when active, or empty space when inactive. This matches common dropdown toggle patterns.

**Props needed by TraceViewSettings:**
- `timelineBarsVisible: boolean`
- `detailPanelMode: 'inline' | 'sidepanel'`
- `enableSidePanel: boolean`
- `onTimelineBarsToggle: () => void`
- `onDetailPanelModeToggle: () => void`

These are dispatched via Redux from the `TraceTimelineViewer` duck, wired through `TracePage` → `TracePageHeader` → `TraceViewSettings`.

### New Redux State

```typescript
// Added to TTraceTimeline
detailPanelMode: 'inline' | 'sidepanel';  // default: 'inline'
timelineBarsVisible: boolean;               // default: true
sidePanelWidth: number;                     // ratio 0-1, default: 0.45
```

No new state is needed for tracking which span is selected -- the existing `detailStates: Map<string, DetailState>` serves this role in both modes. In side panel mode, the map has at most one entry (enforced by the reducer). The side panel reads the single entry from `detailStates` to determine which span to display.

Layout preferences (`detailPanelMode`, `timelineBarsVisible`, `sidePanelWidth`) are persisted to localStorage following the existing `spanNameColumnWidth` pattern in `duck.ts`.

### Side Panel Placement

The side panel lives **outside** the virtualized `ListView`, as a sibling element in a flex container:

```
TraceTimelineViewer (flex row)
  TraceTimelineViewerMain (flex: 1 - sidePanelWidth)
    TimelineHeaderRow
    VirtualizedTraceView (with ListView, window-scroll mode)
  VerticalResizer (reused from components/common/)
  SpanDetailSidePanel (flex: sidePanelWidth, overflow-y: auto)
```

### Row Generation Change

`generateRowStates()` becomes mode-aware. In side panel mode, it skips inserting `{isDetail: true}` rows entirely. The memoized function receives `detailPanelMode` as an additional parameter to invalidate correctly.

### Column Width Handling for Tree-Only Mode

When `timelineBarsVisible === false`, components use `effectiveColumnWidth = 1.0` locally in the render path. The Redux-stored `spanNameColumnWidth` is left untouched so it restores correctly when bars are re-shown.

### Unified `DETAIL_TOGGLE` Action

The existing `DETAIL_TOGGLE(spanID)` action is reused for both modes. The span row click always dispatches the same action -- it does not need to know how details will be displayed. The reducer handles the action differently based on the current `detailPanelMode`:

- **Inline mode** (current behavior, unchanged): toggles the span's entry in `detailStates` Map. Multiple spans can be expanded simultaneously.
- **Side panel mode**: if the span is already in `detailStates`, removes it (closing the panel). Otherwise, clears `detailStates` and adds a single entry for the clicked span. This enforces the one-span-at-a-time constraint using the same data structure.

All existing sub-actions (`DETAIL_TAGS_TOGGLE`, `DETAIL_LOGS_TOGGLE`, etc.) work unchanged in both modes -- they operate on a `DetailState` entry in the map by spanID, regardless of how many entries the map has.

This keeps the component tree (`SpanBarRow`, `VirtualizedTraceView`) completely mode-agnostic. The `detailPanelMode` only affects:
1. The `DETAIL_TOGGLE` reducer (single vs. multiple entries in `detailStates`)
2. `generateRowStates` (skips inline detail rows in sidepanel mode)
3. `TraceTimelineViewer` rendering (conditionally renders the side panel)

## Consequences

### Benefits
- Users get more horizontal space for span detail content (attributes as full tables, etc.)
- Independent scrolling means examining details doesn't lose trace context
- The trace layout stays stable when selecting different spans (no row insertion/removal)
- Tree-only mode gives maximum space for service/operation hierarchy navigation
- All four layout combinations serve valid use cases
- Fully backward compatible: existing inline behavior is unchanged and remains the default

### Risks and Trade-offs
- Side panel shows only one span at a time (inline mode allows multiple). This is acceptable because the panel provides a better single-span experience, and inline mode remains available.
- `TraceTimelineViewer` takes on additional layout responsibility as a flex container.
- The `generateRowStates` memoization gains a new parameter, adding a cache invalidation dimension.

### Not Addressed
- Comparison mode (showing two spans' details side by side) -- could be a future enhancement

## Implementation Roadmap

### Phase 1: Configuration, Layout Mode State, and Toggle Controls

Wire up config options, state plumbing, and UI toggle icons with no rendering changes.

**Files to modify:**
- `types/config.ts` -- add `traceTimeline?: { enableSidePanel?: boolean; defaultDetailPanelMode?: 'inline' | 'sidepanel' }` to `Config` type
- `constants/default-config.ts` -- add `traceTimeline: { enableSidePanel: false, defaultDetailPanelMode: 'inline' }` defaults
- `types/TTraceTimeline.ts` -- add `detailPanelMode`, `timelineBarsVisible`, `sidePanelWidth`
- `TraceTimelineViewer/duck.ts` -- new actions (`SET_DETAIL_PANEL_MODE`, `SET_TIMELINE_BARS_VISIBLE`, `SET_SIDE_PANEL_WIDTH`), reducers, localStorage persistence; modify `DETAIL_TOGGLE` reducer to enforce single-entry constraint on `detailStates` when in sidepanel mode; `newInitialState()` reads config for `defaultDetailPanelMode` and respects `enableSidePanel` flag
- `TracePageHeader/TraceViewSettings.tsx` (new) -- settings gear dropdown replacing `KeyboardShortcutsHelp` button; contains "Show Timeline" toggle, "Show Details in Panel" toggle (gated by `enableSidePanel`), and "Keyboard Shortcuts" menu item
- `TracePageHeader/TracePageHeader.tsx` -- replace `<KeyboardShortcutsHelp>` with `<TraceViewSettings>`; wire new props
- `TraceTimelineViewer/index.tsx` -- wire new Redux state/dispatch
- `TracePage/index.tsx` -- read `config.traceTimeline`, connect layout state from Redux, pass to `TracePageHeader`

**Outcome:** Toggle controls visible (side panel toggle gated by config), preferences persist to localStorage, no visual layout changes.

### Phase 2: Tree-Only Mode (Hide Timeline Bars)

Ship independently of the side panel.

**Files to modify:**
- `TraceTimelineViewer/SpanBarRow.tsx` -- new prop `timelineBarsVisible`; when false, render only name cell at full width
- `TraceTimelineViewer/SpanBarRow.css` -- full-width styling
- `TraceTimelineViewer/SpanDetailRow.tsx` -- full-width detail when bars hidden
- `TraceTimelineViewer/TimelineHeaderRow/TimelineHeaderRow.tsx` -- hide ticks, viewing layer, `VerticalResizer`
- `TraceTimelineViewer/VirtualizedTraceView.tsx` -- read and pass `timelineBarsVisible`
- `TraceTimelineViewer/index.tsx` -- pass through to children

**Outcome:** Users can toggle timeline bars on/off. Inline expansion still works. Column width preference preserved.

### Phase 3: Side Panel Container and Span Selection

Core side panel functionality.

**Files to create:**
- `TraceTimelineViewer/SpanDetailSidePanel/index.tsx` -- wraps existing `SpanDetail` component, independent scroll
- `TraceTimelineViewer/SpanDetailSidePanel/index.css` -- panel styling

**Files to modify:**
- `TraceTimelineViewer/index.tsx` -- flex layout, conditional panel + `VerticalResizer` rendering
- `TraceTimelineViewer/VirtualizedTraceView.tsx` -- `generateRowStates` skips detail rows in sidepanel mode (no changes to `renderSpanBarRow` -- it still dispatches `detailToggle` as before)
- `TraceTimelineViewer/SpanBarRow.tsx` -- `isSelected` prop for visual highlight (derived from `detailStates` in `VirtualizedTraceView`)

**Outcome:** Clicking a span in side panel mode shows details in right panel. Independent scrolling. Adjustable width.

### Phase 4: Side Panel Polish and Integration

- Close button in panel header (dispatches `DETAIL_TOGGLE` for the displayed span, removing it from `detailStates`)
- Next/prev span navigation in panel header
- Keyboard shortcuts for panel navigation (`TracePage/keyboard-shortcuts.ts`)
- Mode-switching transition logic: switching from inline to sidepanel keeps only the first entry in `detailStates` (if any); switching from sidepanel to inline keeps the current entry (user can then expand additional spans)

### Phase 5: Combined Modes, Analytics, Final Polish

- Verify all four layout combinations
- Analytics tracking for layout mode changes
- Responsive guardrails (min panel width 0.2, max 0.7)
- Embedded mode compatibility
- Performance verification with large traces (10K+ spans)

## Critical Files

| File | Role |
|------|------|
| `packages/jaeger-ui/src/types/config.ts` | Config type with `traceTimeline` feature flag |
| `packages/jaeger-ui/src/constants/default-config.ts` | Default config values |
| `packages/jaeger-ui/src/types/TTraceTimeline.ts` | Redux state type definitions |
| `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/duck.ts` | Redux actions, reducers, localStorage |
| `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/index.tsx` | Container layout, panel rendering |
| `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/VirtualizedTraceView.tsx` | Mode-aware row generation |
| `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanBarRow.tsx` | Tree-only mode, selection highlight |
| `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanDetailRow.tsx` | Full-width in tree-only mode |
| `packages/jaeger-ui/src/components/TracePage/TracePageHeader/TraceViewSettings.tsx` | Settings gear dropdown (new, replaces `KeyboardShortcutsHelp`) |
| `packages/jaeger-ui/src/components/TracePage/TracePageHeader/TracePageHeader.tsx` | Page header, hosts settings dropdown |
| `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanDetail/index.tsx` | Reused in side panel |
| `packages/jaeger-ui/src/components/common/VerticalResizer.tsx` | Reused as-is for panel divider |
