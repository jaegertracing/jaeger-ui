# ADR-0012: Span Search and Filter on the Trace Page

* **Status**: Implemented — graduated from [RFC 0009](../rfc/0009-trace-span-search-and-filter.md)
* **Date**: 2026-11-10
* **Related**: [ADR-0009](./0009-service-filter-trace-timeline.md), which this ADR supersedes

## Context

The trace page narrows a trace in two ways. The search input in the page header highlights the spans whose text matches, and the funnel in the "Service & Span Name" column header hides spans. Until [RFC 0009](../rfc/0009-trace-span-search-and-filter.md) the funnel hid spans by service only, with the subtree-pruning behaviour that [ADR-0009](./0009-service-filter-trace-timeline.md) records, and every request to hide spans by something else (status, span kind, GenAI span type, duration, an attribute) had to extend either the search or the service filter. The RFC proposed one vocabulary of criteria and three verbs, and this ADR records the design that shipped.

## Decision

### Criteria, verbs and clauses

`TracePage/spanFilter.ts` holds the vocabulary. A **criterion** is a predicate over one span, with four shapes: free text with the semantics of `filterSpans`, a value set over a span property (service, status, span kind, span type), a numeric range over the span duration or its GenAI token usage, and an attribute `key:value` substring. A **clause** applies a **verb** to a criterion: `keep` hides the spans that do not match, and `hide` hides the spans that do. The find verb is the typed text of the search input, which highlights the matching spans and never takes a chip form. A **span filter** is the clause list plus a **tree mode**. `evaluateSpanFilter(spans, filter)` runs once over the pre-order span list and returns the hidden span IDs and the find matches, memoized on its inputs, so the row generation, the critical path and the search count consume sets of span IDs and never know which clause hid a span.

The search input remains the find verb for free text. Every clause is a chip in the popover, and in the timeline views the match count of the search bar reports the visible find matches, a warning beside it says how many matches the filter hides, and the popover's "N of M spans shown" count reports what the filter hides overall.

### Tree mode

The tree mode decides what happens to the children of a hidden span. **Remove with it** is the subtree pruning of ADR-0009, with its "N spans pruned, M errors" placeholder row. **Lift to its parent** is the default, because it is the mode in which every control works, and it skips the hidden span alone: its visible children are drawn under its nearest visible ancestor, a lifted row carries a connector glyph whose hover names the hidden spans it was lifted past, and a hidden span's errors and critical-path segments are credited to that ancestor, or dropped when no ancestor is visible. `generateRowStates` builds a `VisibleTree` for lift mode once per span list and hidden set, and the indent guides read the visible parent and the collapse actions the visible child count from it; the match navigation walks the span parents past the hidden IDs. A keep clause only makes sense in lift mode, because in remove mode a root that fails the criterion takes the whole trace with it, so the controls that create a keep clause are disabled while the mode is Remove.

### Controls

The search input, its count, the previous, next and locate buttons and the funnel form one cluster in the page header; the funnel also stays in the column header, and both open a popover with the same content. A menu inside the input converts the current text into a keep or hide chip. The popover lists the active chips, each with a verb icon that toggles it between keep and hide, disabled with an explanation when remove mode forbids keep, and a remove control, then the tree mode, a status control, a duration histogram and a token histogram, each with range handles on a logarithmic axis and drawn only when the values differ on that axis, an attribute input, and value lists for span type, span kind and service with a bar per value and the two verb icons as row actions; the status control and each value list are drawn only when there is more than one value to choose from. Counts and histograms are computed over the whole trace once, so a bar says what acting on it would do. Up to `traceTimeline.filterApplyThreshold` spans (10k by default) every edit applies as it is made; above it the list rows, the status control, the histograms and the attribute input wait for Apply, while chip edits, the tree mode, Clear all and Save as Default apply at once. An edit that would hide every service, or every root service in remove mode, is held back with a warning, and the row of a sole root service is locked.

### URL and persistence

The text stays in `uiFind`. Every clause, the service hide set included, is one repeated `f=<verb>:<property>:<value>` parameter, and remove mode is `tree=remove`. The `svcFilter` parameter of ADR-0009 is a legacy encoding: it is read as the hide clause on service in remove mode, the mode it was written under, unless the URL names a mode, and the URL is rewritten as `f`, so that an existing link renders as it did. A value in the URL wins. The saved service default from Save as Default and the view default both apply only while the URL states no filter, that is, while it carries neither `f` nor a legacy `svcFilter`; `tree` alone sets the mode of whichever default applies. The two defaults govern different clauses and apply together, except that a default which would leave no span is not applied, the view default first and then the saved default. Every edit, and the rewrite of a legacy or sanitized `svcFilter`, leaves the URL stating the filter, an empty clause list as an explicitly empty `f=`, so that neither default returns on a later render and a view switch keeps the selection the user has. The GenAI view of a GenAI trace defaults to hiding the `Non-GenAI` span type in lift mode, which is the GenAI logical view.

## Consequences

- One vocabulary serves the search, the filter and the GenAI view, and a new criterion is a shape in `spanFilter.ts` plus a control in the popover rather than a new URL parameter and a new code path.
- The service filter of ADR-0009 survives as the hide clause on service, with the same root protection in remove mode and the same saved default; its `svcFilter` encoding is read as legacy and rewritten as `f`.
- Lift mode has no placeholder row, so a reader sees that rows were lifted from the connector glyph and its hover text, the hidden-errors badge and the shown count in the popover.
- Counts and histograms ignore the other chips: the bar next to a service is the trace total, not the count after the other clauses apply.
- The Graph, Statistics and Spans Table views receive the search text only, the Flamegraph and Logs views receive neither, and none of them hides spans.

## References

- [RFC 0009: Find, Keep and Hide: One Criterion Vocabulary for Spans in the Trace View](../rfc/0009-trace-span-search-and-filter.md) — the trade-offs and the plan this design came from
- [ADR-0009: Service Filter for Trace Timeline View](./0009-service-filter-trace-timeline.md) — the service filter this design subsumes
