# ADR-0002: OTEL Facade and the `api/v3` Client

* **Status**: Implemented — graduated from [RFC 0002](../rfc/0002-otel-native-jaeger-ui.md), which tracks the remaining migration
* **Date**: 2025-12-29
* **Tracking Issue**: [#3265](https://github.com/jaegertracing/jaeger-ui/issues/3265)

## Context

Jaeger UI was built against the legacy Jaeger JSON model — `tags`, `process`, `logs`, `operationName`, and a `references` array — and Jaeger's own data model has since become OTLP. Continuing to speak the legacy vocabulary meant every new contributor had to learn a translation layer that exists nowhere else in the ecosystem, and every semantic-convention feature had to be expressed in terms that do not match the spec.

Rewriting the UI against OTLP in one step was not viable: the trace data model is threaded through the timeline, the graph views, search, and diff. But an audit found that most components touch only a small part of a span, which makes the migration divisible.

[RFC 0002](../rfc/0002-otel-native-jaeger-ui.md) proposed the four-phase approach and remains the plan of record for what is still outstanding. This ADR records the interface, loading paths, and client boundary that new code uses.

## Decision

### Components consume an OTEL interface, not the legacy model

`src/types/otel.ts` defines the interface the UI programs against — `IOtelTrace`, `IOtelSpan`, `IAttribute`, `IResource`, `IScope`, `IEvent`, `ILink`, `IStatus`, and the `SpanKind` / `StatusCode` enums. It uses OTEL vocabulary throughout, and also carries the derived properties the UI needs and OTLP does not have (`depth`, `hasChildren`, `relativeStartTime`, `childSpans`).

| Legacy Jaeger | This interface | Note |
| --- | --- | --- |
| `tags` | `attributes` | |
| `process` | `resource` | `resource.serviceName` is a convenience accessor |
| `logs` | `events` | Semantic events, not log lines |
| `operationName` | `name` | |
| `KeyValuePair` | `IAttribute` | Typed values |
| `references` | `parentSpanID` + `links` | Parent relation split out from other references |

The legacy reference types carried two meanings at once: `CHILD_OF` versus `FOLLOWS_FROM` expressed both parentage and whether the child blocked its parent. OTEL represents parentage explicitly as `parentSpanID` and does not encode blocking at all, so blocking is inferred from span kind instead — a `PRODUCER`/`CONSUMER` pair is non-blocking and stays off the critical path, while `INTERNAL`, `CLIENT`, and `SERVER` are treated as blocking. Any code reasoning about critical path or causality must use this rule rather than looking for reference types.

### Native loading and uploads enter the same Query cache

`hooks/useTraceLoading.ts` loads backend traces through `JaegerClient.fetchTrace` and enriches the validated wire data with `parseOtelTrace` (#4605). `useTrace` returns `UseQueryResult<IOtelTrace>`; `useTraces` retains the `Map<string, FetchedTrace>` shape used by TraceDiff and the Search-results Deep Dependency Graph.

The hooks convert supported short hex and base64 ID aliases to the v3 request format with `utils/trace-id.ts`. Query keys remain `['trace', originalId]`, and a response also seeds the canonical ID when it differs. The parser preserves GenAI classification.

Structural sharing is disabled in both hooks and the shared client's `['trace']` query defaults because enriched traces have cyclic `parentSpan` / `childSpans` references. The defaults also cover entries created by alias caching or `populateTraceCache` before a hook observes them.

Uploads still use the legacy conversion path. `utils/readJsonFile.ts` sends OTLP files to `/api/transform`, and `SearchTracePage/FileLoader.tsx` calls `transformTraceData(...).asOtelTrace()` before populating the cache. `OtelTraceFacade` and `OtelSpanFacade` remain for this path and existing test fixtures until native uploads and parity work are complete.

Components consume `IOtelTrace` / `IOtelSpan` without constructing facades. Trace state lives in the Query cache ([ADR-0004](./0004-state-management-strategy.md)).

### `/api/v3/` responses are validated against generated schemas

`src/api/v3/client.ts` (`JaegerClient`) is the client for the OTLP endpoints. `src/api/v3/generated-client.ts` holds Zod schemas generated from Jaeger's OpenAPI spec via `pnpm run generate:api-types` and post-processed by `scripts/postprocess-schemas.cjs`. `schemas.ts` exports stable aliases and adds wire-encoding refinements. `fetchTrace` validates the response envelope and returns `TracesDataWire` for the parser, so malformed data fails at the network boundary.

When the spec changes, regenerate `generated-client.ts`. Keep observed wire-encoding refinements in `schemas.ts` rather than editing generated schemas or introducing parser-private wire types.

## Consequences

- Components use the same OTEL interfaces for native backend traces and facade-backed uploads.
- Discovery, search, and trace-loading hooks use `/api/v3/`. Upload conversion and Search's raw trace download still use `JaegerAPI`; switching the hooks does not retire that client.
- Facade allocation remains on the upload path. Same-trace visual comparisons and 50k–80k-span performance measurements must precede transformer, facade, and legacy-type deletion.
- Manual reload remains in #4574; its behavior through the native loader must be verified after both changes land.
- Archive, SPM metrics, and backend DDG requests retain their existing endpoints and require client consolidation. Native upload parsing will remove the `/api/transform` round trip.

## References

- [RFC 0002: Making Jaeger UI OpenTelemetry-Native](../rfc/0002-otel-native-jaeger-ui.md) - the four-phase plan, milestone tracking, and wire-format details
- [ADR-0004: State Management Strategy](./0004-state-management-strategy.md) - why trace data lives in TanStack Query rather than Redux
- [`src/api/v3/README.md`](../../packages/jaeger-ui/src/api/v3/README.md) - schema generation workflow
