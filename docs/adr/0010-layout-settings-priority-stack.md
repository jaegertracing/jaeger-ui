# ADR-0010: Layout Settings Priority Stack

* **Status**: Not an ADR — moved to [RFC 0007](../rfc/0007-layout-settings-priority-stack.md)
* **Date**: 2026-05-10

This number was used for a proposal to resolve trace-view layout settings through a `URL > heuristics > localStorage` priority stack, so that opening a shared link cannot overwrite the recipient's saved preferences. The content now lives at [RFC 0007: Layout Settings Priority Stack](../rfc/0007-layout-settings-priority-stack.md).

None of the five PRs it planned has landed, so there is no implementation to record here. The file is kept because `ADR-0010` is cited from PRs outside this repo. See the [historical note](./README.md#historical-note) for the other five documents split the same way.

The problem the proposal describes is still live: the setters on `useLayoutPrefsStore` write to `localStorage` unconditionally, so a URL-driven layout change does still overwrite the recipient's defaults.
