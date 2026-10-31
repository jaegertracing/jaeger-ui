# ADR-0002: OTEL Facade and the `api/v3` Client

* **Status**: Implemented — graduated from [RFC 0002](../rfc/0002-otel-native-jaeger-ui.md), which tracks the remaining migration
* **Date**: 2025-12-29
* **Tracking Issue**: [#3265](https://github.com/jaegertracing/jaeger-ui/issues/3265)

## Context

Jaeger UI was built against the legacy Jaeger JSON model — `tags`, `process`, `logs`, `operationName`, and a `references` array — and Jaeger's own data model has since become OTLP. Continuing to speak the legacy vocabulary meant every new contributor had to learn a translation layer that exists nowhere else in the ecosystem, and every semantic-convention feature had to be expressed in terms that do not match the spec.

Rewriting the UI against OTLP in one step was not viable: the trace data model is threaded through the timeline, the graph views, search, and diff. But an audit found that most components touch only a small part of a span, which makes the migration divisible.

[RFC 0002](../rfc/0002-otel-native-jaeger-ui.md) proposed the four-phase approach and remains the plan of record for what is still outstanding. This ADR records the two pieces that are built and that new code has to work with.

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

### The facade is applied where a trace enters the Query cache

Rather than wrapping spans at each read site, the conversion happens once at the boundary. `transformTraceData` (`src/model/transform-trace-data.ts`) returns a legacy trace carrying an `asOtelTrace()` method, backed by the `OtelTraceFacade` and `OtelSpanFacade` classes in `src/model/`. Exactly two production call sites invoke it — `hooks/useTraceLoading.ts` for traces fetched from the API, and `SearchTracePage/FileLoader.tsx` for uploaded files — and both hand the result to TanStack Query.

Components therefore receive `IOtelTrace` / `IOtelSpan` as plain data and never construct a facade. There are no Redux selectors or hooks in this path and no `src/selectors/` directory; trace state lives in the Query cache ([ADR-0004](./0004-state-management-strategy.md)), which is what made a selector layer unnecessary.

### `/api/v3/` responses are validated against generated schemas

`src/api/v3/client.ts` (`JaegerClient`) is the client for the OTLP endpoints. `src/api/v3/generated-client.ts` holds Zod schemas generated from Jaeger's OpenAPI spec via `pnpm run generate:api-types`, post-processed by `scripts/postprocess-schemas.cjs` to strip the optionality that Proto3-derived OpenAPI puts on every field; `schemas.ts` re-exports them. Every response the client parses is validated at runtime, so a backend contract change surfaces at the network boundary rather than as a downstream rendering bug.

The consequence for contributors: schemas are not hand-written. When the spec changes, regenerate — do not patch `generated-client.ts`.

## Consequences

- New components are written in OTEL vocabulary regardless of which transport served the trace, so the eventual switch to `/api/v3/traces/{trace_id}` is invisible to them. That is the property the facade was bought for.
- Two data paths coexist. Service and span-name discovery and trace search run on `/api/v3/`; single trace loading still goes through the legacy `/api/traces/:id` route and `transformTraceData`. The facade is what makes them look the same to components.
- The facade allocates a wrapper per span, which is measurable on large traces (`src/model/OtelFacade.bench.test.ts` guards this). It is a transitional cost: once a native OTLP parser produces `IOtelTrace` directly, the classes and their six call sites all go away — [RFC 0002](../rfc/0002-otel-native-jaeger-ui.md) Phase 4.
- Not every endpoint has a v3 counterpart. Trace archival, SPM metrics, DDG, and OTLP file transform have no equivalent in the api_v3 service and legitimately stay on their current routes, so `src/api/jaeger.ts` will not disappear simply by finishing the v3 migration.

## References

- [RFC 0002: Making Jaeger UI OpenTelemetry-Native](../rfc/0002-otel-native-jaeger-ui.md) - the four-phase plan, milestone tracking, and wire-format details
- [ADR-0004: State Management Strategy](./0004-state-management-strategy.md) - why trace data lives in TanStack Query rather than Redux
- [`src/api/v3/README.md`](../../packages/jaeger-ui/src/api/v3/README.md) - schema generation workflow
