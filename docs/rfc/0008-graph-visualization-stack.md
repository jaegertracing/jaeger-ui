# RFC 0008: Graph Visualization Stack

* **Status**: Draft
* **Created**: 2026-05-26
* **Last Updated**: 2026-08-09

---

## TL;DR

Jaeger UI has two graph views — the trace DAG (`TraceGraph`) and the service dependency graph (`DAG`) — both built on the internal **Plexus** library which uses **Graphviz (via `@viz-js/viz`)** for layout. Neither view allows users to reposition nodes after rendering. This RFC surveys whether migrating to **elkjs** for layout and/or **`@xyflow/react`** for rendering would materially improve either view, and separately examines **Apache ECharts** as an alternative rendering backend motivated primarily by scale. Library capability data is drawn from each project's public documentation and source. The recommendation is to add the missing layout controls inside the current stack, where they are cheap, and separately to migrate the service dependency graph to `@xyflow/react` while keeping Graphviz for layout — that view has the lowest port cost and the most interactivity to gain of the four views Plexus serves. ECharts is surveyed and rejected: its only advantage was raw scale, and the product answers scale with focal neighbourhoods rather than by drawing everything. The Validation Plan states the spikes and their acceptance tests.

---

## Context & Problem

Jaeger UI's graph stack was designed around two non-negotiable constraints: (1) layout quality matters more than interactivity, and (2) the graphs should render correctly with zero user configuration. Plexus + Graphviz have served those constraints well. But several recurring issues expose limits of the current approach:

- **Layout inflexibility**: When Graphviz produces a cluttered or counter-intuitive layout — edge crossings, nodes packed too tightly, an unfortunate root node selection — there is no escape hatch. The user cannot drag a node, change the layout direction, or re-run with different spacing parameters.
- **No layout-direction toggle**: `TraceGraph` passes no `rankdir`, so it gets the `toDot` default of left-right (`LR`); `DAG` sets top-down (`TB`). Neither exposes a toggle.
- **Maintenance burden**: `packages/plexus/src` is about 3,000 lines the Jaeger team owns entirely — roughly 1,900 of custom React and SVG rendering (`Digraph`, `zoom`) on top of a ~1,000-line `LayoutManager`. It still receives regular work: through the first half of 2026 the team migrated `Digraph`, `Node`, `SvgEdges`, and `MeasurableNode` to functional components, moved its tests to Vitest, dropped `worker-loader`, and fixed dark-mode edge labels. That is the maintenance cost, and adopting `@xyflow/react` would move most of it to an outside team.
- **Ecosystem age**: `@viz-js/viz` (the Graphviz WASM wrapper) is the third incarnation of viz.js and is healthy, but the underlying Graphviz binary has not had significant algorithmic development in many years. elkjs is more actively developed and has a broader algorithm portfolio.

The Recommendation section below resolves the comparison; the parts before it lay out the evidence it rests on.

---

## Scope

This document covers three questions that can be answered independently:

1. **Layout engine**: Should `@viz-js/viz` (Graphviz) be replaced by or supplemented with **elkjs**?
2. **Rendering layer**: Should **Plexus** be replaced by **`@xyflow/react`**?
3. **Scale-first alternative**: Does **Apache ECharts** offer a better fit for high-node-count views via its canvas rendering backend?

---

## Part 1: Node Interactivity — Can Users Reposition Nodes?

### Jaeger UI (current)

**No.** Node positions are fully determined by Graphviz and treated as immutable by Plexus. Nothing in the types enforces that — `TLayoutVertex.left` and `TLayoutVertex.top` are plain mutable `number`s — but no code path writes to them after layout. There are no drag event handlers anywhere in Plexus or in the two graph consumers (`TraceGraph.tsx`, `DAG.tsx`). Grep for `onMouseDown`, `onDrag`, `draggable`, `pointermove`, `setPointerCapture` across all of `packages/plexus/` returns zero results.

What Plexus *does* support at the viewport level is **pan and zoom** via `d3-zoom`: the entire graph can be panned by clicking and dragging empty canvas space, and zoomed via scroll wheel or pinch. This is distinct from per-node repositioning; the graph's internal layout is never modified.

### `@xyflow/react` (capability)

**Node dragging is supported natively and opt-in.** The `nodesDraggable` prop defaults to `true`; setting it to `false` disables dragging entirely. This means adopting `@xyflow/react` does not force node dragging on Jaeger — it is a deliberate choice either way, controlled by a single prop.

### Implications

Neither codebase currently supports node dragging. The question of whether to add it is orthogonal to the library choice, but the options differ significantly in implementation cost — and the reason is **edge geometry**, not node positions.

Node positions are plain `{x, y}` numbers at the application layer; moving a node is trivial. The hard part is that edge geometry is pre-baked. Both graph views pass `useDotEdges: true`, which puts the Plexus `Coordinator` in its `DotOnly` phase: one `dot` pass produces node positions and edge points together, and with `splines: 'polyline'` each edge is stored as a fixed series of `[x, y]` points computed for those exact node positions. If a node moves, those stored points are stale — edges would point at empty space. Correcting them requires re-running the layout in the Web Worker with the moved node pinned, which has non-trivial latency and would produce jank on every drag event.

`@xyflow/react` avoids this entirely because it does not pre-compute edge geometry. Edge paths are functions of current node handle positions, recalculated on every render via `getSmoothStepPath` / `getBezierPath`. Dragging a node updates its position in React state; all connected edges recompute their paths in the same render cycle — no worker round-trip, no stale data.

This means adding node drag to the current Plexus stack is not just a coordinate-system rewrite: it requires either (a) accepting a worker round-trip per drag frame (too slow for smooth interaction), or (b) abandoning the pre-computed Graphviz edge points in favour of client-side edge routing during drag, then re-running `dot` on drag end to restore layout quality. Option (b) is workable but requires managing two edge-rendering modes. With `@xyflow/react`, drag is already architecturally consistent with normal rendering.

---

## Part 2: Layout Engine — `@viz-js/viz` (Graphviz) vs elkjs

### Summary Table

| Dimension | `@viz-js/viz` / Graphviz | elkjs |
|---|---|---|
| **Underlying engine** | Graphviz C binary compiled to WASM | Eclipse Layout Kernel (Java) compiled to JS |
| **Input format** | DOT language string | JSON node/edge model |
| **Primary algorithm** | `dot` (Sugiyama hierarchical) | `layered` (Sugiyama), plus force, radial, box, stress, and more |
| **DAG layout quality** | Excellent for strict hierarchies; industry reference implementation | Comparable quality; adds configurable spacing parameters and compound graph support |
| **Cycle handling** | Handles cycles (DOT supports them); renders with cycle-breaking heuristics | Handles cycles via `elk.layered.cycleBreaking.strategy` option |
| **Undirected / force-directed** | `neato`, `sfdp`, `fdp` engines available | `stress`, `force`, `mrtree` algorithms available |
| **Layout options exposed** | Graphviz has hundreds of attributes; Plexus's `TLayoutOptions` narrows them to `rankdir`, `ranksep`, `nodesep`, `sep`, `shape`, `splines`, `engine`, `useDotEdges`, `dpi`, `totalMemory`, and `sfdpOptions` | Algorithm, direction, layer spacing, node spacing, padding — all numeric JSON |
| **Two-phase layout** | Offered by Plexus (`dot` for positions, then `neato` for edge routing), but both Jaeger views opt out with `useDotEdges: true` and take edges from `dot` | Single-phase; edge routing integrated |
| **Worker model** | Plexus runs Graphviz in a reusable Web Worker pool — layout never blocks the main thread | Runs on the main thread by default, but Plexus's pool is engine-agnostic and can host ELK instead (see below), so `elkjs/lib/elk-worker.js` is only needed outside Plexus |
| **Scale (layout)** | Designed for large graphs. The isolation that keeps 1,000-node layouts off the main thread is Plexus's worker pool, not something Graphviz provides, and the figure is an estimate rather than a measurement | Blocks the main thread if run naively, but inherits the same Plexus pool through a `getLayout` adapter |
| **Maturity** | Graphviz ~30 years; `@viz-js/viz` wrapper ~10 years, stable | ELK ~10 years (Eclipse project); `elkjs` JS port ~8 years |
| **Active development** | Graphviz core stable/slow; `@viz-js/viz` has regular releases | ELK actively developed; elkjs follows upstream regularly |
| **Bundle size** | `@viz-js/viz` 3.29.0 ships 1.19 MB, 468 KB gzipped, loaded in the worker rather than on the main thread | elkjs 0.12.0 `elk.bundled.js` is 1.61 MB, 467 KB gzipped — the same download, to the kilobyte |
| **React integration** | No official React binding; Plexus wraps it | No official React binding; community hooks exist |

### Graphviz Strengths

- **Proven DAG layout**: The `dot` engine's Sugiyama implementation is the reference standard. For strict hierarchies (like trace trees), it rarely produces bad layouts.
- **DOT language expressiveness**: Edge weights, cluster subgraphs, and per-node attributes are all expressible in DOT. Jaeger owns `toDot.ts`, so all of it is available; it is simply not emitted today — `makeNode` writes only `height`, `width`, and an optional `pos`, the graph attributes are a fixed list, and edges carry nothing but a bidirectional flag. Input-only attributes are cheap to add: edge `weight` to bias rank assignment, or per-node `group`, is a line in `makeEdge` or `makeNode`. Anything whose result has to come back out is the expensive case, which is why clusters cost more than weights.
- **Two-phase layout quality**: Plexus can run `dot` for rank assignment and then `neato` for edge spline routing, which produces high-quality results for dense graphs. Neither Jaeger view enables it — both pass `useDotEdges: true` — so this is headroom the current stack has and is not using.

### Graphviz Weaknesses

- **Limited algorithm variety from Jaeger's code path**: `TraceGraph` runs `dot` and gives the user no say in it. The dependency graph is the exception: `DAGOptions` exposes a Hierarchical (`dot`) / Force Directed (`sfdp`) switch, and `DependencyGraph` also flips to `sfdp` on its own once the service count passes `dagMaxNumServices`. `circo` and `twopi` ship in the WASM build and are wired to nothing.
- **No layout-direction toggle**: `rankdir` is fixed per view — set explicitly by `DAG`, left at the `toDot` default by `TraceGraph`. Nothing structural stands in the way of a user-facing toggle, since `rankdir` is already a `TLayoutOptions` field; it is simply not wired to any control.
- **A large payload nobody has objected to**: `@viz-js/viz` is 1.19 MB, 468 KB gzipped, loaded in the worker rather than on the main thread. It is the biggest single dependency in either graph view, and it has not been raised as a problem, so it is listed here for completeness rather than as a live weakness.
- **A coordinate conversion Jaeger owns**: Graphviz works in DOT points, and `conv-coord.ts` converts to pixels with `DEFAULT_DPI = 72` unless a view overrides `dpi` — which `DAG` does, scaling it up to 2000 for large `sfdp` graphs. The conversion, and the bugs that follow when its DPI or scale assumptions disagree with a view's, belong to Plexus rather than to Graphviz.

### elkjs Strengths

- **Richer algorithm menu**: `layered`, `stress`, `force`, `mrtree`, `radial`, `box`, `rectpacking`, `topdown`, and `fixed` all appear as algorithm ids in the shipped bundle, and each is selected by changing a single `'elk.algorithm'` option string. Adding a user-facing layout-algorithm picker requires no architectural changes.
- **Layout direction as a first-class option**: `'elk.direction': 'RIGHT' | 'DOWN' | 'LEFT' | 'UP'` is a top-level JSON option. Changing direction just means passing a different string and re-running the layout — no structural code changes required, making a user-facing toggle trivial to wire up.
- **JSON model aligns naturally with React state**: Nodes and edges are plain JS objects; positions come back as `child.x`, `child.y` that map directly to React state. No DOT serialization/parsing step.
- **No WASM**: `elk.bundled.js` is 1.61 MB of plain JS. It is not the bundle-size win it looks like — gzipped it is 467 KB against Graphviz's 468 KB, so the download is a wash. It runs synchronously but is async-wrapped, and `elkjs/lib/elk-worker.min.js` (1.6 MB) is an official Web Worker variant, though Plexus's own worker is the better host here.
- **Compound graph support**: ELK models nesting directly — a node carries `children`, and `elk.hierarchyHandling` lays out across levels, sizing each container from its contents and routing edges across container boundaries. This is relevant if Jaeger ever wants to group spans by service or process inside the trace DAG, or services by namespace in the dependency graph. Graphviz can do this too, with `subgraph cluster_*`, so the gap is in Plexus rather than in Graphviz: `toDot` emits no clusters and the `plain` output format Plexus parses carries no container geometry.

### elkjs Weaknesses

- **Edge routing is simpler**: ELK's edge routing is generally good for layered graphs but does not match the spline quality Graphviz reaches with its `neato` routing pass on dense graphs — a pass Jaeger does not currently enable.
- **No DOT import**: Existing Plexus integration code builds DOT strings; migrating means rewriting `convInputs.ts` / `toDot.ts` to produce ELK JSON instead.
- **Cycle handling less battle-tested in practice**: Graphviz's cycle-breaking is extremely mature. ELK's is correct but less studied in production.
- **Worker is not the default**: Unlike Plexus (which always runs Graphviz in a worker), the elkjs default is main-thread execution. That costs less to fix than it appears: `layout.worker.ts` never names Graphviz — it forwards the message payload to `getLayout` and posts the result back — and `Coordinator` owns the pool, cancellation, and message protocol generically. Only `getLayout.ts` is Graphviz-specific (`toDot` → `viz.renderString` → `convPlain`). So ELK can run in the existing pool by replacing that one module, which is the adapter work an ELK migration already pays for, and `elk-worker.js` is not needed.

### Assessment for Jaeger's Two Graph Views

**TraceGraph** (trace DAG, nearly always a strict tree of spans, potentially thousands of spans):
- Both engines produce equivalent layout quality for trees.
- Scale is a first-class concern: traces with thousands of spans are not unusual. Graphviz already runs in a worker in this path, and ELK would inherit that same worker if its adapter replaced `getLayout`.
- ELK's main functional advantage here is the ability to add a **layout-direction toggle** without architectural changes.
- No compelling layout-quality reason to switch; the case rests on DX and future flexibility, against the real cost of adding worker management.

**Service Dependency Graph** (general DAG, may have cycles, potentially hundreds of services):
- Cycles: both engines handle them; Graphviz's `dot` has more community documentation on cycle-breaking behavior.
- Algorithm flexibility: exposing force-directed layout for heavily cyclic or undirected dependency graphs is significantly easier with ELK.
- Scale: a large deployment's service dependency graph can have hundreds of nodes. Graphviz handles this in its existing worker pool, which an ELK adapter would reuse.

**Verdict on layout engine**: The case for elkjs is strongest as an *addition* rather than a wholesale Graphviz replacement. It is weaker than it first appears, though, because neither of the two headline gains needs ELK: `rankdir` is already a `LayoutManager` option, and the dependency graph already lets the user choose between `dot` and `sfdp`. What ELK adds that Graphviz cannot is compound-graph support and a broader algorithm menu behind one option string. If ELK is adopted, `DAG.tsx` is the place to start, and the adapter belongs inside the existing Plexus worker rather than alongside a second worker of its own.

---

## Part 3: Rendering Layer — Plexus vs `@xyflow/react`

### Plexus Architecture (current)

Plexus implements a **three-phase render pipeline** entirely in about 1,900 lines of custom React + SVG code (`Digraph` and `zoom`; a further ~1,000 lines sit in `LayoutManager`):

1. **Measure phase** (`CalcSizes`): Renders all nodes invisibly at `(0,0)` to measure their DOM dimensions via refs.
2. **Layout phase** (`CalcPositions`): Sends measured sizes + graph topology to Graphviz (in a Web Worker); receives back node positions and a point list per edge — polyline vertices, since both views ask for `splines: 'polyline'`.
3. **Render phase** (`Done`): Applies computed positions via CSS `transform: translate(x,y)` on HTML nodes and `transform="translate(x,y)"` on SVG `<g>` elements. `SvgEdge` emits `M … C …`, so the points are drawn through a cubic command whether or not Graphviz produced curves for them.

The **layer system** is the primary customization API: callers compose arrays of layer descriptors, each specifying whether it is HTML or SVG, whether it is the measurable layer, and a `renderNode`/`setOnEdge` factory. Multiple layers share a zoom transform applied at container level by `d3-zoom`.

**What Plexus supports:**
- Pan and zoom (d3-zoom, 0.03×–10×)
- Click / hover event handlers on nodes and edges (via `setOnNode`, `setOnEdge` props factories)
- CSS class / style injection per node/edge based on graph state
- Minimap
- Off-main-thread layout (Graphviz runs in a reusable Web Worker pool; the UI stays responsive during layout computation for large graphs)
- Multiple rendering layers (SVG + HTML mixed in the same graph)
- Custom `renderNode` components (full React, any HTML)

**What Plexus does not support:**
- Per-node dragging or repositioning
- Dynamic graph mutations without full re-layout
- A built-in toolbar or contextual menu primitive (callers implement their own via `setOnNode` click handlers + a custom DOM overlay; `DAG.tsx` does exactly this with a `position: fixed` context menu)
- Layout direction toggle without code changes
- Animated transitions between layouts
- Accessibility annotations (ARIA roles on graph elements)
- Edge labels as first-class elements (only supported via custom `renderNode` workarounds)

**Maintenance status**: Plexus has had no new features in years, but it is not dormant — most of its 2026 commits are React modernization and tooling migrations rather than fixes. That is the shape of the burden: the Jaeger team owns every bug, every React compatibility update, and every feature it might want, and pays for keeping a private library current with the ecosystem even when nothing about the graphs changes.

### `@xyflow/react` Architecture

`@xyflow/react` (formerly React Flow; ~38,000 GitHub stars as of August 2026, MIT, releasing regularly — v12.11.2 in July 2026) is a React-native graph canvas with a hooks-based API. It manages an internal store for node/edge state, positions, selection, and viewport transforms. The caller provides `nodes[]` and `edges[]` arrays with positions pre-computed; `@xyflow/react` handles all rendering, interaction, and viewport management.

**What `@xyflow/react` provides out of the box:**
- Pan and zoom (built-in, configurable min/max zoom)
- **Node dragging** (opt-in via `nodesDraggable={true}`; can be disabled per-node or globally)
- Custom node types (arbitrary React components with `Handle` connection ports)
- Custom edge types (arbitrary SVG/React with `getSmoothStepPath`, `getBezierPath`, `getStraightPath`, or fully custom)
- `NodeToolbar`: floating contextual toolbar anchored to a node, shown on selection
- `Controls`: built-in pan/zoom/fit-view button bar
- `Background`: configurable grid or dots background
- `MiniMap`: built-in minimap with custom node color callbacks
- `useReactFlow()` hook: programmatic `fitView()`, `getNodes()`, `setNodes()`, `screenToFlowPosition()`, etc.
- Selection: multi-select via shift-click or drag-select box
- Keyboard navigation and ARIA support: Tab through focusable nodes and edges, Enter or Space to select, arrow keys to move a selected node, auto-pan to a focused node, plus ARIA roles and live regions. The library's own framing is that these features "can help you meet key WCAG 2.1 AA criteria when properly implemented" — the conformance obligation stays with the integrator.
- Dark/light color mode prop (`colorMode`)
- Animated edges (CSS `stroke-dasharray` animation built-in)
- `fitView()` with padding, duration, and `prefers-reduced-motion` respect

**What `@xyflow/react` does not provide (caller's responsibility):**
- Layout algorithm: the caller must compute `node.position` before passing nodes in. `@xyflow/react` is layout-agnostic; it pairs with any layout engine (elkjs, Dagre, D3-force, manual, etc.).
- The *ordering* Plexus uses — measure first, then lay out, then render once. `@xyflow/react` measures nodes too, but only after mounting them at the positions the caller supplied, so a layout that depends on measured sizes takes two passes.

**Typical integration pattern with elkjs:**
- If node dimensions are fixed, no measurement is needed — ELK receives hardcoded sizes directly.
- If they are not, mount the nodes, wait for `useNodesInitialized()`, and read each `node.measured` — `@xyflow/react` populates it with the observed width and height.
- ELK runs once per data change (async), then node positions are written into React state.
- `@xyflow/react` receives pre-positioned nodes and renders them; it owns only viewport management and interaction.

### Side-by-Side Comparison

| Dimension | Plexus + Graphviz | `@xyflow/react` + elkjs |
|---|---|---|
| **Codebase owned by Jaeger** | ~3,000 lines (Plexus) + Graphviz WASM | 0 lines of rendering code, but keeping Graphviz means keeping `LayoutManager` — about 1,180 of the 3,000 lines stay |
| **Maintenance burden** | Full ownership | Library updates; breaking-change migration |
| **React compatibility** | Must be manually maintained | Maintained by xyflow team; React 18/19 tested |
| **Node dragging** | Not supported | Opt-in (`nodesDraggable={true}`) |
| **Custom node renderers** | `renderNode` prop (any React component) | Custom `nodeTypes` map (any React component) |
| **Custom edge renderers** | An SVG path built from the point list Graphviz returns | Custom `edgeTypes` map; path helpers available |
| **Edge routing** | `dot` polylines today, because both views set `splines: 'polyline'`; Graphviz's spline routing is available and unused | `getSmoothStepPath` (manhattan), `getBezierPath`, or fully custom |
| **Contextual toolbars** | No built-in primitive; `DAG.tsx` implements one via `setOnNode` click + `position: fixed` overlay | `NodeToolbar` API: built-in, anchored to node, follows zoom/pan automatically |
| **Layout direction toggle** | `rankdir` is already a `LayoutManager` option; `DAG` rebuilds its manager on every layout change, so a toggle is local to the view | Layout engine option; trivial to expose in UI |
| **Algorithm selection** | Already shipped for the dependency graph: `DAGOptions` switches between `dot` and `sfdp` | Layout engine option; trivial to expose in UI |
| **Minimap** | Built-in (`minimap={true}`) | Built-in (`<MiniMap />`) |
| **Fit-to-view** | `resetZoom()` on `ZoomManager` | `fitView()` on `useReactFlow()` hook; animated |
| **Keyboard / ARIA** | Not implemented | Keyboard focus and movement, ARIA roles and live regions; helps toward WCAG 2.1 AA rather than conferring it |
| **Animated layout transitions** | Not supported | CSS transitions on position change; `fitView` animation |
| **Selection** | Click handlers only; no multi-select | Built-in multi-select (shift-click, drag-box) |
| **Bundle size** | d3-zoom ~15 KB + `@viz-js/viz` 468 KB gzipped (worker) | `@xyflow/react` 12.11.2 is 51 KB gzipped, but its mandatory `@xyflow/system` adds 35 KB, so 86 KB; plus a layout engine |
| **Scale — layout off main thread** | Built-in: Graphviz always runs in a Web Worker pool | Same worker pool is reusable — it is engine-agnostic — whether layout stays on Graphviz or moves to ELK |
| **Scale — rendering performance** | No virtualization; renders all nodes/edges in DOM | No virtualization by default; `<ReactFlow />` re-renders on every position change — can degrade with thousands of nodes without memoization |
| **Measure-then-layout** | Handled internally by Plexus, before the first positioned render | `node.measured` plus `useNodesInitialized()` supply the sizes, but only after a first unpositioned mount |
| **GitHub stars / community** | Internal library | ~38,000 stars; large ecosystem, many examples |
| **License** | Apache 2.0 (Jaeger) | MIT; note that elkjs, if paired with it, is EPL-2.0 OR GPL-3.0-or-later |

### The Measure Phase: An Ordering Difference, Not a Missing Feature

Plexus renders nodes at `(0,0)`, measures their DOM sizes, passes those sizes to Graphviz, and only then renders them at final positions. Node content can be arbitrary React with dynamic text, and the layout engine still receives accurate bounding boxes.

`@xyflow/react` measures nodes as well. Each node carries `measured: { width?, height? }` holding its observed size, and `useNodesInitialized()` reports whether every node in the flow has been measured. What differs is the order: measurement happens after the nodes mount at whatever positions the caller supplied, so a size-dependent layout runs in two passes — mount, wait for `useNodesInitialized()`, feed `node.measured` to the layout engine, write the positions back.

For Jaeger's use cases this matters less than it appears. `OpNode` and the `DAG` service nodes both have variable-width text, and both can stay exactly as they are: they are React components either way, and the layout engine gets real measured sizes either way. Fixed node dimensions with truncated labels — the UX regression that would otherwise be forced — are not required.

What the ordering does cost is one render pass in which nodes sit unpositioned, which has to be hidden behind opacity or a deferred `fitView`, plus the state handling for an async layout round-trip. That is a hook's worth of work, not a reimplementation of Plexus.

### Assessment for Jaeger's Two Graph Views

**TraceGraph** (trace spans as nodes):
- Moderate migration cost. Variable node sizes are handled by `node.measured`, so `OpNode` ports as-is.
- Primary gains would be: NodeToolbar for per-span actions (currently triggered via click), and reduced maintenance burden.
- The existing Plexus rendering for TraceGraph is well-optimized and not a pain point, and this is the view with the most nodes, so it carries the most rendering risk.
- **Recommendation**: the second view to migrate, not the first. Nothing blocks it, but it has the least to gain from interactivity and the most to lose from a rendering regression.

**Service Dependency Graph** (service names as nodes):
- Moderate migration cost, and the lowest of the four views: the node is a circle and a label, and node count is in the hundreds rather than the thousands.
- Primary gains would be: node dragging for untangling a cluttered service graph, keyboard accessibility, and `NodeToolbar`. The existing `position: fixed` context menu works, so `NodeToolbar` is a cleaner implementation rather than a functional gap.
- The existing `DAG.tsx` context menu (Set focus / View traces) is the most user-interactive part of any Jaeger graph view; `NodeToolbar` would be a natural fit.
- **Recommendation**: migrate this view first. It has the lowest cost, the most interaction to gain, and the least rendering risk, which makes it the right place to find out what the library costs in practice.

---

## Part 4: Apache ECharts as a Scale-First Alternative

### What ECharts Is

Apache ECharts (~62,000 GitHub stars; Apache Software Foundation top-level project since 2021; active weekly releases) is a general-purpose charting and visualization library. It is not a graph-specific library — it covers line, bar, scatter, map, tree, sankey, and many other chart types. The **`graph` series** is its network/topology rendering primitive, and the **`tree` series** handles rooted trees specifically.

The key architectural difference from Plexus and `@xyflow/react` is the **rendering backend**: ECharts renders to a `<canvas>` element by default (SVG renderer available as an option). Canvas rendering sidesteps the DOM node-count ceiling that constrains SVG/HTML-based renderers.

### Graph Series Capabilities

**Layout algorithms built in:**
- `force` — force-directed (physics simulation, iterative, supports node dragging during simulation)
- `circular` — nodes arranged in a circle
- `none` — caller supplies `x`/`y` coordinates; pairs with any external layout engine

There is **no built-in hierarchical/Sugiyama layout**. For a DAG or tree with ranked layers, the caller must compute positions externally (Graphviz, elkjs, Dagre) and pass them via `layout: 'none'`. The `tree` series does have a built-in top-down or left-right tree layout, but it is limited to rooted trees and offers less control than a dedicated layout engine.

**Node rendering:**
- Built-in symbol types: `circle`, `rect`, `roundRect`, `triangle`, `diamond`, `pin`, `arrow`, plus custom SVG path strings
- Node labels: text anchored to the symbol, configurable position and style
- Node size: uniform or data-driven via `symbolSize`
- **Custom HTML nodes are not supported** — nodes are canvas-drawn primitives, not React components or DOM elements

**Edge rendering:**
- Directed (with arrowheads) or undirected
- Edge labels supported
- Curved or straight lines; curveness configurable per edge
- No built-in smooth-step / manhattan routing

**Interactivity:**
- Pan and zoom via `roam: true` (mouse wheel + drag)
- Click, hover (`mouseover`/`mouseout`) event handlers on nodes and edges
- Tooltips (built-in, HTML or canvas)
- Node dragging: supported in force layout; in `layout: 'none'` nodes are fixed by default
- No built-in multi-select or drag-box selection
- No `NodeToolbar` equivalent — contextual UI requires custom overlay positioned via `convertToPixel`

**React integration:**
- No official React wrapper; the most widely used community library is `echarts-for-react` (~4,000 stars, maintained but not by the Apache ECharts team). Integration is a thin wrapper around the imperative `echarts.init()` / `setOption()` API.

### Scale: Where ECharts Has a Genuine Advantage

Canvas rendering means ECharts does not create a DOM node per graph element. For a graph with 5,000 nodes, Plexus and `@xyflow/react` produce 5,000 DOM elements (divs, SVG `<g>`s) that the browser must style, composite, and garbage-collect. ECharts draws all 5,000 as canvas pixels in a single element.

In practice:
- ECharts is reported to stay fluid at **5,000–10,000 node** graphs where SVG renderers have already degraded. This figure is an estimate from general canvas-versus-DOM experience, not a measurement of Jaeger's graphs, and Open Question 7 exists because it has to be confirmed on real traces before it can justify anything.
- For the TraceGraph use case — traces with thousands of spans — this is the most significant advantage ECharts offers over the current stack.
- Progressive rendering does **not** apply to the graph series. `progressive` defaults are defined for the candlestick, effectScatter, pictorialBar, bar, line, parallel, scatter, and treemap series, and not for graph; `lib/chart/graph/circularLayoutHelper.js` says so in a comment — "the progressive rendering is not applied to graph" — and hangs a `FIXME` on the day it might be. So a 10,000-node graph is still one long paint; canvas makes that paint cheaper, it does not break it into frames.

The SVG renderer (opt-in via `{ renderer: 'svg' }` at init time) sacrifices the scale advantage but enables DOM-level accessibility and CSS theming. It is generally used only when vector export or screen reader support is required.

### Node Rendering Complexity: An Honest Per-View Assessment

The claim that Jaeger's nodes require "rich React components" needs to be examined against what each view actually renders.

**Service Dependency Graph (`DAG.tsx`)** — `renderNode` produces a colored circle (`DAG--nodeCircle`) and a text label. This is natively expressible as an ECharts canvas symbol + label with no loss of fidelity. **Canvas-compatible as-is.**

**Deep Dependency Graph (`DdgNodeContent`)** — A circular node whose radius is computed dynamically from service and operation text length, with the text centred inside. Additionally carries a decoration progress-bar arc and an always-visible `ActionsMenu` attached below the circle. The variable radius based on content is awkward for canvas (ECharts symbol size is uniform or data-driven by a scalar, not text-flow-dependent), and the always-on action menu has no canvas equivalent. **Not straightforward to port.**

**TraceDiff (`DiffNode`)** — A 2×2 table: change-count metric | service name; percentage metric | operation name. Color-coded by diff state (added/removed/changed/same). This is more data than a bare label, but all of it is static text with a background color — representable as a canvas `rect` symbol with a label and `itemStyle.color`, with the metric details moved to a tooltip. **Canvas-compatible with minor simplification.**

**TraceGraph (`OpNode.tsx`)** — A two-row, three-column table: count/errors | **service** | avg-time; duration+% | operation | self-time+%. Four of the six cells are metrics; the middle column holds the service and operation labels. Background color encodes the selected mode (service color, time heatmap, self-time heatmap). The node is also wrapped in an antd `Popover` whose content is the same table — so the tooltip currently adds nothing beyond what is already visible in the node body.

This is the node the user called out: four metric cells alongside the two labels make each node large and the graph harder to read. In canvas terms, the color-encoding (the most information-dense part) maps directly to `itemStyle.color`; service and operation names map to a two-line label; the four metrics are better placed in a tooltip. **Canvas-compatible with a deliberate simplification that is arguably a UX improvement, not a regression.**

### ECharts Weaknesses for Jaeger's Use Cases

- **Node content that genuinely requires HTML**: `DdgNodeContent` (Deep Dependency Graph) uses a variable-radius circle sized to fit its text, an always-visible action menu attached to the node, and a decoration progress-bar arc. None of these translate cleanly to a canvas symbol. This view is the hardest to migrate.
- **No built-in hierarchical layout**: External layout engine still required (Graphviz or elkjs) for the DAG and trace views. ECharts handles layout only for force and circular; for everything else `layout: 'none'` is used with pre-computed positions.
- **Imperative API mismatch with React**: ECharts is fundamentally an imperative library (`setOption`, `getZr`, event listeners). `echarts-for-react` hides some of this but the mental model remains options-object-driven rather than declarative React. Incremental updates require diffing option objects, not state.
- **Edge routing is basic**: No manhattan/smooth-step routing. Edges are straight lines or simple curves (`curveness` parameter). Dense graphs with many crossing edges will look worse than Graphviz output, and worse again than the `neato` routing pass Jaeger could enable but does not.
- **No layout direction toggle**: The built-in `tree` series supports `orient: 'LR' | 'TB'`, but for `layout: 'none'` the direction is determined entirely by the external layout engine, same as any other option.
- **Theming**: Canvas rendering does not inherit CSS custom properties. Dark mode and design token theming require explicitly passing color values into the ECharts options object rather than relying on CSS variables.

### Summary Table

| Dimension | Plexus + Graphviz | `@xyflow/react` + elkjs | Apache ECharts |
|---|---|---|---|
| **Rendering backend** | SVG + HTML DOM | SVG + HTML DOM | **Canvas** (SVG opt-in) |
| **Scale ceiling (rendering)** | ~hundreds of nodes before DOM pressure | ~hundreds–low thousands with memoization | Thousands of nodes without virtualization, but as a single paint, and the ceiling is an estimate rather than a measurement |
| **Custom node content** | Full React components | Full React components | Canvas symbols + label only; no React subtrees in nodes |
| **Built-in hierarchical layout** | Via Graphviz (worker) | No — needs elkjs | No — needs external engine |
| **React integration** | React-native (Plexus) | React-native | Imperative wrapper via `echarts-for-react` |
| **Node dragging** | No | Opt-in | Force layout only |
| **Edge routing quality** | High (Graphviz; `dot` polylines today, `neato` splines available) | Medium (smooth-step, bezier) | Low (straight lines or simple curves) |
| **Contextual UI (toolbars)** | Custom overlays | `NodeToolbar` API | Custom overlays via `convertToPixel` |
| **Accessibility / ARIA** | Not implemented | Keyboard and ARIA primitives; helps toward WCAG 2.1 AA | Canvas: none; SVG renderer: partial |
| **CSS / design token theming** | CSS variables work | CSS variables work | Must pass colors into options object |
| **Maintenance** | Jaeger-owned | xyflow team (active) | Apache TLP, very active |
| **Bundle size** | 468 KB gzipped (worker) | 86 KB gzipped, plus a layout engine | 368 KB gzipped for the full minified build; a graph-only build is smaller |
| **License** | Apache 2.0 | MIT | Apache 2.0 |
| **Verified against** | `packages/plexus` at this commit; `@viz-js/viz` 3.29.0 | `@xyflow/react` 12.11.2, `@xyflow/system` 0.0.79 | `echarts` 6.1.0 |

### Assessment for Jaeger's Two Graph Views

**TraceGraph** (thousands of spans):
- This is the view where ECharts' canvas backend offers a real advantage — if rendering performance at high span counts is a confirmed problem.
- `OpNode.tsx`'s two-row, three-column table in the node body is the main obstacle, but as noted above, the color encoding and service/operation label translate cleanly to canvas; the four metric cells are better in a tooltip anyway. The antd `Popover` wrapping the node (which shows the same table as a popover) would simply become an ECharts `tooltip`. This is a design simplification, not a regression.
- **Verdict**: More feasible than it initially appears. The canvas port of `OpNode` is plausible with a deliberate decision to move per-span metrics into the tooltip.

**Service Dependency Graph** (hundreds of services):
- Node counts are lower; the canvas advantage is marginal.
- The existing node is a circle + label, which maps trivially to canvas. But the API friction of ECharts' imperative model and the loss of `@xyflow/react`'s richer interaction primitives are harder to justify at this scale.
- **Verdict**: Not a strong fit; `@xyflow/react` is the better option for this view.

**Deep Dependency Graph** (service+operation nodes, variable graph size):
- `DdgNodeContent` is the most complex node renderer: variable-radius circles, an always-visible action menu, and a progress-bar arc decoration. These are not straightforward canvas primitives.
- **Verdict**: Poor fit for ECharts canvas rendering; Plexus or `@xyflow/react` are better options here.

---

## Part 5: Migration Paths

Three migration paths are worth naming explicitly:

### Path A: Layout engine only (Graphviz → elkjs for DAG)
- Replace `@viz-js/viz` calls in Plexus `LayoutManager` with an ELK adapter for the `DAG.tsx` view only.
- Keep Plexus as the rendering layer.
- Gains: layout-direction toggle, algorithm selection, smaller dependency for that view.
- Cost: moderate; requires writing an ELK adapter that maps Plexus's `TSizeVertex[]` + `TEdge[]` to ELK JSON and back, in place of `getLayout.ts`. Off-main-thread layout comes along for free, because the worker and its pool do not know which engine they are running.
- Risk: low; Plexus API is unchanged.

### Path B: Rendering layer only (Plexus → `@xyflow/react`, keep Graphviz)
- Replace Plexus with `@xyflow/react`; keep Graphviz for layout (run it outside of Plexus, feed positions in).
- Gains: `NodeToolbar`, ARIA, `fitView` animation, reduced rendering maintenance.
- Cost: moderate per view. `node.measured` removes the measure-phase obstacle, so the work is the node and edge port plus feeding Graphviz positions in from outside Plexus.
- Risk: moderate; `@xyflow/react` API churn (v11 → v12 had breaking changes).

### Path C: Full stack replacement (Plexus + Graphviz → `@xyflow/react` + elkjs)
- Replace both rendering and layout for one or both graph views.
- Gains: all of the above, and this is the only path that removes Plexus entirely — including the ~1,180 lines of `LayoutManager` that Path B keeps. In exchange Jaeger owns an ELK adapter.
- Cost: highest, because "eliminates Plexus" means porting all four consumers — including the deep dependency graph, whose `DdgNodeContent` is the hardest node in the codebase.
- Risk: moderate-high; two simultaneous library changes are harder to debug.

### Path D: ECharts for TraceGraph (scale-motivated)
- Replace Plexus rendering for `TraceGraph` with ECharts `graph` series using `layout: 'none'` and externally-computed positions (Graphviz or elkjs).
- Gains: canvas rendering handles thousands of spans without DOM pressure. Progressive rendering is not among them — ECharts does not apply it to the graph series.
- Cost: high; requires replacing `OpNode.tsx` HTML nodes with canvas primitives or building a DOM overlay system, plus the imperative ECharts API integration.
- Risk: high; significant UX regression risk on node content fidelity. Only justified if TraceGraph rendering performance is a confirmed, measured problem at real-world span counts.

**Pragmatic starting point**: none of these four, yet — the two user-visible payoffs usually attributed to Path A (a layout-direction toggle and force-directed mode for cyclic graphs) are available without changing engines, so Path A pays ELK's integration cost for benefits the current stack can already deliver. See the Recommendation below. Path D should only be considered after profiling confirms a rendering bottleneck that memoization cannot solve.

---

## Recommendation

**Two decisions, taken separately: keep Graphviz for layout, and replace Plexus's rendering with `@xyflow/react`, starting with the service dependency graph. That combination is Path B. Leave the deep dependency graph on Plexus, and ship the missing layout controls in the current stack now, since they wait on neither decision.**

These are two independent pieces of work, and the first does not wait on the second, because two of the three motivations in Context are already met by the current stack or sit one small change away from it:

- **Algorithm choice already ships.** `DAGOptions` gives the dependency graph a Hierarchical (`dot`) / Force Directed (`sfdp`) switch, and `DependencyGraph` also picks `sfdp` on its own above `dagMaxNumServices`. Graphviz serves that need today; a new engine is not what unlocks it.
- **A layout-direction toggle is a small in-stack change.** `DAG` already builds its `TLayoutOptions` from the user's layout selection and constructs a new `LayoutManager` whenever that selection changes, so exposing `rankdir` there means adding one field driven by one piece of UI state. `TraceGraph` builds its manager once in a ref and needs the same rebuild-on-change treatment. Both changes stay inside the view.

Neither of those is a reason to change libraries, so ship them where they are. What the current stack cannot answer is node dragging, keyboard accessibility, and who maintains the ~1,860 lines of rendering and viewport code in `Digraph` and `zoom` — and those are what `@xyflow/react` is actually for.

The layout engine and the rendering layer are separate decisions, as the Scope section says, so they get separate matrices. Almost every combination is buildable: the one real coupling is that neither `@xyflow/react` nor ECharts computes a hierarchical layout, so both need an engine behind them, and whichever engine that is stays Jaeger's to wrap.

Rendering ceiling is not scored either. Real deployments reach 5,000 services and the largest are nearer 25,000, but drawing them all at once is a poster rather than a tool — Netflix's "death star" is the genre — and Jaeger already answers scale with UX instead of rendering. Above `DAG_MAX_NUM_SERVICES` (1,200) `DAG` declines to draw the graph at all and asks for a focal service and a depth; `DAGOptions` carries that depth control; the deep dependency graph is built entirely around a focal node and a hop count. What the renderer has to be good at is a focal neighbourhood of a few hundred nodes, which all three candidates manage. So raw ceiling is excluded for the same reason download size is: real, measurable, and not what the decision turns on. If a multi-thousand-node view is ever wanted, the first question is whether anyone can use it, not which library draws it.

Download size is not scored in either matrix. Jaeger already ships 468 KB gzipped of Graphviz and the project has no complaint about it, so it is an accepted cost rather than a live criterion — and every candidate here is smaller than that accepted baseline: elkjs 467 KB, ECharts 368 KB for a full build, `@xyflow/react` 86 KB with `@xyflow/system`, Plexus's own `d3-zoom` about 15 KB. The numbers are recorded in Parts 2 through 4 for reference. If page weight ever does become a concern, it will be a concern about the engine, and neither of these decisions is the lever.

### Decision 1: Layout Engine

**A permissive license is a gate here, not a criterion.** Jaeger UI is Apache-2.0 under the CNCF, and elkjs is `EPL-2.0 OR GPL-3.0-or-later`. The EPL branch is weak copyleft rather than a prohibition, but adopting it would need a license exception and legal review before any technical merit mattered. So elkjs is not scored below. Part 2 compared Graphviz against elkjs alone, which was too narrow a field: the permissive alternatives were never considered, and they are where this decision should have been argued.

| Criterion | Graphviz via `@viz-js/viz` (current) | `@dagrejs/dagre` | `d3-dag` |
|---|---|---|---|
| **License** | 🟢 MIT | 🟢 MIT | 🟢 MIT |
| **Layered DAG quality** | 🟢 the reference implementation | 🟢 same Sugiyama family, with `network-simplex`, `tight-tree`, and `longest-path` rankers | 🟢 Sugiyama with pluggable decross and coord operators |
| **Trees, which is what most traces are** | 🟢 | 🟢 | 🟢 ¹ |
| **Layered layout at 500 services** | 🟡 1.9 s, which is why `dot` is disabled there ² | 🟡 1.1 s — faster than `dot`, still too slow to feel interactive | 🟡 untested |
| **Beyond ~1,200** | 🔴 `dot` did not finish; `sfdp` is the fallback ² | 🔴 6.3 s at 1,200, out of memory at 5,000 | 🔴 untested |
| **Edge routing** | 🟢 splines available, polylines in use | 🟡 point lists, no spline routing | 🟡 point lists |
| **Layout-direction toggle** | 🟢 `rankdir` | 🟢 `rankdir` | 🟡 rotate the result yourself |
| **Compound (nested) graphs** | 🟡 clusters exist; Plexus's pipeline does not carry them as written ³ | 🟢 native, via `setParent` | 🔴 |
| **Maturity and activity** | 🟢 Graphviz is ~30 years old; `@viz-js/viz` releases regularly | 🟢 released this week, 5.7k stars, not archived | 🟡 smaller project and community |
| **Cost to adopt** | 🟢 nothing to do | 🟡 replace `getLayout.ts` with a dagre adapter | 🟡 the same, plus more assembly |

**Verdict: stay on Graphviz for now, and schedule the dagre comparison.** Nothing forces a change today: the direction toggle and the algorithm switch are already reachable in `LayoutManager`, and no view is blocked. But the reason Part 2 gives — Graphviz's engine breadth — is not what is holding the line, and neither is scale.

Laying out synthetic graphs of the same topology through both engines gives:

| Nodes (with ~60% extra edges) | Graphviz `dot` | `@dagrejs/dagre` |
|---|---|---|
| 200 | 159 ms | 184 ms |
| 500 | 1,920 ms | 1,134 ms |
| 1,200 | did not finish in two minutes | 6,269 ms |
| 5,000 | not attempted | out of memory at a 4 GB heap |

These are dense random graphs run under Node rather than Jaeger's own data in a browser, so treat them as an order of magnitude rather than a benchmark. Three things follow anyway. Neither engine is pleasant at 500 nodes, which is independent confirmation of why `DAGOptions` disables Hierarchical there and why `DAG` refuses to draw past 1,200 — the fallback is a symptom of layered layout being expensive at that size, in either library. Both therefore need to stay off the main thread, so Plexus's worker pool survives a change of engine. And dagre is not the weaker engine at the sizes that matter: at 500 it beats `dot`, and the gap at 1,200 favours it heavily.

**What would actually be bought by moving to dagre**, and nesting is only part of it:

- **The DOT round-trip disappears.** dagre takes plain objects carrying `width` and `height` and returns `x`/`y` in pixels. That retires `toDot.ts`, the `convPlain.ts` text parser, and the 72-DPI `conv-coord.ts` conversion this document already lists as a source of historical bugs. The worker and its pool stay, per the timings above.
- **It is the pairing `@xyflow/react` assumes.** If Decision 2 proceeds, dagre is what the ecosystem's examples and community answers are written against, and Graphviz means maintaining the adapter alone.
- **No WASM, and 17 KB instead of 468 KB** — not a criterion, per the note above, but it removes the largest dependency in either graph view.
- **Compound graphs**, discussed below.

**What it would cost:** dagre has no force-directed mode, so the 500-to-1,200 service band that `sfdp` covers today would need either the focal-service UX to start earlier or a companion such as `d3-force` or WebCola. It is also out of the question above a few thousand nodes, though so is `dot`.

### What Nesting Would Buy

A compound graph is one where a node can contain a subgraph. The engine lays the children out inside their parent, sizes the parent to fit, and routes edges that cross the boundary so they leave one container and enter another rather than cutting through unrelated nodes. Drawing a box around a group afterwards is not the same thing, because nothing has kept those nodes together.

For Jaeger there are three plausible uses, none of them requested today:

- **Group spans by service in the trace DAG.** `TraceGraph` already colours nodes by service in `MODE_SERVICE`; nesting would make that boundary structural instead of a colour, so a trace reads as a sequence of service hops with internal detail contained.
- **Group services by namespace in the dependency graph.** This is the most interesting one, because it is an alternative answer to the problem the focal-service fallback exists for: a 500-service map collapsed into perhaps twenty namespace containers is legible, where 500 free nodes are not, and OTel already supplies the grouping key in `service.namespace` and the Kubernetes resource attributes. Expanding a container is then a UI affordance rather than a re-layout of everything.
- **Group operations under their service in the deep dependency graph**, whose nodes are already service-and-operation pairs.

That is why nesting appears in this comparison at all. It is a capability neither engine gives Jaeger today — Graphviz has clusters, but Plexus's DOT round-trip carries neither them nor their geometry — and dagre is the only candidate here that offers it under a permissive license.

¹ `d3-hierarchy` (ISC) is the more focused choice for trees and is smaller still. ² `DependencyGraph` switches to `sfdp` above `dagMaxNumServices` (default 500) and `DAG` forces focal-service selection above 1,200. If a layered engine were adopted, `d3-force` or WebCola (both MIT) could cover the fallback — or a layered engine might simply hold up, which is the untested part. ³ `toDot` emits a flat `digraph` with no `subgraph cluster_*`, and `getLayout` asks for `format: 'plain'`, whose records `convPlain` reads as graph, node, edge, and stop — it throws on anything else. Both files are Jaeger's, so this is a cost rather than a barrier: clusters need the DOT change, an output format that reports container bounds, and renderer work to draw them.

### Decision 2: Rendering Layer

| Criterion | Plexus (current) | `@xyflow/react` | ECharts |
|---|---|---|---|
| **Node dragging** | 🔴 not supported | 🟢 one prop | 🔴 force layout only |
| **Variable-width node content** | 🟢 measure phase is built in | 🟡 measured after a first unpositioned mount ⁴ | 🔴 canvas symbols hold no React subtree |
| **Keyboard navigation and ARIA** | 🔴 not implemented | 🟢 primitives, not conformance | 🔴 canvas exposes nothing |
| **CSS and design-token theming** | 🟢 | 🟢 | 🔴 colors must be passed into the options object |
| **Contextual toolbars** | 🟡 hand-rolled `position: fixed` overlay | 🟢 `NodeToolbar`, anchored and zoom-aware | 🟡 overlay via `convertToPixel` |
| **Maintenance ownership** | 🔴 ~1,860 lines of `Digraph` and `zoom` | 🟢 external team | 🟡 an imperative wrapper to own |
| **Migration cost** | 🟢 nothing to do | 🟡 per view ⁵ | 🔴 |

**Verdict: migrate to `@xyflow/react`, dependency graph first, and drop ECharts from consideration.** `@xyflow/react` is better than Plexus on every axis Jaeger lacks and no worse on any axis Jaeger has, once the measure phase is understood correctly. ECharts scores no green at all here: its single advantage was raw scale, and once scale is excluded as an axis nothing is left to weigh against losing React node content, accessibility, and CSS theming. It should be treated as surveyed and rejected rather than kept in reserve.

🟢 good 🟡 partial or caveated 🔴 poor

⁴ `node.measured` carries the observed size and `useNodesInitialized()` gates the layout on it, so the cost is one unpositioned render pass to hide, not truncated labels. ⁵ See the per-view breakdown below.

Splitting the decisions this way also settles where the `LayoutManager` lines belong. Staying on Graphviz keeps them — about 1,180 — no matter which renderer wins, so they are a cost of Decision 1 and not a discount against Decision 2. `@xyflow/react` earns its 🟢 on maintenance by retiring `Digraph` and `zoom`, roughly 1,860 lines, and nothing more.

The 🟡 on migration cost is an average. It is not uniform across the four views Plexus serves:

| Target | Cost | Why |
|---|---|---|
| Dependency graph (`DAG.tsx`) | 🟡 | A circle and a label per node, hundreds of nodes, and a context menu that maps onto `NodeToolbar` |
| `TraceGraph` | 🟡 | `OpNode` ports as a React component; the risk is rendering at thousands of spans, not fidelity |
| `TraceDiff` | 🟡 | `DiffNode` is static text on a background color |
| Deep dependency graph | 🔴 | `DdgNodeContent` sizes its circle to its own text and carries an always-visible `ActionsMenu` and a progress-arc decoration |
| Removing Plexus outright | 🔴 | Requires the deep dependency graph above |

Two things keep the per-view risk at 🟡 rather than 🔴. `@jaegertracing/plexus` is `private: true`, so no external consumer breaks. And the views are independent, so `@xyflow/react` and Plexus can both be in the tree while the migration proceeds one view at a time.

### Why the Dependency Graph Goes First

It is the cheapest of the four views, it has the most interaction to gain, and it carries the least rendering risk, so it is the right place to learn what the library costs in practice before committing the other views. Keeping Graphviz for layout under Path B also isolates the variable: if the result regresses, the layout engine is not a suspect.

Be honest about the sequencing cost, though. `Digraph` and `zoom` cannot be deleted until all four views leave them, so the first migration *adds* a rendering stack rather than retiring one, and the maintenance saving lands last. The trial is therefore justified by what the dependency graph gains — dragging, keyboard access, `NodeToolbar` — and not by any reduction in code ownership, which arrives only if the programme finishes.

`TraceGraph` follows only if the dependency graph goes well, and its own open question is separate — whether DOM rendering rather than layout sets its ceiling at real span counts (Open Question 7). The deep dependency graph stays on Plexus until `DdgNodeContent` is redesigned, and nothing here requires that.

### What Would Change This Recommendation

- **The dependency graph trial regresses** on layout quality, rendering, or the context-menu UX. Then Plexus keeps the remaining views and the trial is reverted; the in-stack `rankdir` toggle survives either way, since it does not depend on the renderer.
- **The product decides to draw whole multi-thousand-node graphs as a feature**, rather than the focal neighbourhoods it presents today. That is the only route back to ECharts, and it is a product decision about whether such a view is usable at all, not a rendering benchmark.
- **Spike 3 finds dagre readable on real data.** Then Decision 1 flips: dagre retires the DOT round-trip, brings nesting with it, and needs only a plan for the band `sfdp` covers today. Nesting alone would also reopen the decision, as a build-versus-adopt question — teach `toDot` to emit `subgraph cluster_*` and read container bounds back, or adopt dagre, which models nesting through `setParent`. Either way, not elkjs: it is gated on license and dagre covers the same capability.

---

## Validation Plan

Two things in the recommendation are untried, and an untried recommendation is not one. Each is a throwaway spike with an acceptance test written before the work starts, so it can fail cleanly.

### Spike 1 — Render the dependency graph with `@xyflow/react`, keeping Graphviz

This is the whole of Decision 2, in one view, with the layout engine deliberately held constant so that any visual change is a conversion bug rather than a layout difference.

- Leave `LayoutManager` alone. `DAG.tsx` keeps calling it and passes the positions it returns straight into `<ReactFlow>` as `node.position`.
- One `nodeTypes` entry for the existing circle-and-label node; one `edgeTypes` entry that draws the point list Graphviz returns.
- Replace the `position: fixed` `ActionsMenu` overlay with `NodeToolbar`, keeping the Set focus and View traces items.
- Turn on `nodesDraggable`, and leave `nodesFocusable` at its default.

**Accept if,** at 50, 200, and 500 services: node positions match today's exactly; the toolbar stays anchored through pan and zoom; dragging a node moves its edges with no worker round-trip; Tab reaches nodes and Enter selects one.

**Reject if** the Graphviz point list cannot be drawn faithfully as an `edgeType`, or if the unpositioned first pass flashes in a way opacity cannot hide.

Days rather than weeks, since the data pipeline and the layout are untouched. Settles Open Questions 2 and 4.

### Spike 2 — Port `TraceGraph`

Only after Spike 1 lands, and it decides whether the migration continues past one view. This is where `node.measured` and `useNodesInitialized()` are exercised for real, because `OpNode`'s text has variable width where the dependency graph's nodes are nearly uniform.

**Accept if** `OpNode` renders unchanged with no truncated labels, the unpositioned pass is invisible, and a 2,000-span trace reaches first paint no slower than today.

### Spike 3 — dagre against `dot` on real dependency data

Worth scheduling after Spike 1, not contingent on nesting. The synthetic timings in Decision 1 say dagre is competitive at the sizes the UI presents and better past them, and the prize is retiring the DOT round-trip — `toDot`, `convPlain`, and the DPI conversion — while keeping the worker.

Export a real dependency graph at roughly 200 and 500 services and lay it out through both engines. Compare edge crossings, aspect ratio, and wall-clock time, and diff the rendered result against today's.

**Accept dagre if** it matches `dot` on readability at those sizes and is no slower, **and** a plan exists for the 500-to-1,200 band that `sfdp` covers today — either starting the focal-service UX earlier or adding `d3-force` or WebCola alongside. **Reject it if** readability regresses on real data, whatever the synthetic numbers said.

Do not gate this on 5,000 or 25,000 nodes. Neither engine reaches that: `dot` did not finish 1,200 nodes in two minutes and dagre exhausted a 4 GB heap at 5,000. That size is the poster case, and the product's answer to it is a focal neighbourhood, not a faster layout library.

---

## Open Questions

1. ~~**Are fixed-width nodes acceptable for `TraceGraph`?**~~ Moot: `node.measured` gives the layout engine real sizes, so nodes keep their variable width and labels are not truncated.
2. **Is node dragging a desired feature?** `@xyflow/react` is the only path to it, and adding drag to Plexus would be a major rewrite. The dependency graph trial answers this cheaply, since the library makes drag a single prop.
3. **What is the practical scale ceiling for each view?** Deliberately demoted. The views present focal neighbourhoods of a few hundred nodes, so that is the size Spike 1 measures; `DAG` already refuses to draw more than 1,200 services and asks for a focal service instead.
4. **Is the Plexus multi-layer system (SVG + HTML) needed?** `@xyflow/react` does not have a direct equivalent to Plexus's layered rendering. `TraceGraph` uses SVG layers for node-find emphasis; this would need to become a custom node renderer concern.
5. ~~**Would a layout-direction toggle alone justify the ELK migration?**~~ Answered: no. `rankdir` is already a `LayoutManager` option, so the toggle ships inside the current stack.
6. **Would dagre lay out a real 500-service dependency graph as readably as `dot`?** Spike 3 answers this. Synthetic graphs say dagre is faster at that size; readability on real data is the open part.
7. ~~**Is TraceGraph rendering performance actually a bottleneck at real-world span counts?**~~ Closed. Spike 2's acceptance test covers first paint on a 2,000-span trace, which is the size the view actually shows, and no candidate is being chosen for raw ceiling.
