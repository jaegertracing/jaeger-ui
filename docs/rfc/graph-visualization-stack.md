# RFC: Graph Visualization Stack — Plexus + viz.js vs @xyflow/react + elkjs vs Apache ECharts

* **Status**: RFC
* **Last Updated**: 2026-05-26

---

## TL;DR

Jaeger UI has two graph views — the trace DAG (`TraceGraph`) and the service dependency graph (`DAG`) — both built on the internal **Plexus** library which uses **Graphviz (via `@viz-js/viz`)** for layout. Neither view allows users to reposition nodes after rendering. This RFC surveys whether migrating to **elkjs** for layout and/or **`@xyflow/react`** for rendering would materially improve either view, and separately examines **Apache ECharts** as an alternative rendering backend motivated primarily by scale. Library capability data is drawn from each project's public documentation and source.

---

## Context & Problem

Jaeger UI's graph stack was designed around two non-negotiable constraints: (1) layout quality matters more than interactivity, and (2) the graphs should render correctly with zero user configuration. Plexus + Graphviz have served those constraints well. But several recurring issues expose limits of the current approach:

- **Layout inflexibility**: When Graphviz produces a cluttered or counter-intuitive layout — edge crossings, nodes packed too tightly, an unfortunate root node selection — there is no escape hatch. The user cannot drag a node, change the layout direction, or re-run with different spacing parameters.
- **No layout-direction toggle**: `TraceGraph` always uses top-down (`TB`) rank direction; `DAG` always uses left-right (`LR`). Neither exposes a toggle.
- **Maintenance burden**: Plexus is ~1,700 lines of custom React + SVG rendering that the Jaeger team owns entirely. It was last actively developed several years ago. `@xyflow/react` is a widely-maintained open-source library with an active development team; adopting it could transfer much of that maintenance externally.
- **Ecosystem age**: `@viz-js/viz` (the Graphviz WASM wrapper) is the third incarnation of viz.js and is healthy, but the underlying Graphviz binary has not had significant algorithmic development in many years. elkjs is more actively developed and has a broader algorithm portfolio.

This RFC does not propose a final decision. It documents the comparison so an informed choice can be made.

---

## Scope

This document covers three questions that can be answered independently:

1. **Layout engine**: Should `@viz-js/viz` (Graphviz) be replaced by or supplemented with **elkjs**?
2. **Rendering layer**: Should **Plexus** be replaced by **`@xyflow/react`**?
3. **Scale-first alternative**: Does **Apache ECharts** offer a better fit for high-node-count views via its canvas rendering backend?

---

## Part 1: Node Interactivity — Can Users Reposition Nodes?

### Jaeger UI (current)

**No.** Node positions are fully determined by Graphviz and treated as immutable by Plexus. The position types (`TLayoutVertex.left`, `TLayoutVertex.top`) are read-only after layout. There are no drag event handlers anywhere in Plexus or in the two graph consumers (`TraceGraph.tsx`, `DAG.tsx`). Grep for `onMouseDown`, `onDrag`, `draggable`, `pointermove`, `setPointerCapture` across all of `packages/plexus/` returns zero results.

What Plexus *does* support at the viewport level is **pan and zoom** via `d3-zoom`: the entire graph can be panned by clicking and dragging empty canvas space, and zoomed via scroll wheel or pinch. This is distinct from per-node repositioning; the graph's internal layout is never modified.

### `@xyflow/react` (capability)

**Node dragging is supported natively and opt-in.** The `nodesDraggable` prop defaults to `true`; setting it to `false` disables dragging entirely. This means adopting `@xyflow/react` does not force node dragging on Jaeger — it is a deliberate choice either way, controlled by a single prop.

### Implications

Neither codebase currently supports node dragging. The question of whether to add it is orthogonal to the library choice, but the options differ significantly in implementation cost — and the reason is **edge geometry**, not node positions.

Node positions are plain `{x, y}` numbers at the application layer; moving a node is trivial. The hard part is that Plexus uses Graphviz's `neato` engine to compute edge paths as pre-baked Bezier spline control points (a series of `[x, y]` coordinates per edge), calculated with specific node positions assumed. If a node moves, those stored control points are stale — edges would point at empty space. Correcting them requires re-running the `neato` phase in the Web Worker with the moved node pinned, which has non-trivial latency and would produce jank on every drag event.

`@xyflow/react` avoids this entirely because it does not pre-compute edge geometry. Edge paths are functions of current node handle positions, recalculated on every render via `getSmoothStepPath` / `getBezierPath`. Dragging a node updates its position in React state; all connected edges recompute their paths in the same render cycle — no worker round-trip, no stale data.

This means adding node drag to the current Plexus stack is not just a coordinate-system rewrite: it requires either (a) accepting a worker round-trip per drag frame (too slow for smooth interaction), or (b) abandoning pre-computed Graphviz splines in favour of client-side edge routing during drag, then optionally re-running `neato` on drag end to restore spline quality. Option (b) is workable but requires managing two edge-rendering modes. With `@xyflow/react`, drag is already architecturally consistent with normal rendering.

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
| **Layout options exposed** | `rankdir`, `ranksep`, `nodesep`, `splines`, `sep`, `engine` | Algorithm, direction, layer spacing, node spacing, padding — all numeric JSON |
| **Two-phase layout** | Used by Plexus: `dot` for positions, `neato` for edge routing | Single-phase; edge routing integrated |
| **Worker model** | Plexus runs Graphviz in a reusable Web Worker pool — layout never blocks the main thread | Runs on main thread by default; `elkjs/lib/elk-worker.js` exists but must be wired up explicitly |
| **Scale (layout)** | Designed for large graphs; worker isolation handles 1,000+ node layouts without jank | Main-thread execution blocks UI for very large graphs; worker wrapper is a prerequisite at Jaeger's scale |
| **Maturity** | Graphviz ~30 years; `@viz-js/viz` wrapper ~10 years, stable | ELK ~10 years (Eclipse project); `elkjs` JS port ~8 years |
| **Active development** | Graphviz core stable/slow; `@viz-js/viz` has regular releases | ELK actively developed; elkjs follows upstream regularly |
| **Bundle size** | ~3–5 MB WASM (loaded in worker, not on main thread) | elkjs `elk.bundled` ~1.5 MB (JS only, no WASM dependency) |
| **React integration** | No official React binding; Plexus wraps it | No official React binding; community hooks exist |

### Graphviz Strengths

- **Proven DAG layout**: The `dot` engine's Sugiyama implementation is the reference standard. For strict hierarchies (like trace trees), it rarely produces bad layouts.
- **DOT language expressiveness**: Edge weights, cluster subgraphs, per-node attributes can all be expressed in DOT without writing custom code.
- **Two-phase layout quality**: Plexus's use of `dot` for rank assignment + `neato` for edge spline routing is a sophisticated approach that produces high-quality results for dense graphs.

### Graphviz Weaknesses

- **Limited algorithm variety from Jaeger's code path**: Plexus only uses `dot` and `neato`. The other Graphviz engines (`sfdp`, `circo`, `twopi`) are available in the WASM build but not wired up to any UI control. Users cannot switch algorithms.
- **No layout-direction toggle**: `rankdir` is hardcoded per view. Adding a user-facing toggle requires passing it through multiple layers of Plexus internals.
- **Heavy WASM binary**: The full Graphviz WASM is 3–5 MB. It runs in a worker, so it does not block rendering, but initial load can be slow on constrained connections.
- **Opaque coordinate system**: Graphviz outputs coordinates in DOT points (72 DPI), which Plexus converts to pixels via `convCoord`. This conversion is a source of historical bugs when DPI or scale assumptions differ.

### elkjs Strengths

- **Richer algorithm menu**: `layered`, `stress`, `force`, `mrtree`, `radial`, `box`, `disco`, `fixed` — all accessible by changing a single `'elk.algorithm'` option string. Adding a user-facing layout-algorithm picker requires no architectural changes.
- **Layout direction as a first-class option**: `'elk.direction': 'RIGHT' | 'DOWN' | 'LEFT' | 'UP'` is a top-level JSON option. Changing direction just means passing a different string and re-running the layout — no structural code changes required, making a user-facing toggle trivial to wire up.
- **JSON model aligns naturally with React state**: Nodes and edges are plain JS objects; positions come back as `child.x`, `child.y` that map directly to React state. No DOT serialization/parsing step.
- **Smaller bundle**: `elk.bundled.js` is ~1.5 MB JS (no WASM). It runs synchronously but is async-wrapped; `elkjs/lib/elk-worker.js` provides an official Web Worker variant for offloading layout off the main thread.
- **Compound graph support**: ELK natively supports hierarchical (nested) graphs — relevant if Jaeger ever wants to group spans by service or process within the trace DAG.

### elkjs Weaknesses

- **Edge routing is simpler**: ELK's edge routing is generally good for layered graphs but does not match the spline quality of Graphviz's `neato` post-processing pass for dense graphs.
- **No DOT import**: Existing Plexus integration code builds DOT strings; migrating means rewriting `convInputs.ts` / `toDot.ts` to produce ELK JSON instead.
- **Cycle handling less battle-tested in practice**: Graphviz's cycle-breaking is extremely mature. ELK's is correct but less studied in production.
- **Worker is not the default**: Unlike Plexus (which always runs Graphviz in a worker), the elkjs default is main-thread execution. Adopting it at Jaeger's scale — traces with thousands of spans, dependency graphs with hundreds of services — requires explicitly switching to `elk-worker.js` and managing the worker lifecycle, which adds integration cost.

### Assessment for Jaeger's Two Graph Views

**TraceGraph** (trace DAG, nearly always a strict tree of spans, potentially thousands of spans):
- Both engines produce equivalent layout quality for trees.
- Scale is a first-class concern: traces with thousands of spans are not unusual. Graphviz already runs in a worker in this path; ELK would require an explicit `elk-worker.js` wrapper to match that guarantee.
- ELK's main functional advantage here is the ability to add a **layout-direction toggle** without architectural changes.
- No compelling layout-quality reason to switch; the case rests on DX and future flexibility, against the real cost of adding worker management.

**Service Dependency Graph** (general DAG, may have cycles, potentially hundreds of services):
- Cycles: both engines handle them; Graphviz's `dot` has more community documentation on cycle-breaking behavior.
- Algorithm flexibility: exposing force-directed layout for heavily cyclic or undirected dependency graphs is significantly easier with ELK.
- Scale: a large deployment's service dependency graph can have hundreds of nodes. Graphviz handles this in its existing worker pool; ELK would need `elk-worker.js` to avoid blocking the main thread at that scale.

**Verdict on layout engine**: The case for elkjs is strongest as an *addition* — enabling layout-direction toggles and algorithm selection — rather than a wholesale Graphviz replacement. A pragmatic migration path would add ELK as an option for `DAG.tsx` first, where its algorithm variety is most useful, and evaluate whether Graphviz is still needed afterward.

---

## Part 3: Rendering Layer — Plexus vs `@xyflow/react`

### Plexus Architecture (current)

Plexus implements a **three-phase render pipeline** entirely in ~1,700 lines of custom React + SVG code:

1. **Measure phase** (`CalcSizes`): Renders all nodes invisibly at `(0,0)` to measure their DOM dimensions via refs.
2. **Layout phase** (`CalcPositions`): Sends measured sizes + graph topology to Graphviz (in a Web Worker); receives back node positions and edge Bezier control points.
3. **Render phase** (`Done`): Applies computed positions via CSS `transform: translate(x,y)` on HTML nodes and `transform="translate(x,y)"` on SVG `<g>` elements; renders edges as SVG cubic Bezier paths.

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

**Maintenance status**: Plexus has not had significant feature development in several years. It is stable but effectively in maintenance mode. The Jaeger team bears full ownership of all bugs, React compatibility updates, and feature additions.

### `@xyflow/react` Architecture

`@xyflow/react` (formerly React Flow; ~26,000 GitHub stars, weekly releases) is a React-native graph canvas with a hooks-based API. It manages an internal store for node/edge state, positions, selection, and viewport transforms. The caller provides `nodes[]` and `edges[]` arrays with positions pre-computed; `@xyflow/react` handles all rendering, interaction, and viewport management.

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
- Keyboard navigation and ARIA roles on graph elements (WCAG 2.1 AA)
- Dark/light color mode prop (`colorMode`)
- Animated edges (CSS `stroke-dasharray` animation built-in)
- `fitView()` with padding, duration, and `prefers-reduced-motion` respect

**What `@xyflow/react` does not provide (caller's responsibility):**
- Layout algorithm: the caller must compute `node.position` before passing nodes in. `@xyflow/react` is layout-agnostic; it pairs with any layout engine (elkjs, Dagre, D3-force, manual, etc.).
- The measure-then-layout phase that Plexus handles internally must be replicated if node sizes are dynamic and layout-dependent.

**Typical integration pattern with elkjs:**
- If node dimensions are fixed, the measure phase is unnecessary — ELK receives hardcoded sizes directly.
- ELK runs once per data change (async), then node positions are written into React state.
- `@xyflow/react` receives pre-positioned nodes and renders them; it owns only viewport management and interaction.

### Side-by-Side Comparison

| Dimension | Plexus + Graphviz | `@xyflow/react` + elkjs |
|---|---|---|
| **Codebase owned by Jaeger** | ~1,700 lines (Plexus) + Graphviz WASM | 0 lines of rendering code; layout adapter only |
| **Maintenance burden** | Full ownership | Library updates; breaking-change migration |
| **React compatibility** | Must be manually maintained | Maintained by xyflow team; React 18/19 tested |
| **Node dragging** | Not supported | Opt-in (`nodesDraggable={true}`) |
| **Custom node renderers** | `renderNode` prop (any React component) | Custom `nodeTypes` map (any React component) |
| **Custom edge renderers** | SVG path via Bezier control points from Graphviz | Custom `edgeTypes` map; path helpers available |
| **Edge routing** | Graphviz Bezier splines (high quality for dense graphs) | `getSmoothStepPath` (manhattan), `getBezierPath`, or fully custom |
| **Contextual toolbars** | No built-in primitive; `DAG.tsx` implements one via `setOnNode` click + `position: fixed` overlay | `NodeToolbar` API: built-in, anchored to node, follows zoom/pan automatically |
| **Layout direction toggle** | Requires prop drilling through Plexus internals | Layout engine option; trivial to expose in UI |
| **Algorithm selection** | Requires layout engine changes | Layout engine option; trivial to expose in UI |
| **Minimap** | Built-in (`minimap={true}`) | Built-in (`<MiniMap />`) |
| **Fit-to-view** | `resetZoom()` on `ZoomManager` | `fitView()` on `useReactFlow()` hook; animated |
| **Keyboard / ARIA** | Not implemented | Built-in; keyboard navigation and ARIA roles |
| **Animated layout transitions** | Not supported | CSS transitions on position change; `fitView` animation |
| **Selection** | Click handlers only; no multi-select | Built-in multi-select (shift-click, drag-box) |
| **Bundle size** | d3-zoom ~15 KB + Graphviz WASM ~3–5 MB (worker) | @xyflow/react ~50 KB + elkjs ~1.5 MB (lazy) |
| **Scale — layout off main thread** | Built-in: Graphviz always runs in a Web Worker pool | Requires explicit `elk-worker.js` integration; not the default |
| **Scale — rendering performance** | No virtualization; renders all nodes/edges in DOM | No virtualization by default; `<ReactFlow />` re-renders on every position change — can degrade with thousands of nodes without memoization |
| **Measure-then-layout** | Handled internally by Plexus | Caller's responsibility (not needed if node sizes are fixed) |
| **GitHub stars / community** | Internal library | ~26,000 stars; large ecosystem, many examples |
| **License** | Apache 2.0 (Jaeger) | MIT |

### The Measure-Phase Problem

The most significant architectural gap when moving from Plexus to `@xyflow/react` is the **measure phase**. Plexus automatically renders nodes at `(0,0)`, measures their DOM sizes, passes those sizes to Graphviz, and only then renders nodes at final positions. This means node content can be arbitrary React with dynamic text, and the layout engine receives accurate bounding boxes.

`@xyflow/react` has no built-in equivalent. It renders nodes at whatever positions the caller provides.

For Jaeger's use cases:
- **TraceGraph** nodes (`OpNode.tsx`) contain multi-line service/operation text with variable widths. Sizes are not fixed. Migrating would require either: (a) pre-measuring nodes in a hidden pass before calling ELK, or (b) switching to fixed node dimensions and truncating long labels — which is a UX regression.
- **DAG** nodes are simpler (service name + call count badge) but still variable-width.

This is a **real migration cost**, not a theoretical one. It would require building a custom `useMeasureNodes` hook that renders nodes invisibly, measures them via `ResizeObserver` or `getBoundingClientRect`, feeds sizes to ELK, and then re-renders with positions — essentially recreating a subset of what Plexus does today.

Alternatively, fixing node dimensions to a maximum width with text truncation + tooltip would eliminate the measure phase entirely (the fixed-dimension approach), but that changes the visual design.

### Assessment for Jaeger's Two Graph Views

**TraceGraph** (trace spans as nodes):
- High migration cost due to variable node sizes.
- Primary gains would be: NodeToolbar for per-span actions (currently triggered via click), layout-direction toggle, and reduced maintenance burden.
- The existing Plexus rendering for TraceGraph is well-optimized and not a pain point.
- **Recommendation**: Low priority for migration; the measure-phase complexity outweighs the benefits unless node-drag or rich toolbar UX becomes a requirement.

**Service Dependency Graph** (service names as nodes):
- Moderate migration cost. Service name nodes *could* be given a fixed maximum width, eliminating the measure phase.
- Primary gains would be: layout-direction toggle, algorithm selection (force-directed for heavily cyclic graphs), and keyboard accessibility. The existing `position: fixed` context menu works; `NodeToolbar` would be a cleaner implementation since it anchors to the node and follows zoom/pan automatically, but is not a functional gap.
- The existing `DAG.tsx` context menu (Set focus / View traces) is the most user-interactive part of any Jaeger graph view; `NodeToolbar` would be a natural fit.
- **Recommendation**: Moderate priority; a fixed-width node design makes migration feasible and the UX improvements are visible.

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
- ECharts remains fluid at **5,000–10,000 node** graphs in benchmarks where SVG renderers have already degraded.
- For the TraceGraph use case — traces with thousands of spans — this is the most significant advantage ECharts offers over the current stack.
- ECharts also supports [large-graph progressive rendering](https://echarts.apache.org/en/option.html#series-graph.progressive) to incrementally draw elements frame-by-frame, avoiding a single long paint.

The SVG renderer (opt-in via `{ renderer: 'svg' }` at init time) sacrifices the scale advantage but enables DOM-level accessibility and CSS theming. It is generally used only when vector export or screen reader support is required.

### Node Rendering Complexity: An Honest Per-View Assessment

The claim that Jaeger's nodes require "rich React components" needs to be examined against what each view actually renders.

**Service Dependency Graph (`DAG.tsx`)** — `renderNode` produces a colored circle (`DAG--nodeCircle`) and a text label. This is natively expressible as an ECharts canvas symbol + label with no loss of fidelity. **Canvas-compatible as-is.**

**Deep Dependency Graph (`DdgNodeContent`)** — A circular node whose radius is computed dynamically from service and operation text length, with the text centred inside. Additionally carries a decoration progress-bar arc and an always-visible `ActionsMenu` attached below the circle. The variable radius based on content is awkward for canvas (ECharts symbol size is uniform or data-driven by a scalar, not text-flow-dependent), and the always-on action menu has no canvas equivalent. **Not straightforward to port.**

**TraceDiff (`DiffNode`)** — A 2×2 table: change-count metric | service name; percentage metric | operation name. Color-coded by diff state (added/removed/changed/same). This is more data than a bare label, but all of it is static text with a background color — representable as a canvas `rect` symbol with a label and `itemStyle.color`, with the metric details moved to a tooltip. **Canvas-compatible with minor simplification.**

**TraceGraph (`OpNode.tsx`)** — The 3×2 metrics table: count/errors | **service** | avg-time; duration+% | operation | self-time+%. Background color encodes the selected mode (service color, time heatmap, self-time heatmap). The node is also wrapped in an antd `Popover` whose content is the same table — so the tooltip currently adds nothing beyond what is already visible in the node body.

This is the node the user called out: six metric cells displayed in the node body itself make each node large and the graph harder to read. In canvas terms, the color-encoding (the most information-dense part) maps directly to `itemStyle.color`; service and operation names map to a two-line label; the six metrics are better placed in a tooltip. **Canvas-compatible with a deliberate simplification that is arguably a UX improvement, not a regression.**

### ECharts Weaknesses for Jaeger's Use Cases

- **Node content that genuinely requires HTML**: `DdgNodeContent` (Deep Dependency Graph) uses a variable-radius circle sized to fit its text, an always-visible action menu attached to the node, and a decoration progress-bar arc. None of these translate cleanly to a canvas symbol. This view is the hardest to migrate.
- **No built-in hierarchical layout**: External layout engine still required (Graphviz or elkjs) for the DAG and trace views. ECharts handles layout only for force and circular; for everything else `layout: 'none'` is used with pre-computed positions.
- **Imperative API mismatch with React**: ECharts is fundamentally an imperative library (`setOption`, `getZr`, event listeners). `echarts-for-react` hides some of this but the mental model remains options-object-driven rather than declarative React. Incremental updates require diffing option objects, not state.
- **Edge routing is basic**: No manhattan/smooth-step routing. Edges are straight lines or simple curves (`curveness` parameter). Dense graphs with many crossing edges will look worse than Graphviz's `neato` post-processing.
- **No layout direction toggle**: The built-in `tree` series supports `orient: 'LR' | 'TB'`, but for `layout: 'none'` the direction is determined entirely by the external layout engine, same as any other option.
- **Theming**: Canvas rendering does not inherit CSS custom properties. Dark mode and design token theming require explicitly passing color values into the ECharts options object rather than relying on CSS variables.

### Summary Table

| Dimension | Plexus + Graphviz | `@xyflow/react` + elkjs | Apache ECharts |
|---|---|---|---|
| **Rendering backend** | SVG + HTML DOM | SVG + HTML DOM | **Canvas** (SVG opt-in) |
| **Scale ceiling (rendering)** | ~hundreds of nodes before DOM pressure | ~hundreds–low thousands with memoization | **Thousands of nodes** without virtualization |
| **Custom node content** | Full React components | Full React components | Canvas symbols + label only; no React subtrees in nodes |
| **Built-in hierarchical layout** | Via Graphviz (worker) | No — needs elkjs | No — needs external engine |
| **React integration** | React-native (Plexus) | React-native | Imperative wrapper via `echarts-for-react` |
| **Node dragging** | No | Opt-in | Force layout only |
| **Edge routing quality** | High (Graphviz `neato` splines) | Medium (smooth-step, bezier) | Low (straight lines or simple curves) |
| **Contextual UI (toolbars)** | Custom overlays | `NodeToolbar` API | Custom overlays via `convertToPixel` |
| **Accessibility / ARIA** | Not implemented | Built-in (WCAG 2.1 AA) | Canvas: none; SVG renderer: partial |
| **CSS / design token theming** | CSS variables work | CSS variables work | Must pass colors into options object |
| **Maintenance** | Jaeger-owned | xyflow team (active) | Apache TLP, very active |
| **Bundle size** | ~3–5 MB WASM (worker) | ~1.6 MB total (lazy) | ~1 MB tree-shaken; ~2.5 MB full build |
| **License** | Apache 2.0 | MIT | Apache 2.0 |

### Assessment for Jaeger's Two Graph Views

**TraceGraph** (thousands of spans):
- This is the view where ECharts' canvas backend offers a real advantage — if rendering performance at high span counts is a confirmed problem.
- `OpNode.tsx`'s 3×2 metrics table in the node body is the main obstacle, but as noted above, the color encoding and service/operation label translate cleanly to canvas; the six metric cells are better in a tooltip anyway. The antd `Popover` wrapping the node (which shows the same table as a popover) would simply become an ECharts `tooltip`. This is a design simplification, not a regression.
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
- Cost: moderate; requires writing an ELK adapter that maps Plexus's `TSizeVertex[]` + `TEdge[]` to ELK JSON and back, **plus wiring up `elk-worker.js`** to maintain off-main-thread layout — a prerequisite, not optional.
- Risk: low; Plexus API is unchanged.

### Path B: Rendering layer only (Plexus → @xyflow/react, keep Graphviz)
- Replace Plexus with `@xyflow/react`; keep Graphviz for layout (run it outside of Plexus, feed positions in).
- Gains: `NodeToolbar`, ARIA, `fitView` animation, reduced rendering maintenance.
- Cost: high for `TraceGraph` (measure phase); moderate for `DAG` (fixed-width nodes viable).
- Risk: moderate; `@xyflow/react` API churn (v11 → v12 had breaking changes).

### Path C: Full stack replacement (Plexus + Graphviz → @xyflow/react + elkjs)
- Replace both rendering and layout for one or both graph views.
- Gains: all of the above; eliminates Plexus entirely.
- Cost: highest; requires measure-phase solution for `TraceGraph`, full re-testing.
- Risk: moderate-high; two simultaneous library changes are harder to debug.

### Path D: ECharts for TraceGraph (scale-motivated)
- Replace Plexus rendering for `TraceGraph` with ECharts `graph` series using `layout: 'none'` and externally-computed positions (Graphviz or elkjs).
- Gains: canvas rendering handles thousands of spans without DOM pressure; progressive rendering available.
- Cost: high; requires replacing `OpNode.tsx` HTML nodes with canvas primitives or building a DOM overlay system, plus the imperative ECharts API integration.
- Risk: high; significant UX regression risk on node content fidelity. Only justified if TraceGraph rendering performance is a confirmed, measured problem at real-world span counts.

**Pragmatic starting point**: Path A for `DAG.tsx` is the lowest-risk improvement with the most user-visible payoff (layout-direction toggle, force-directed mode for cyclic graphs). It validates the ELK integration before committing to rendering changes. Path D should only be considered after profiling confirms a rendering bottleneck that memoization cannot solve.

---

## Open Questions

1. **Are fixed-width nodes acceptable for `TraceGraph`?** If yes, the measure-phase obstacle to full migration disappears. The UX trade-off is label truncation vs. layout fidelity.
2. **Is node dragging a desired feature?** If so, `@xyflow/react` is the only path; adding drag to Plexus would be a major rewrite.
3. **What is the practical scale ceiling for each view?** TraceGraph already handles traces with thousands of spans; Plexus's Web Worker model makes that feasible today. Any ELK migration must include the `elk-worker.js` wrapper from day one — not as a follow-up. For `@xyflow/react` rendering, it would be worth benchmarking rendering performance at 500–2,000 nodes to confirm whether per-node memoization is sufficient or whether viewport-based virtualization (available via third-party `@xyflow/react` plugins) is needed.
4. **Is the Plexus multi-layer system (SVG + HTML) needed?** `@xyflow/react` does not have a direct equivalent to Plexus's layered rendering. `TraceGraph` uses SVG layers for node-find emphasis; this would need to become a custom node renderer concern.
5. **Would a layout-direction toggle alone justify the ELK migration?** This is the highest-value, lowest-cost change and could be shipped independently under Path A.
6. **Is TraceGraph rendering performance actually a bottleneck at real-world span counts?** ECharts' canvas backend is only worth the migration cost if profiling shows that SVG/DOM rendering — not layout computation — is the limiting factor. If layout is the bottleneck, the worker model (Graphviz or ELK) is where to invest; if rendering is, ECharts becomes relevant.
