# RFC 0007: Layout Settings Priority Stack

* **Status**: Partially Implemented. PR 1's URL utilities are implemented in [#4759](https://github.com/jaegertracing/jaeger-ui/pull/4759); PRs 2–5 remain outstanding.
* **Created**: 2026-05-10
* **Last Updated**: 2026-11-17

> Originally filed as ADR-0010. It is a proposal, and an unimplemented one, so it now lives here; [ADR-0010](../adr/0010-layout-settings-priority-stack.md) is a pointer at this document.

**Where this stands.** [#4759](https://github.com/jaegertracing/jaeger-ui/pull/4759) implements PR 1's layout URL utilities, adapting closed, unmerged [#3852](https://github.com/jaegertracing/jaeger-ui/pull/3852). The helpers parse and serialize layout settings, remove all overrides or only one, and include settings in trace links. They do not yet apply URL settings to the view. [#4112](https://github.com/jaegertracing/jaeger-ui/pull/4112) has migrated `useLayoutPrefsStore` to Zustand's `persist` middleware with the `jaeger.layout` storage key. PR 2's persistence control remains outstanding; its earlier PR [#3853](https://github.com/jaegertracing/jaeger-ui/pull/3853) closed without merging. There is no `useLayoutSettings` or heuristic layer, and `TraceViewSettings` remains an antd `Dropdown`. The remaining work must prevent URL-driven updates from overwriting saved preferences.

PR 2 overlaps with [#3981](https://github.com/jaegertracing/jaeger-ui/issues/3981) / [#4112](https://github.com/jaegertracing/jaeger-ui/pull/4112), which move `store.layout.ts` onto Zustand's `persist` middleware. Sequence the middleware migration first: the `persist` flag PR 2 needs is a property of whatever persistence mechanism the store ends up with, and adding it to the manual `localStorage.setItem` calls only to move them again is wasted work — so #3853 should be rebased on top of #4112 rather than the reverse.

## Context

The Jaeger UI trace view has layout settings (`timelineBarsVisible`, `detailPanelMode`) that can come from multiple competing sources:

1. **URL parameters** — a shared link (e.g. `?timeline=off&sidebar=sidepanel`) where Alice has configured the view and wants Bob to see the settings she chose.
2. **Trace heuristics** — automatic adjustments the UI makes based on trace characteristics (e.g. detecting an agentic trace and hiding the timeline by default).
3. **localStorage** — the user's stored personal preferences (e.g. Bob always prefers the sidebar).

Prior to this decision, URL-driven updates wrote directly to localStorage. This meant that simply opening a shared link could silently corrupt the recipient's stored defaults — they would see the sender's settings on every future trace even though they never chose them.

Consider Alice and Bob:

- **Alice** always prefers the sidebar layout (stored in her localStorage). While investigating an incident she hides the timeline and shares the URL with Bob.
- **Bob** opens the link. Without this fix, his localStorage is immediately overwritten — from now on Bob's timeline is hidden on every trace, even though he never asked for that.
- **With this fix**, Bob sees the timeline hidden, as Alice chose, and keeps his own choice for the detail panel. The settings panel shows *"Set in the URL"* next to the timeline toggle, and Bob can click *"Set as my default"* if he wants to keep it, or simply ignore the indicator and his own defaults are preserved on the next trace he opens.

The three sources need to be reconciled into a single effective value for each setting, with clear priority ordering and without side effects between them.

### Goals

1. **URL parameters** should reproduce for the recipient every setting that the sender chose on the page.
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

- **URL parameters** win unconditionally. They represent an explicit choice for this page, made by whoever created the link or by the user's own toggle.
- **Heuristics** override localStorage but not URLs. They represent automatic optimizations based on trace characteristics.
- **localStorage** is the baseline. It represents the user's deliberate saved preferences.

### A toggle writes its value to the URL

When a user flips the timeline toggle or the detail-panel toggle, the new value takes effect immediately and the URL gains that setting as a parameter (`?timeline=off`), or its existing parameter changes to the new value. The value is not written to localStorage. Because of this, the URL holds every choice of these two settings made on the page: on the standalone trace page a refresh keeps those choices, and a link copied from the address bar carries them to the recipient. A setting absent from the URL follows the trace's heuristics, then the localStorage default of whoever opens the page.

The toggled setting applies to the current page only. A link without the parameter, to this trace or another, falls back to the heuristics and the localStorage default. To make a value the localStorage default, the user clicks "Set as my default", which writes it to localStorage and leaves the parameter in the URL.

This reverses the earlier proposal, which removed the parameter on toggle and kept the new value only in memory.

The table compares three rules for what the URL holds:

- **Every setting, always**: the URL carries a parameter for each layout setting at all times.
- **Parameter removed on toggle**: the URL carries a setting only while it comes from a shared link, and a toggle removes it.
- **Explicit choices only**: the URL carries a setting once a link or a toggle on the page has set it.

| Criterion | Every setting, always | Parameter removed on toggle | Explicit choices only |
| :--- | :---: | :---: | :---: |
| A refresh of the trace page keeps the settings chosen on it | 🟢 | ❌ | 🟢 |
| A link copied from the address bar reproduces the sender's toggled settings | 🟢 | ❌ | 🟢 |
| The recipient sees the sender's value of both settings | 🟢 | ❌ | 🟨¹ |
| The recipient's localStorage default can apply to a setting that the sender left alone | ❌ | 🟢 | 🟢 |
| A copied link carries only what the sender meant to share | ❌ | 🟢 | 🟨² |

🟢 good, 🟨 partial, ❌ poor.

- ¹ The link carries only the settings present in the sender's URL: those that arrived with a link and those toggled on the page. Every other setting follows the trace's heuristics and the recipient's localStorage default.
- ² A link copied after a toggle carries the toggled setting, even when the sender changed the setting for their own convenience.

This RFC adopts "explicit choices only". The first two rows rule out "parameter removed on toggle", because a URL that loses a choice made on the page defeats Goal 1. The last two rows rule out "every setting, always", because a link that carries every setting leaves the recipient's localStorage default no setting to apply to. Two costs are accepted. The recipient sees their own value for a setting that the sender did not toggle, because a value that the sender never chose is the sender's default and not a choice to share. A copied link carries toggled settings that the sender may not have meant to share; the recipient's localStorage stays untouched, and the indicator described below marks each URL value that differs from the recipient's localStorage default.


### UX: source transparency

The settings panel indicates when a value is being overridden by a higher-priority source:

| Setting | Control | Status |
| :--- | :--- | :--- |
| Timeline View | `[ Toggle: OFF ]` | *Set in the URL* — [Set as my default] |
| Span Details | `[ Toggle: SIDEBAR ]` | *Optimized for this trace* — [Set as my default] |

"Set as my default" appears only when the effective value differs from the localStorage default. Clicking it writes the current value to localStorage and hides the indicator.

The page does not distinguish a parameter that arrived with a shared link from one that the user's own toggle wrote, so the indicator reads *Set in the URL* in both cases.

## Implementation

The implementation is delivered in five independent PRs. PRs 1, 2, and 3 have no dependencies on each other and can be reviewed in parallel.

### PR 1 — URL utilities (`url/index.ts`)

Implemented in [#4759](https://github.com/jaegertracing/jaeger-ui/pull/4759). The original sketch names below are retained. The implementation uses `parseLayoutSettingsFromUrl` for `parseSettingsFromUrl` and `stringifyLayoutSettings` for `stringifySettings`. Instead of `rebaseSettings`, it provides `stripLayoutSettings` to remove all layout overrides and `stripLayoutSettingParam` to remove only the acted-on setting's override, preserving the other override and unrelated parameters. `getUrl` and `getTracePageLink` accept an optional layout-settings argument. A toggle sets the parameter (see "A toggle writes its value to the URL"), so neither `stripLayoutSettings` nor `stripLayoutSettingParam` has a caller in this plan, and PR 4 deletes both.

Pure functions with no React dependency:

- `parseSettingsFromUrl(search)` — parses `?timeline=on|off` and `?sidebar=inline|sidepanel` into typed values, returning `null` for absent or unrecognized params.
- `stringifySettings(settings)` — converts typed settings back into query params.
- `rebaseSettings(search)` — strips layout params from a URL while preserving others (e.g. `uiFind`).

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
3. Else → `source: 'localstorage'`, `isOverridden: false`.

A toggle writes the new value into the URL with `stringifyLayoutSettings`. The write preserves the other query parameters.

The hook also keeps the Zustand store in sync with URL values via a `useEffect` so that components reading Zustand directly (e.g. `TraceTimelineViewer`) see the correct values without going through the hook.

When a URL param disappears, the store is reverted to the localStorage default. The revert needs no guard, because a manual change is in the URL.

`TracePage` calls `useLayoutSettings(location.search)` and uses `resolvedSetting.value` for rendering instead of raw Zustand store values. This is the single resolution point; all child components receive the effective value via props.

### PR 5 — Source badges + "Set as my default"

Adds the override indicator UI to `TraceViewSettings`: a source badge (*Set in the URL*, *Optimized for this trace*) and a "Set as my default" button. These are purely additive on top of a working priority stack and have no effect when no override is active.

## Consequences

### Positive

- Opening a shared link never corrupts the recipient's stored preferences. Alice can share a URL and Bob's localStorage stays intact.
- Bob sees the settings that Alice chose, and knows why (the source indicator). He can adopt her settings as his own defaults with one click, or keep them as a one-time override.
- Heuristics can tune the UI per-trace without becoming permanent.

### Negative

- A toggled setting applies to the current page only. Users who want it as their default must use "Set as my default" — this is a new interaction pattern that may not be immediately obvious.
- A link copied after a toggle carries the toggled setting to the recipient, whether or not the sender meant to share it.
- No control removes a parameter. Toggling back restores the earlier value on the page, and the parameter stays in the URL with that value.
- A sender has to toggle a setting twice to put into the URL a value that is already in effect without a parameter.
- The links that the page builds to the same trace, such as the span deep link and the standalone link of the embedded view, do not carry the layout parameters. Passing the parameters to those links is left to a follow-up.
- In the embedded view the URL belongs to the iframe, and in the web component of RFC 0001 to an in-memory router, so a refresh of the host page does not keep a toggled setting.
- Components deep in the tree continue to read from Zustand directly; the hook keeps the store in sync so this remains correct, but the indirection is non-obvious.

### Future work

- Heuristic overrides are currently stubbed (`computeHeuristicOverrides` returns `null` for all fields). The infrastructure is in place; heuristics will be implemented when trace-type detection is added.
- Additional settings (e.g. zoom level, collapsed state) could be added to the priority stack using the same pattern.
