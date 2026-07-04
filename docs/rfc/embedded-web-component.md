# RFC: Jaeger UI as an Embedded Web Component

* **Status**: RFC
* **Last Updated**: 2026-04-20

---

## TL;DR

Extend Jaeger UI from a standalone single-page application into a reusable **Web Component** (Custom Element + Shadow DOM)
that can be embedded in any host page — without CSS
leakage, global namespace conflicts, or JavaScript singleton collisions. The SPA entry point would be kept as-is
for backward compatibility; the Web Component would be a parallel distribution artifact.

---

## Context & Problem

Jaeger UI is today deployed exclusively as an SPA served by the `jaeger` binary. Operators who already use
Grafana (or other dashboarding tools) must open Jaeger UI in a separate browser tab, breaking the
"single pane of glass" workflow. Platform teams who embed distributed traces in their own portals must
either iframe Jaeger UI or build their own trace viewer from scratch.

Concrete embedding scenarios that are currently unsatisfied:

1. **Grafana panel plugin** — show a trace flame graph or timeline inline on a Grafana dashboard,
   linked from a trace exemplar in a Tempo/Jaeger data source.
2. **Internal developer portals** (Backstage, etc.) — embed a trace view inside a service health page.
3. **Incident management tools** — surface a trace timeline in an alert detail panel.

---

## Approach Comparison: iframe vs. Web Component

Two realistic options exist for embedding Jaeger UI in a host page.

| Dimension | iframe | Web Component |
|-----------|--------|---------------|
| **Implementation cost** | Near zero — no code changes to Jaeger UI | Significant: Shadow DOM wiring, CSS injection, store factory, router swap |
| **CSS isolation** | Total — separate document | Total — Shadow DOM boundary |
| **Host theme adoption** | Not possible without postMessage protocol | Not automatic either; requires explicit `theme` attribute or CSS custom property tunneling |
| **Data loading** | Always fetches from backend via its own HTTP requests; cannot receive a pre-loaded trace object | Same in practice — trace data is large, fetching from backend is the normal path; the JS property setter for a pre-loaded trace is a nice-to-have, not a core advantage |
| **Navigation / URL state** | Full BrowserRouter; deep links work naturally | `MemoryRouter` — internal navigation works, but the host cannot deep-link to a specific span |
| **Bundle overhead** | Zero — host loads nothing extra | Duplicate React + antd unless externalized (300–500 KB gz) |
| **Popup / modal containment** | Not a concern — popups appear in the iframe's own document | Hard: antd portals default to `document.body`; requires per-component `getContainer` overrides |
| **postMessage API surface** | Required for any host↔iframe communication | Not needed — attributes, properties, and DOM events suffice |
| **Grafana panel height** | Grafana panels have a fixed pixel height; iframes with dynamic content height require `ResizeObserver` + `postMessage` to resize the panel, which is fragile | Works natively — the Custom Element is sized by Grafana's panel container like any other DOM node |
| **Sandboxing restrictions** | Some enterprise environments apply `sandbox` attributes or `X-Frame-Options: SAMEORIGIN` / `Content-Security-Policy: frame-ancestors` to their internal tools, blocking cross-origin iframes. Grafana itself does **not** restrict iframes in panel plugins, so this is not a concern for the Grafana use case specifically, but it does affect general-purpose embedding in portals like Backstage or incident tools hosted on a different origin | No sandboxing issues |
| **Accessibility** | Keyboard focus and screen reader flow crosses an iframe boundary poorly | Seamless — Web Component lives in host DOM |

**Summary**: iframe has near-zero implementation cost and is a legitimate "good enough now" solution.
Its genuine weaknesses are the panel-height resizing problem in Grafana and cross-origin sandboxing in
portal contexts (not a Grafana issue specifically). The Web Component's real advantages over iframe are
DOM integration (sizing, events, accessibility) and the absence of a separate browsing context. The
data-flow and CSS-theming arguments are largely theoretical.

iframe embedding can coexist as an officially supported fallback for environments where JavaScript
execution is restricted or the Web Component bundle cannot be loaded.

---

## Goals and Non-Goals (Web Component route)

### Goals

- Ship a self-contained `jaeger-ui-wc.js` bundle that registers `<jaeger-trace-view>` (and optionally
  `<jaeger-search>`) as Custom Elements.
- Full CSS isolation via Shadow DOM — host page styles cannot bleed in; Jaeger styles cannot bleed out.
- Host can pass a trace ID or a Jaeger API base URL via element attributes and properties.
- Support both light and dark themes, driven by either a host attribute or the host's `prefers-color-scheme`.
- Build a Grafana panel plugin as a proof-of-concept integration and validation vehicle; if successful, it could become an officially supported plugin maintained by the Jaeger project.
- Zero breaking changes to the existing SPA entry point.

### Non-Goals

- Full multi-page navigation inside the Web Component (search + trace list + trace view all in one
  component). The initial scope is the **trace view** (single trace timeline + span details).
- Server-side rendering.
- IE11 / legacy browser support (Custom Elements v1 requires a modern browser).

---

## Architecture

### 1. Custom Element class

```ts
// packages/jaeger-ui/src/web-component/JaegerTraceElement.ts
class JaegerTraceElement extends HTMLElement {
  static observedAttributes = ['trace-id', 'api-root', 'theme'];

  private _root: ShadowRoot;
  private _reactRoot: ReactRoot | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this._mount(); }
  disconnectedCallback() { this._unmount(); }
  attributeChangedCallback() { this._update(); }

  // Also expose JS property setters for structured data (e.g. a full trace object)
  set trace(value: ITrace) { ... }
}

customElements.define('jaeger-trace-view', JaegerTraceElement);
```

React is mounted into `this._root` (the shadow root) rather than `document.body`:

```ts
this._reactRoot = createRoot(this._root);
this._reactRoot.render(<TraceViewApp ... />);
```

### 2. CSS isolation strategy

All CSS must be injected into the shadow root, not `<head>`. Vite's library build can inline CSS via
`@vitejs/plugin-css-inject` (or the equivalent `cssInjectedByJsPlugin`). At runtime, the element
constructor appends a `<style>` node into the shadow root before mounting React. This covers:

- Jaeger's own component CSS (Less/CSS Modules → compiled to strings, injected into shadow)
- Ant Design component styles (antd v6 CSS-in-JS with `cssVar: {}` + a container selector — see §4)
- `u-basscss` utility classes

The host page's global styles, `antd/dist/reset.css`, and any other global resets are **not** injected
into the shadow root — the shadow boundary prevents inheritance, so the component carries exactly what
it needs.

### 3. Ant Design CSS-in-JS inside Shadow DOM

antd v6 with `cssVar` mode inserts `<style>` elements into `document.head` by default.
`ConfigProvider` accepts a `getTargetContainer` and a `getPopupContainer` prop; crucially,
antd's `StyleProvider` from `@ant-design/cssinjs` accepts an `attachTo` prop that redirects
all dynamic style insertion into a target container — the shadow root:

```tsx
import { StyleProvider } from '@ant-design/cssinjs';

<StyleProvider attachTo={shadowRoot}>
  <ConfigProvider theme={...} getPopupContainer={() => shadowRoot as any}>
    <ThemeProvider>
      <TraceViewApp />
    </ThemeProvider>
  </ConfigProvider>
</StyleProvider>
```

This keeps all antd styles inside the shadow boundary.

### 4. Redux and Zustand store isolation

The existing `configure-store.ts` exports a singleton `store`. In the Web Component context each
element instance must own its own store to support multiple independent `<jaeger-trace-view>` instances
on the same page.

Required change: convert `store` from a module-level singleton to a factory:

```ts
// configure-store.ts
export function createStore(): Store { ... }
// For SPA backward compat — keep the singleton export:
export const store = createStore();
```

Zustand stores that hold per-view state (DDG modifiers — see ADR-0008) also need instance-scoped
creation. The `zustand-class-bridge.tsx` pattern already supports this; Web Component mounts simply
pass a new store instance via React context.

### 5. Router isolation

The SPA uses `<BrowserRouter>` which reads/writes `window.location`. A Web Component embedded in a
Grafana dashboard must not hijack the host page's URL. Replace `BrowserRouter` with
`MemoryRouter` for the Web Component entry point:

```tsx
// web-component/TraceViewApp.tsx
import { MemoryRouter } from 'react-router-dom';

export function TraceViewApp({ traceId, apiRoot, theme }: Props) {
  return (
    <MemoryRouter initialEntries={[`/trace/${traceId}`]}>
      <JaegerUIApp singleView="trace" apiRoot={apiRoot} theme={theme} />
    </MemoryRouter>
  );
}
```

The `singleView` prop gates which routes are rendered (trace view only, no search/dependencies pages),
keeping the bundle lean via tree-shaking.

### 6. Config injection

The SPA reads config from `window.getJaegerUiConfig()`, injected into `index.html` by the Go
query-service. Inside a Web Component, `window.getJaegerUiConfig` may not exist (host page is not
served by jaeger-query). Config is instead passed via:

- Element attribute `api-root` → overrides `JaegerAPI.apiRoot`
- Element attribute `theme` → `"light"` | `"dark"` | `"auto"` (default: `"auto"`, follows host's
  `prefers-color-scheme`)
- JS property `config` → accepts a partial `Config` object for advanced cases

### 7. `site-prefix` and `__webpack_public_path__`

`site-prefix.ts` reads `document.querySelector('base')` and sets `window.__webpack_public_path__`
(a Webpack artifact — now unused since Vite migration). In the Web Component context there may be no
`<base>` element relevant to Jaeger's assets (static assets are embedded in the bundle or fetched
relative to the JS file's URL). The `site-prefix` module needs a Shadow DOM–aware path:

- For the Web Component build, the Vite config sets `base: undefined` (Vite uses the script's
  location for relative asset URLs via `import.meta.url`).
- `site-prefix.ts` gains a `setSitePrefix(url: string)` escape hatch called by the Custom Element
  constructor before React mounts.
- The `__webpack_public_path__` assignment becomes a no-op (the symbol is unused since ADR-0007).

### 8. `document.body` side effects

Several existing patterns write directly to `document.body` or `document.documentElement`:

| Location | Side effect | Fix |
|----------|------------|-----|
| `ThemeProvider.tsx:121` | `document.body.dataset.theme = mode` | Use shadow host element's dataset instead: `this.dataset.theme = mode` |
| `ThemeStorage.ts` | Reads/writes `localStorage` for theme preference | Keep as-is; `localStorage` is not scoped to shadow DOM, which is fine |
| `antd ConfigProvider` | Inserts style tags into `<head>` | Redirected via `StyleProvider attachTo` (§3) |
| Popups / Modals (antd) | `getContainer()` defaults to `document.body` | Override `getPopupContainer` on `ConfigProvider` to return the shadow root |

---

## Required Code Changes

### `packages/jaeger-ui`

| File | Change |
|------|--------|
| `src/utils/configure-store.ts` | Export `createStore()` factory; keep `store` singleton for SPA |
| `src/site-prefix.ts` | Add `setSitePrefix(url)` escape hatch; remove `__webpack_public_path__` write |
| `src/components/App/ThemeProvider.tsx` | Accept optional `containerRef` prop; write `data-theme` to container instead of `document.body` |
| `src/components/App/index.tsx` | Accept `singleView` prop to gate routes; accept `apiRoot` / `config` props |
| `src/utils/config/get-config.ts` | Accept optional config override; fall back to `window.getJaegerUiConfig()` only if no override provided |
| `src/web-component/JaegerTraceElement.ts` | **New** — Custom Element class |
| `src/web-component/TraceViewApp.tsx` | **New** — React tree for Web Component (MemoryRouter, isolated store) |
| `src/web-component/index.ts` | **New** — entry point; registers custom elements |
| `vite.config.mts` | Add a second `build` configuration (library mode) for the Web Component bundle |

### Build and bundling

A second Vite build configuration produces the Web Component bundle:

```ts
// vite.config.mts — library mode build (activated by WC_BUILD=1)
build: {
  lib: {
    entry: 'src/web-component/index.ts',
    name: 'JaegerUI',
    fileName: 'jaeger-ui-wc',
    formats: ['es', 'iife'],
  },
  rollupOptions: {
    // Do NOT externalize React — the bundle must be self-contained
    external: [],
  },
  cssCodeSplit: false,  // inline all CSS into JS
}
```

The resulting `jaeger-ui-wc.es.js` (~500–700 KB gzipped estimate) is the distribution artifact.
A separate `jaeger-ui-wc.iife.js` supports non-ESM host environments.

CSS inlining uses `vite-plugin-css-injected-by-js` (or equivalent): each CSS chunk is converted to a
JS string and injected into the shadow root via the element constructor, not `document.head`.

### Distribution

New `packages/jaeger-ui/package.json` exports field (alongside the existing SPA `build/` output):

```json
"exports": {
  ".": "./src/index.tsx",
  "./web-component": "./dist/jaeger-ui-wc.es.js"
}
```

The Web Component bundle is also published as a standalone npm package
`@jaegertracing/jaeger-ui-wc` for consumers who want a pinned version without cloning the monorepo.

---

## Validation Strategy: Grafana Panel Plugin (Proof of Concept)

A Grafana panel plugin is a useful proof-of-concept vehicle because it exercises the hard constraints
in a realistic host environment: Shadow DOM isolation (Grafana panels live in their own DOM subtrees),
strict CSP, and cross-origin API access. Building it forces the issues above to be solved concretely
rather than theoretically. If the PoC succeeds, the plugin could be developed further into an
officially supported Jaeger project plugin.

### New package: `packages/grafana-jaeger-panel/`

```
grafana-jaeger-panel/
├── src/
│   ├── module.ts          # Grafana plugin entry (registers PanelPlugin)
│   ├── JaegerPanel.tsx    # React component: renders <jaeger-trace-view> or JaegerUI directly
│   └── types.ts           # Panel options schema
├── package.json
├── plugin.json            # Grafana plugin manifest
└── README.md
```

Two implementation strategies for the panel:

**Option A — Custom Element** (`<jaeger-trace-view>`): Import `@jaegertracing/jaeger-ui-wc` and
render the custom element. Tests Shadow DOM inside Grafana's own React tree.

**Option B — React component direct import**: Import the `TraceViewApp` React component and render
it inside a `<div>` with an attached shadow root managed manually. Avoids Custom Element overhead but
exercises the same CSS isolation path.

Option A is preferred because it validates the full Web Component API surface. Option B is a fallback
if Grafana's plugin sandbox prevents Custom Element registration.

### Panel features (Phase 1)

- Panel option `traceId: string` — renders the trace by ID.
- Panel option `apiRoot: string` — Jaeger query service base URL (default: relative `/api`).
- Panel option `theme: 'auto' | 'light' | 'dark'` — follows Grafana's own theme toggle when `'auto'`.
- Grafana data link integration: receive a trace ID from a Tempo/Jaeger data source via panel data
  (`PanelData.series` exemplar → `traceId` field), display the corresponding trace without navigation.

### Testing plan

| Level | What | How |
|-------|------|-----|
| Unit | Custom Element lifecycle (mount/unmount/attribute change) | Vitest + `@web/test-runner` JSDOM or happy-dom |
| Unit | CSS isolation — verify no styles leak to `document.head` | Assert `document.head` style count before/after element insertion |
| Unit | Multiple element instances — independent Redux stores | Mount two `<jaeger-trace-view>` with different trace IDs; assert no cross-contamination |
| Integration | Grafana plugin renders without errors | `@grafana/plugin-e2e` + Playwright against a local Grafana instance wired to a real Jaeger backend |
| Visual regression | Trace view renders correctly inside shadow DOM | Playwright screenshot diff vs known-good SPA render |
| Bundle | Self-contained — no `require()` calls in IIFE output | `node -e "require('./dist/jaeger-ui-wc.iife.js')"` must not throw |
| Bundle | Size regression gate | Extend existing `check_bundle.yml` CI workflow to also check `jaeger-ui-wc.es.js` size |

---

## Unknowns and Risks

### Unknown 1: antd `StyleProvider` + Shadow DOM in production

`@ant-design/cssinjs`'s `StyleProvider attachTo` is documented but has limited real-world usage with
Shadow DOM. Needs a spike: render antd `Table`, `Modal`, `Popover`, and `Drawer` inside a shadow root
and verify styles render correctly and popups appear inside the shadow boundary.

**Risk**: antd popups (`Modal`, `Tooltip`, `Dropdown`) are portalled to `document.body` by default.
`getPopupContainer` on `ConfigProvider` overrides the container, but some antd internals bypass it.
Full popup isolation may require per-component `getContainer` overrides.

### Unknown 2: `MemoryRouter` and deep linking

The trace timeline URL state (minimap position, selected span, `uiFind`) uses `window.location.search`
via `react-router`. With `MemoryRouter` these continue to work within the component's internal history,
but there is no way for the host to deep-link into a specific span. A `state` attribute/property could
serialize the relevant URL params, but this needs design.

### Unknown 3: Bundle size

The IIFE bundle includes React, ReactDOM, Redux, Zustand, antd, and all Jaeger components — estimated
1–2 MB minified, 300–500 KB gzipped. Hosts that already use React cannot share the React instance
across the shadow boundary (React must be the same instance for context to work). This is a hard
trade-off of the self-contained bundle approach.

**Mitigation**: Publish a separate `peerDependencies` (externalized) build for hosts that can guarantee
the same React version. The Grafana plugin uses this variant since Grafana ships its own React.

### Unknown 4: `localStorage` theme persistence

`ThemeStorage.ts` reads/writes `localStorage.jaegerTheme`. If multiple `<jaeger-trace-view>` elements
exist on one page, they share theme state via `localStorage`. This is likely desirable, but needs
explicit verification (and documentation).

### Unknown 5: Content Security Policy

Hosts with strict CSP may block inline `<style>` injection (the mechanism CSS-injected-by-JS uses).
Fallback: ship a separate `jaeger-ui-wc.css` that the host must load, and skip the JS injection.
This breaks shadow DOM isolation but is necessary for strict-CSP environments.

---

## Implementation Plan

| Phase | Deliverable | Scope |
|-------|-------------|-------|
| **P1 — Spike** | Prove Shadow DOM + antd rendering works; resolve Unknown 1 | Throwaway `spike/wc` branch; findings feed back into this RFC |
| **P2 — Refactor** | Store factory, ThemeProvider `containerRef`, config override, `site-prefix` escape hatch | Small targeted PRs against `main`; SPA unaffected |
| **P3 — Web Component bundle** | `src/web-component/` entry + Vite library build + CSS injection | Adds `WC_BUILD=1 npm run build:wc` script |
| **P4 — Grafana plugin PoC** | `packages/grafana-jaeger-panel/` with Phase 1 features; Playwright e2e | Validates full stack; submission to Grafana plugin catalog deferred pending PoC evaluation |
| **P5 — npm publish** | `@jaegertracing/jaeger-ui-wc` on npm; CDN link in README | Enables zero-config embedding via `<script>` tag |

---

## Expected Trade-offs

### Benefits

- Jaeger trace views can be embedded in Grafana, Backstage, or any other host without iframes.
- Shadow DOM guarantees CSS isolation — no style conflicts regardless of host CSS framework.
- Reuses 100% of existing Jaeger UI components; no parallel implementation to maintain.
- Forces cleanup of SPA-only assumptions (singleton store, `document.body` side effects) which
  improves testability even for the existing SPA.

### Costs and risks

- **Bundle duplication**: self-contained builds duplicate React (~45 KB gz) and antd (~100 KB gz).
  The externalized variant mitigates this but requires host version alignment.
- **antd popup isolation is imperfect**: tooltips and modals that must escape the shadow boundary
  need per-component `getContainer` overrides; a missed override shows a floating element with
  no styles.
- **MemoryRouter breaks URL-based state sharing**: users cannot copy a link to a specific span
  view from an embedded component.
- **Increased build complexity**: two Vite configs, two output artifacts, two CI size gates.
- **Significant upfront implementation effort**: Unknown 1 (antd + Shadow DOM) is the highest-risk
  item and should be spiked before committing to this approach.

---

## References

- [Web Components — Custom Elements v1 spec](https://html.spec.whatwg.org/multipage/custom-elements.html)
- [Shadow DOM — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [`@ant-design/cssinjs` StyleProvider](https://github.com/ant-design/cssinjs#styleprovider)
- [Grafana panel plugin development guide](https://grafana.com/developers/plugin-tools/create-a-plugin/develop-a-plugin/build-a-panel-plugin)
- [`@grafana/plugin-e2e` testing](https://grafana.com/developers/plugin-tools/e2e-test-a-plugin/introduction)
- [vite-plugin-css-injected-by-js](https://github.com/marco-prontera/vite-plugin-css-injected-by-js)
- ADR-0001: Design Token-Based Theming (CSS custom properties — compatible with Shadow DOM)
- ADR-0004 / ADR-0008: State Management Strategy (Zustand instance-scoped stores)
- ADR-0007: Vite+ Migration (Vite library mode is the build foundation for this proposal)
