# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Jaeger UI project. An ADR captures an architectural decision that has already been taken — the context that forced it, the decision itself, and its consequences — or documents the design of an implementation that already exists, so that later contributors can see why the UI looks the way it does.

Proposals that have not been decided yet belong in [`docs/rfc/`](../rfc/) instead; that README carries the [ADR or RFC?](../rfc/README.md#adr-or-rfc) comparison.

## ADRs in This Repository

- [ADR-0001: Design Token-Based Theming Architecture](./0001-design-token-based-theming.md) - Dark mode and theming are implemented with CSS custom properties in a single token file rather than component-level theme selectors.
- [ADR-0002: OTEL Facade and the `api/v3` Client](./0002-otlp-api-v3-migration.md) - Components consume an `IOtelTrace` / `IOtelSpan` interface applied where a trace enters the TanStack Query cache, and `/api/v3/` responses are validated against generated Zod schemas. Graduated from [RFC 0002](../rfc/0002-otel-native-jaeger-ui.md), which tracks the remaining migration.
- [ADR-0003: Span Color Palette for Trace Visualization](./0003-span-color-palette.md) - A theme-aware 20-color IBM Carbon palette exposed as `--span-color-N` tokens, with `ColorGenerator` returning `var()` references instead of hex values. Graduated from [RFC 0003](../rfc/0003-span-color-palette.md).
- [ADR-0004: State Management Strategy for Jaeger UI](./0004-state-management-strategy.md) - Zustand for shared client UI state and TanStack Query for server state, replacing Redux; chosen for selective subscriptions at 50,000-span scale. Graduated from [RFC 0004](../rfc/0004-state-management-strategy.md), which tracks the migration.
- [ADR-0005: Current State Management Architecture](./0005-current-state-management-architecture.md) - Snapshot of the multi-layered state management as of July 2026: TanStack Query, Zustand, URL, localStorage, and the residual Redux; to be superseded once Redux is gone.
- [ADR-0006: Side Panel Span Details and Tree-Only Mode](./0006-side-panel-span-details.md) - Optional side panel layout for span details with independent scrolling, and tree-only mode to hide timeline bars.
- [ADR-0007: Vite+ Toolchain](./0007-vite-plus-migration.md) - The monorepo builds with Vite/Rolldown, tests with Vitest, lints with Oxlint and formats with Oxfmt, all configured from the root `vite.config.ts`; Webpack, Babel, ESLint, Prettier, and Jest are gone. Graduated from [RFC 0005](../rfc/0005-vite-plus-migration.md).
- [ADR-0008: Target state management architecture](./0008-target-state-management-architecture.md) - Misfiled proposal; content moved to [RFC 0006](../rfc/0006-target-state-management-architecture.md).
- [ADR-0009: Service Filter for Trace Timeline View](./0009-service-filter-trace-timeline.md) - Filter button in the Services column to prune spans by service, with subtree pruning, hex bitmask URL encoding, and localStorage defaults.
- [ADR-0010: Layout Settings Priority Stack](./0010-layout-settings-priority-stack.md) - Misfiled proposal; content moved to [RFC 0007](../rfc/0007-layout-settings-priority-stack.md).
- [ADR-0011: Exporting UI-Emitted Traces Back to Jaeger](./0011-ui-emitted-trace-ingest.md) - Browser exports OTLP/HTTP same-origin to the `/api/otlp/v1/traces` proxy in `jaeger-query` ([jaeger#8740](https://github.com/jaegertracing/jaeger/pull/8740)); Phase 1 UI instrumentation (document-load + fetch + page attribution) implemented.

## Lifecycle

An ADR is a record, not living documentation. It is written once — when the decision is taken, or when an existing design is being written down — and is not maintained afterwards as the code evolves. When a decision is revisited, write a new ADR stating the new decision and mark the old one superseded rather than editing the old record.

An ADR can also arrive by [graduation from an RFC](../rfc/README.md#graduating-into-an-adr): once an RFC's work is fully delivered and the resulting architecture is worth an enduring reference, the outcome is captured in a fresh ADR stating the resulting design, while the RFC stays as the record of how it was arrived at. The two point at each other through their `Status` fields. [ADR-0003](0003-span-color-palette.md), graduated from [RFC 0003](../rfc/0003-span-color-palette.md), is the example.

The same split can run in the other direction, for a document filed here that was really a proposal: the proposal content is extracted into a new RFC and the ADR is rewritten in place, keeping its number, as a record of the resulting implementation. [ADR-0007](0007-vite-plus-migration.md) and [RFC 0005](../rfc/0005-vite-plus-migration.md) came apart that way — see the historical note below. Where the proposal had not been implemented at all, there was no outcome to record, and the ADR is reduced to a pointer at the RFC that now holds the content.

## Conventions

- File name `NNNN-short-slug.md`, next number in sequence; title `# ADR-NNNN: Title`.
- Header block immediately under the title, as a **bulleted list** — one `* **Field**: value` item per field, never bare bold lines:

  ```markdown
  # ADR-0012: Title

  * **Status**: Implemented
  * **Date**: 2026-07-28
  ```

  `Status` and `Date` are required; add `Tracking Issue`, `Delivered by`, or `Related` items where useful. Statuses in use: Accepted, Implemented, Documented existing implementation, Superseded.
- Sections: Context, Decision, Consequences — plus Alternatives Considered and References where relevant.
- Add an entry to the index above.

## Historical Note

This directory came first and, for its first four months, held both decision records and forward-looking proposals. Six of the early entries carried content that belongs in an RFC: 0002, 0003, 0004, 0007 and 0010 were proposals outright, and 0008 described a target architecture that did not exist yet while instructing readers to keep editing it as the codebase caught up.

[`docs/rfc/`](../rfc/) was added on 2026-04-21 for the proposal role, but neither README said which genre belonged where, so this did not stop: ADR-0010 was filed here as a five-PR plan three weeks later. That is why the two READMEs now define their genres and cross-reference each other.

All six have since been split, with the proposal content moved to an RFC:

| Was | Proposal now at | What remains here |
| --- | --- | --- |
| ADR-0002 | [RFC 0002](../rfc/0002-otel-native-jaeger-ui.md) | [ADR-0002](0002-otlp-api-v3-migration.md) — record of the OTEL facade and the `api/v3` client |
| ADR-0003 | [RFC 0003](../rfc/0003-span-color-palette.md) | [ADR-0003](0003-span-color-palette.md) — record of the palette that shipped |
| ADR-0004 | [RFC 0004](../rfc/0004-state-management-strategy.md) | [ADR-0004](0004-state-management-strategy.md) — record of the Zustand + TanStack Query decision |
| ADR-0007 | [RFC 0005](../rfc/0005-vite-plus-migration.md) | [ADR-0007](0007-vite-plus-migration.md) — record of the resulting toolchain |
| ADR-0008 | [RFC 0006](../rfc/0006-target-state-management-architecture.md) | [ADR-0008](0008-target-state-management-architecture.md) — pointer only; nothing was decided here |
| ADR-0010 | [RFC 0007](../rfc/0007-layout-settings-priority-stack.md) | [ADR-0010](0010-layout-settings-priority-stack.md) — pointer only; none of its five PRs landed |

No ADR is renumbered, and every ADR path above still resolves — only the proposal *content* moved. ADR numbers and paths are cited from [`BUILD.md`](../../BUILD.md), from CHANGELOG entries and merged PR titles (`[adr-0006] phase 3…`, `adr-004 2d`), and from issues and PRs outside this repo, so retiring a path silently breaks references we do not control. Each document's own Status field says where it actually stands. New proposals go to [`docs/rfc/`](../rfc/).
