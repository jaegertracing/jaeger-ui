# Jaeger v3 API Client

This directory contains the TypeScript client for interacting with Jaeger's v3 API (`/api/v3/`) endpoints.

## Files

### `client.ts`

The main API client with methods for fetching data from Jaeger's v3 endpoints:

- `fetchServices()` - Get list of service names
- `fetchSpanNames(service)` - Get list of span names for a service
- `fetchTraceSummaries(query)` - Search traces via `/api/v3/trace-summaries`

All responses are validated at runtime using Zod schemas.

### `schemas.ts`

**Imports** Zod schemas from `generated-client.ts` via its `schemas` bundle for API response validation:

- `ServicesResponseSchema` - Validates `/api/v3/services` responses
- `OperationsResponseSchema` - Validates `/api/v3/operations` responses
- `TraceSummariesResponseSchema` - Validates `/api/v3/trace-summaries` with hex ID and decimal-timestamp refinements
- `TracesDataSchema`, `ResourceSpansSchema`, `ScopeSpansSchema`, `SpanSchema`, `SpanEventSchema`, `SpanLinkSchema`, `ResourceSchema`, `InstrumentationScopeSchema`, `KeyValueSchema`, `AnyValueSchema`, `ArrayValueSchema`, `KeyValueListSchema`, `StatusSchema` - Full OTLP trace/span surface for `/api/v3/traces/{trace_id}` consumers
- `traceIdHex`, `spanIdHex` - Helper validators (manually added)

**Note:** These schemas come straight from the codegen, which emits Proto3-accurate optionality (fields real payloads omit stay optional). Per-field requirements (hex IDs, decimal-string int64s, envelopes) belong as refinements layered in this file or a follow-up — never as regexes over the generated text.

### `generated-client.ts`

**Auto-generated** from the Jaeger OpenAPI spec. Contains:

- Complete Zod schemas for ALL v3 endpoints
- Full OTLP type definitions (Span, Resource, etc.)
- A `schemas` bundle object holding every schema by its qualified codegen name (e.g. `opentelemetry_proto_trace_v1_Span`) — consumers import via `schemas.ts`, never this file directly

Run from the project root:

```bash
pnpm run generate:api-types
```

This file is the source of truth for the full API schema. It is automatically processed by `scripts/postprocess-schemas.cjs` to:

1. Prepend copyright header
2. Remove unused Zodios runtime code (we only use the Zod schemas, not the Zodios client)

As a rule, post-processing the generated file is a liability: new requirements belong in `jaeger-idl`, or as refinements layered in `schemas.ts` — not as regexes over generated text.

## Schema Strategy

We use **Automated Schema Generation with Strict Validation**:

1. **`generated-client.ts`** - Auto-generated from OpenAPI
2. **`postprocess-schemas.cjs`** - Automatically cleans up schema:
   - Prepends copyright header
   - Removes runtime dependencies
3. **`schemas.ts`** - Re-exports the generated schemas via the `schemas` bundle under stable ergonomic names, plus `TraceSummary` refinements and hex ID helpers

This gives us:

- ✅ Single source of truth (OpenAPI spec)
- ✅ Strict validation (required fields enforced)
- ✅ Automation (regenerate when spec changes)

## When to Regenerate

Run `pnpm run generate:api-types` when:

- The OpenAPI spec in `jaeger-idl` repository changes
- New endpoints are added to `/api/v3/`
- Field definitions are updated

The generated file will be updated and post-processed automatically.

## Usage

```typescript
import { jaegerClient } from './api/v3/client';

// Fetch services (with automatic Zod validation)
const services = await jaegerClient.fetchServices();

// Fetch span names (with automatic Zod validation)
const operations = await jaegerClient.fetchSpanNames('my-service');
```

All responses are validated at runtime. If the API returns invalid data, a `ZodError` will be thrown with details about what failed validation.
