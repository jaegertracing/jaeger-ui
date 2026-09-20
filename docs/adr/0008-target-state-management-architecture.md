# ADR-0008: Target state management architecture

* **Status**: Not an ADR — moved to [RFC 0006](../rfc/0006-target-state-management-architecture.md)
* **Date**: 2026-04-09

This number was used for a document describing where each kind of state *should* live once Redux is gone, and instructing readers to keep editing it as the codebase caught up. That is a proposal and a living design note, not a record of a decision taken, so the content now lives at [RFC 0006: Target State Management Architecture](../rfc/0006-target-state-management-architecture.md).

Nothing was decided under this number, so there is no outcome to record here. The file is kept because `ADR 0008` is cited from elsewhere in the repo and from PRs outside it. See the [historical note](./README.md#historical-note) for the other five documents split the same way.

For state management, the three documents that carry content are:

- [ADR-0004](./0004-state-management-strategy.md) — the decision: Zustand for client UI state, TanStack Query for server state.
- [ADR-0005](./0005-current-state-management-architecture.md) — how the code is actually wired today.
- [RFC 0006](../rfc/0006-target-state-management-architecture.md) — the target architecture, formerly this document.
