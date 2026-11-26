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

### Traces enter the Query cache through the parser or legacy-upload facade

API trace loading uses `JaegerClient.fetchTrace()` and `transformOtelTrace()` through `hooks/useTraceLoading.ts` ([#4605](https://github.com/jaegertracing/jaeger-ui/pull/4605)). Native OTLP uploads also use `transformOtelTrace()` in `SearchTracePage/FileLoader.tsx` ([#4634](https://github.com/jaegertracing/jaeger-ui/pull/4634)). Only the legacy-upload branch still calls `transformTraceData(...).asOtelTrace()`, backed by `OtelTraceFacade` and `OtelSpanFacade`. All three paths hand `IOtelTrace` to TanStack Query.

Components therefore receive `IOtelTrace` / `IOtelSpan` as plain data and never construct a facade. There are no Redux selectors or hooks in this path and no `src/selectors/` directory; trace state lives in the Query cache ([ADR-0004](./0004-state-management-strategy.md)), which is what made a selector layer unnecessary.

### `/api/v3/` responses are validated against generated schemas

`src/api/v3/client.ts` (`JaegerClient`) is the client for the OTLP endpoints. `src/api/v3/generated-client.ts` holds Zod schemas generated from Jaeger's OpenAPI spec via `pnpm run generate:api-types`, post-processed by `scripts/postprocess-schemas.cjs`; `schemas.ts` adds wire-format refinements for hex IDs, quoted int64 timestamps, and the grpc-gateway envelope. Every response the client parses is validated at runtime, so a backend contract change surfaces at the network boundary rather than as a downstream rendering bug.

When the spec changes, regenerate rather than patching `generated-client.ts`. Hand-written wire constraints belong in `schemas.ts` and its contract tests.

## Consequences

- New components are written in OTEL vocabulary regardless of which transport served the trace, so the switch to `/api/v3/traces/{trace_id}` was invisible to them. That is the property the facade was bought for.
- API loading and native OTLP uploads use the native parser. Legacy uploads and test fixtures still use the facade; [#4761](https://github.com/jaegertracing/jaeger-ui/issues/4761) tracks the remaining migration.
- The facade still allocates a wrapper per span for legacy uploads. It remains transitional during the legacy-upload support window in [RFC 0002](../rfc/0002-otel-native-jaeger-ui.md#phase-4-cleanup--optimization).
- `JaegerClient` owns archival, dependencies, DDG, metrics, and decoration requests while preserving their existing routes. Native uploads parse in the browser instead of calling `/api/transform`. The legacy `src/api/jaeger.ts` client was deleted in [#4684](https://github.com/jaegertracing/jaeger-ui/pull/4684).

## References

- [RFC 0002: Making Jaeger UI OpenTelemetry-Native](../rfc/0002-otel-native-jaeger-ui.md) - the four-phase plan, milestone tracking, and wire-format details
- [ADR-0004: State Management Strategy](./0004-state-management-strategy.md) - why trace data lives in TanStack Query rather than Redux
- [`src/api/v3/README.md`](../../packages/jaeger-ui/src/api/v3/README.md) - schema generation workflow
