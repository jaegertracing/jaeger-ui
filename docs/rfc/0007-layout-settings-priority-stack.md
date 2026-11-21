# RFC 0007: Layout Settings Priority Stack

* **Status**: Partially Implemented. PR 1's URL utilities are implemented in [#4759](https://github.com/jaegertracing/jaeger-ui/pull/4759), and PR 2's persistence controls in [#4777](https://github.com/jaegertracing/jaeger-ui/pull/4777). PR 4's resolver and wiring are implemented; PRs 3 and 5 remain outstanding.
* **Created**: 2026-05-10
* **Last Updated**: 2026-11-18

> Originally filed as ADR-0010. It is a proposal, and an unimplemented one, so it now lives here; [ADR-0010](../adr/0010-layout-settings-priority-stack.md) is a pointer at this document.

**Where this stands.** [#4759](https://github.com/jaegertracing/jaeger-ui/pull/4759) implements the layout URL utilities. [#4112](https://github.com/jaegertracing/jaeger-ui/pull/4112) added persistence, [#4777](https://github.com/jaegertracing/jaeger-ui/pull/4777) added persistence controls, and [#4798](https://github.com/jaegertracing/jaeger-ui/pull/4798) split saved preferences in `useSavedLayoutPrefsStore` from the in-memory `useDisplayedLayoutStore`. `useLayoutSettings` resolves each setting from the URL, optional heuristic inputs, and saved preferences. `TracePage` renders the resolved values and its toggles write to the URL without saving defaults, following [#4796](https://github.com/jaegertracing/jaeger-ui/pull/4796). No trace heuristics are supplied yet. `TraceViewSettings` remains an antd `Dropdown`; the popover, source badges, and "Set as my default" action remain outstanding. Until that action lands, no control changes the saved timeline or detail-panel default.

PR 2 overlaps with [#3981](https://github.com/jaegertracing/jaeger-ui/issues/3981) / [#4112](https://github.com/jaegertracing/jaeger-ui/pull/4112), which move `store.layout.ts` onto Zustand's `persist` middleware. Sequence the middleware migration first: the `persist` flag PR 2 needs is a property of whatever persistence mechanism the store ends up with, and adding it to the manual `localStorage.setItem` calls only to move them again is wasted work — so the flag belonged on top of #4112 rather than the reverse. That order held: #4112 merged first, and #3853's flag was adapted onto it.

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

### A toggle writes its value to the URL

When a user flips a toggle, the new value takes effect immediately and is written to the URL as that setting's parameter (`?timeline=off`), whether or not the URL carried the parameter before. It is not written to localStorage. A refresh or a copied link therefore keeps the value.

To make a value permanent, the user must explicitly click "Set as my default", which writes to localStorage.

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

Implemented in [#4759](https://github.com/jaegertracing/jaeger-ui/pull/4759). The original sketch names below are retained. The implementation uses `parseLayoutSettingsFromUrl` for `parseSettingsFromUrl` and `stringifyLayoutSettings` for `stringifySettings`. Instead of `rebaseSettings`, it provides `stripLayoutSettings` to remove all layout overrides and `stripLayoutSettingParam` to remove only the acted-on setting's override, preserving the other override and unrelated parameters. `getUrl` and `getTracePageLink` accept an optional layout-settings argument.

Pure functions with no React dependency:

- `parseSettingsFromUrl(search)` — parses `?timeline=on|off` and `?sidebar=inline|sidepanel` into typed values, returning `null` for absent or unrecognized params.
- `stringifySettings(settings)` — converts typed settings back into query params.
- `rebaseSettings(search)` — strips layout params from a URL while preserving others (e.g. `uiFind`).

### PR 2 ✅ — `persist` flag on Zustand setters (`store.layout.ts`, `store.ts`)

Implemented in [#4777](https://github.com/jaegertracing/jaeger-ui/pull/4777) and [#4798](https://github.com/jaegertracing/jaeger-ui/pull/4798) on top of #4112's `persist` middleware. The Zustand setters (`setTimelineBarsVisible`, `applyDetailPanelModeToLayout`) accept an optional options object with `persist?: boolean`, defaulting to `true`. The `setDetailPanelMode` coordinator in `store.ts` forwards the options. With `{ persist: false }`, a setter changes the displayed layout in `useDisplayedLayoutStore` and leaves the saved preferences in `useSavedLayoutPrefsStore` alone. Nothing is written to `localStorage`, so a temporary change does not overwrite defaults saved by another tab.

`useLayoutSettings` passes `{ persist: false }` when applying resolved settings and handling toggles. The mode and visibility setters still save when options are omitted.

Width drags update only the displayed widths while the displayed panel mode or timeline visibility differs from the saved layout. They resume saving when the displayed layout matches the saved one. This keeps constraints from a temporary layout out of the saved widths.

Switching to the side panel narrows the span name column to fit, and switching back to inline does not restore the width until the next load. The saved width stays unchanged.

### PR 3 — `TraceViewSettings` UI redesign

Redesigns the settings control from a `Dropdown` to a `Popover` panel with `Switch` controls. This is a self-contained UX improvement with no dependency on the URL or priority stack logic.

### PR 4 ✅ — `useLayoutSettings` hook + wiring

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
3. Else → `source: 'localstorage'`, `isOverridden: storeValue !== lsDefault`.

The hook also keeps the displayed Zustand store in sync with URL values via a `useLayoutEffect`, before paint, so that components reading Zustand directly (e.g. `TraceTimelineViewer`) see the correct values without going through the hook.

When a trace page opens, the hook sets the store from that page's URL: a setting with a parameter takes the parameter's value, and a setting without one takes the heuristic value, or else the localStorage default. A value shown on a trace that was open before does not carry over.

`TracePage` calls `useLayoutSettings(location, enableSidePanel)` and uses `resolvedSetting.value` for rendering instead of raw Zustand store values. The hook accepts optional per-setting heuristic inputs; no trace detector supplies them yet. It ignores URL and heuristic requests for a disabled side panel. Its setters apply the value without persistence and replace that setting's URL parameter, preserving other parameters, the hash, and router state.

This is the single resolution point. Child components receive the effective value via props, and components that read Zustand directly see the same values after synchronization.

### PR 5 — Source badges + "Set as my default"

Adds the override indicator UI to `TraceViewSettings`: a source badge (*Set by shared link*, *Optimized for this trace*) and a "Set as my default" button. These are purely additive on top of a working priority stack and have no effect when no override is active.

## Consequences

### Positive

- Opening a shared link never corrupts the recipient's stored preferences. Alice can share a URL and Bob's localStorage stays intact.
- Bob sees exactly what Alice saw, and knows why (the source indicator). He can adopt her settings as his own defaults with one click, or keep them as a one-time override.
- Heuristics can tune the UI per-trace without becoming permanent.

### Negative

- A toggled value lives in the URL and is not saved as a default. Users who want permanence must use "Set as my default" — this is a new interaction pattern that may not be immediately obvious.
- Components deep in the tree continue to read from Zustand directly; the hook keeps the store in sync so this remains correct, but the indirection is non-obvious.

### Future work

- The hook accepts heuristic overrides, but callers do not supply any yet. Trace-driven heuristics will be implemented when the layout rules for each trace type are defined.
- Additional settings (e.g. zoom level, collapsed state) could be added to the priority stack using the same pattern.
