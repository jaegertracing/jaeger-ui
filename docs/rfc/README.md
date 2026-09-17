# Request for Comments (RFCs)

This directory contains Request for Comments (RFC) documents for the Jaeger UI project. An RFC describes a problem, surveys the solution space, and proposes a concrete approach — so that the approach can be discussed and revised before it is built. RFCs are the starting point for new design work in Jaeger UI; decisions that have already been taken are recorded as ADRs in [`docs/adr/`](../adr/).

## ADR or RFC?

Write an RFC when the work has not been decided yet. Write an ADR when you are recording an outcome — a decision already taken, or a design already in the code.

| | RFC (this directory) | [ADR](../adr/) |
| --- | --- | --- |
| **Purpose** | Propose an approach and invite comment before building it | Record a decision already taken, or document a design already in the code |
| **Written** | Before the work | At or after the decision |
| **Voice** | "We propose to…", alternatives weighed, one recommended | "We decided…" / "This is how it works", with consequences |
| **Typical sections** | TL;DR, Context, Design, Alternatives, Implementation Plan | Context, Decision, Consequences |
| **Maintenance** | Prose frozen after merge; Status and milestone tracking kept current | Frozen after merge |
| **End state** | Implemented (optionally graduating into an ADR), Superseded, or abandoned | Superseded by a later ADR |

Both directories number their documents `NNNN-slug.md`, so which genre a document is comes from the directory it sits in, not from its number. The two sequences are independent: an RFC and an ADR may share a number without being related.

## RFCs in This Repository

- [RFC 0001: Jaeger UI as an Embedded Web Component](./0001-embedded-web-component.md) - Extending Jaeger UI from an SPA into a reusable Custom Element with Shadow DOM isolation, with a Grafana panel plugin as the reference integration
- [RFC 0002: Making Jaeger UI OpenTelemetry-Native](./0002-otel-native-jaeger-ui.md) - A facade over the legacy data model, incremental component migration to OTEL nomenclature, then a switch to `/api/v3/` OTLP endpoints; extracted from ADR-0002, which records the facade design that resulted
- [RFC 0003: Span Color Palette for Trace Visualization](./0003-span-color-palette.md) - IBM Carbon, Grafana Classic, and Tableau 20 weighed as a theme-aware 20-color span palette; extracted from ADR-0003, which records the outcome
- [RFC 0004: State Management Strategy for Jaeger UI](./0004-state-management-strategy.md) - React Context, Zustand, and Redux Toolkit weighed at 50,000-span scale, recommending Zustand + TanStack Query, plus the phased checklist for removing Redux; extracted from ADR-0004, which records the decision
- [RFC 0005: Migrate to Vite+ (Full Vite Toolchain)](./0005-vite-plus-migration.md) - Per-PR plan for replacing Webpack, Babel, ESLint, Prettier, and Jest with Rolldown, Oxlint, Oxfmt, and Vitest, and the unknowns resolved along the way; extracted from ADR-0007, which records the resulting toolchain
- [RFC 0006: Target State Management Architecture](./0006-target-state-management-architecture.md) - Where each kind of state should live once Redux is gone: target data flows, the URL mapping pattern, and the intended Zustand store shapes; extracted from ADR-0008
- [RFC 0007: Layout Settings Priority Stack](./0007-layout-settings-priority-stack.md) - Cascading `URL > heuristics > localStorage` resolution for trace-view layout settings, so opening a shared link cannot overwrite the recipient's saved preferences; extracted from ADR-0010
- [RFC 0008: Graph Visualization Stack](./0008-graph-visualization-stack.md) - Plexus + `@viz-js/viz` (current) weighed against `@xyflow/react` + `elkjs` and Apache ECharts for the trace DAG and service dependency graph views, across layout quality, node interactivity, scale, and migration cost; recommends adding the missing layout controls in place and migrating the service dependency graph to `@xyflow/react` first, rejects ECharts, and sets out the spikes that would confirm or sink the plan

## Lifecycle

An RFC starts as a proposal, open to comment and revision. Once its approach is adopted, the RFC doubles as the **plan of record for the work**: it decomposes the implementation into independently shippable milestones — in an `Implementation Plan` or `Roadmap` section, and for longer-running efforts a status summary near the top — and that decomposition is where delivery is tracked.

At the same time, the RFC's narrative is a point-in-time snapshot of the system and the plan as of when it was written, and is read that way later. Those two roles pull in opposite directions, and the split is resolved by editing a merged RFC in one way only:

- **Keep the delivery tracking current.** As each milestone lands, mark it ✅ and link the PR that delivered it, and update the top-level `Status` field — done by the PR implementing the milestone, in that same PR. [RFC 0002](./0002-otel-native-jaeger-ui.md) annotates its milestones in place; [RFC 0004](./0004-state-management-strategy.md) keeps a phase checklist. Both shapes are fine.
- **Leave the prose alone.** Do not rewrite the TL;DR, design sections, code sketches, or diagrams to track the evolving codebase. A sketch the implementation departed from is evidence of what was proposed and is worth keeping — annotate the divergence rather than deleting the sketch. When the design changes materially, supersede the RFC with a new one instead of editing the old one into agreement with the code.

### Graduating into an ADR

Once an RFC's work is fully delivered, mark it Implemented. An implemented RFC is still a proposal document, though — it carries the whole trade-off analysis and the milestone-by-milestone history, which is not what a reader wanting to know how the system works today should have to wade through. So if the resulting architecture is worth an enduring reference, graduate it: capture the outcome in a fresh [ADR](../adr/) that states the resulting design, and leave the RFC as the record of how that design was arrived at. Do not mutate the RFC into documentation.

The two documents then point at each other through their `Status` fields — the RFC's says "graduated into ADR-NNNN", the ADR's says "graduated from RFC NNNN" — so a reader landing on either one finds the other. [RFC 0003](./0003-span-color-palette.md) → [ADR-0003](../adr/0003-span-color-palette.md) is the worked example: the RFC weighs three candidate palettes, the ADR describes the one that shipped.

Graduation is optional and not the only end state. An RFC may also be superseded by a later RFC, or simply abandoned — in both cases it stays in this directory as a record of what was considered.

## Conventions

- File name `NNNN-short-slug.md`, next number in sequence; title `# RFC NNNN: Title`.
- Header block immediately under the title, as a **bulleted list** — one `* **Field**: value` item per field, never bare bold lines:

  ```markdown
  # RFC 0008: Title

  * **Status**: Draft
  * **Created**: 2026-07-28
  * **Last Updated**: 2026-07-28
  ```

  `Status`, `Created`, and `Last Updated` are required; add `Tracking Issue`, `Related`, or `Supersedes` items where applicable. Statuses in use: Draft, Partially Implemented, Implemented, Superseded.
- Open with a TL;DR, then Context, Design, Alternatives Considered, and an Implementation Plan.
- Add an entry to the index above.
