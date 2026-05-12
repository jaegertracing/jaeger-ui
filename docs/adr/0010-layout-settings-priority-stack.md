# ADR-0010: Layout Settings Priority Stack

* **Status**: Proposed
* **Date**: 2026-05-10

## Context

The Jaeger UI trace view has layout settings (`timelineBarsVisible`, `detailPanelMode`) that can come from multiple competing sources:

1. **URL parameters** — a shared link (e.g. `?timeline=off&sidebar=sidepanel`) where Alice has configured the view and wants Bob to see exactly what she saw.
2. **Trace heuristics** — automatic adjustments the UI makes based on trace characteristics (e.g. detecting an agentic trace and hiding the timeline by default).
3. **localStorage** — the user's stored personal preferences (e.g. Bob always prefers the sidebar).

Prior to this decision, URL-driven updates wrote directly to localStorage. This meant that simply opening a shared link could silently corrupt the recipient's stored defaults — they would see the sender's settings on every future trace even though they never chose them.

Consider Alice and Bob:

- **Alice** always prefers the sidebar layout (stored in her localStorage). While investigating an incident she hides the timeline and shares the URL with Bob.
- **Bob** opens the link. Without this fix, his localStorage is immediately overwritten — from now on Bob's timeline is hidden on every trace, even though he never asked for that.
- **With this fix**, Bob sees exactly what Alice saw. The settings panel shows *"Set by shared link"* next to the timeline toggle, and Bob can click *"Set as my default"* if he wants to keep it, or simply ignore the indicator and his own defaults are preserved on the next trace he opens.

The three sources need to be reconciled into a single effective value for each setting, with clear priority ordering and without side effects between them.

### Goals

1. **URL parameters** should reproduce the sender's exact view for the recipient.
2. **Heuristics** should optimize the UI per-trace without becoming permanent defaults.
3. **localStorage** should only change when the user explicitly opts in.
4. The recipient should be able to see *why* a setting differs from their default, and adopt it with a single click.

## Decision

Resolve layout settings using a cascading priority stack, highest first:

```
URL parameters  >  heuristics  >  localStorage
```

If a higher-priority source provides a value, lower-priority sources are ignored for rendering. localStorage is never overwritten unless the user explicitly opts in via "Set as my default".

### Priority rules

- **URL parameters** win unconditionally. They represent intent from whoever created the link.
- **Heuristics** override localStorage but not URLs. They represent automatic optimizations based on trace characteristics.
- **localStorage** is the baseline. It represents the user's deliberate saved preferences.

### Session toggles are ephemeral

When a user flips a toggle while a URL or heuristic override is active, the new value takes effect immediately in the current session but is not written to localStorage and not added to the URL. On page refresh, the setting reverts to the localStorage default. This is intentional: a session toggle is an ephemeral adjustment, not a preference change.

To make a value permanent, the user must explicitly click "Set as my default", which writes to localStorage.

### URL parameters are stripped on toggle

When the user toggles a setting that was set by a URL parameter, the URL param is stripped. Ownership of that setting transfers from the URL to the in-memory store. This prevents the URL from continuing to override the user's intent after they have acted.

### UX: source transparency

The settings panel indicates when a value is being overridden by a higher-priority source:

| Setting | Control | Status |
| :--- | :--- | :--- |
| Timeline View | `[ Toggle: OFF ]` | *Set by shared link* — [Set as my default] |
| Span Details | `[ Toggle: SIDEBAR ]` | *Optimized for this trace* — [Set as my default] |

"Set as my default" appears only when the effective value differs from the localStorage default. Clicking it writes the current value to localStorage and hides the indicator.

## Implementation

The implementation is delivered in five independent PRs. PRs 1, 2, and 3 have no dependencies on each other and can be reviewed in parallel.

### PR 1 — URL utilities (`url/index.ts`)

Pure functions with no React dependency:

- `parseSettingsFromUrl(search)` — parses `?timeline=on|off` and `?sidebar=inline|sidepanel` into typed values, returning `null` for absent or unrecognized params.
- `stringifySettings(settings)` — converts typed settings back into query params.
- `rebaseSettings(search)` — strips layout params from a URL while preserving others (e.g. `uiFind`). Called when the user toggles a setting to clear the URL override.

### PR 2 — `persist` flag on Zustand setters (`store.layout.ts`, `store.ts`)

The Zustand setters (`setTimelineBarsVisible`, `applyDetailPanelModeToLayout`) gain an optional `persist?: boolean` flag (default `true`). When `persist=false`, the store state is updated but localStorage is not written. This is the mechanism that allows URL-driven updates to take effect in the UI without corrupting stored defaults. URL-driven and toggle-driven updates pass `persist=false`; only explicit "Set as my default" actions pass `persist=true`.

### PR 3 — `TraceViewSettings` UI redesign

Redesigns the settings control from a `Dropdown` to a `Popover` panel with `Switch` controls. This is a self-contained UX improvement with no dependency on the URL or priority stack logic.

### PR 4 — `useLayoutSettings` hook + wiring

The central hook. Returns a `ResolvedSetting<T>` for each setting:

```ts
type ResolvedSetting<T> = {
  value: T;
  source: 'url' | 'heuristic' | 'localstorage';
  isOverridden: boolean;  // true when value differs from the localStorage default
}
```

Resolution order per setting:

1. If a URL param is present and valid → `source: 'url'`, `isOverridden: urlValue !== lsDefault`.
2. Else if a heuristic override is present → `source: 'heuristic'`, `isOverridden: heuristicValue !== lsDefault`.
3. Else → `source: 'localstorage'`, `isOverridden: storeValue !== lsDefault` (detects session-only changes).

The hook also keeps the Zustand store in sync with URL values via a `useEffect` so that components reading Zustand directly (e.g. `TraceTimelineViewer`) see the correct values without going through the hook.

When a URL param disappears, the store is reverted to the localStorage default — but only if the store value still matches what the URL had set. This "revert guard" preserves any manual change the user made during the session.

`TracePage` calls `useLayoutSettings(location.search)` and uses `resolvedSetting.value` for rendering instead of raw Zustand store values. This is the single resolution point; all child components receive the effective value via props.

### PR 5 — Source badges + "Set as my default"

Adds the override indicator UI to `TraceViewSettings`: a source badge (*Set by shared link*, *Optimized for this trace*) and a "Set as my default" button. These are purely additive on top of a working priority stack and have no effect when no override is active.

## Consequences

### Positive

- Opening a shared link never corrupts the recipient's stored preferences. Alice can share a URL and Bob's localStorage stays intact.
- Bob sees exactly what Alice saw, and knows why (the source indicator). He can adopt her settings as his own defaults with one click, or keep them as a one-time override.
- Heuristics can tune the UI per-trace without becoming permanent.

### Negative

- Session toggles are ephemeral. Users who want permanence must use "Set as my default" — this is a new interaction pattern that may not be immediately obvious.
- Components deep in the tree continue to read from Zustand directly; the hook keeps the store in sync so this remains correct, but the indirection is non-obvious.

### Future work

- Heuristic overrides are currently stubbed (`computeHeuristicOverrides` returns `null` for all fields). The infrastructure is in place; heuristics will be implemented when trace-type detection is added.
- Additional settings (e.g. zoom level, collapsed state) could be added to the priority stack using the same pattern.
