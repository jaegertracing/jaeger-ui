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

### `v3-trace-input.json` and `v3-trace-output.json`

The input is the OTLP payload submitted to a local Jaeger. The output is the `GET /api/v3/traces/{trace_id}` response, and it is the single valid case the `*.trace-contract.test.ts` files use to build malformed cases. Parsing genuine backend output exposes drift between the server and the schemas.

The input is hand-authored. Recapture the output with `pnpm run generate:v3-fixture`, which needs Docker. To verify the committed output without overwriting it, run `pnpm run generate:v3-fixture -- --check`.

The checked-in files make the capture reproducible:

- `scripts/v3-fixture/docker-compose.yml` pins Jaeger by version and digest. Renovate can update both when Jaeger publishes a release.
- The input carries explicit trace and span IDs and nanosecond timestamps. It covers all seven `AnyValue` variants, an omitted `kind`, an empty `status`, numeric `kind` and `status.code`, nested `kvlistValue`, and one span with `events` and `links`.
- `raw_traces=false` is passed explicitly. It keeps Jaeger's enrichment, such as clock skew adjustment, which is what the UI receives in production. Flipping it returns a different document.
- Testcontainers waits for the API v3 service endpoint, assigns free host ports, and removes the Compose environment when the script exits.
- The generator waits until every input span is queryable before accepting the output.
- Write mode emits stable two-space JSON. Check mode compares parsed JSON after normalising only unordered collections, so formatting and line endings do not count as drift.

The backend may vary span order, attribute order and `kvlistValue` entry order without changing the contract. `--check` sorts those collections before comparing, and the contract assertions locate spans by name and attributes by key. `arrayValue` entries, events and links remain positional and are compared as received. Status representation is intentionally pinned: this fixture contains `status: {}` for an unset status, and both the contract test and `--check` report drift if a future backend omits it. The two forms encode `STATUS_CODE_UNSET`, but they are different parsed shapes at the validation boundary.

The `Verify API v3 Fixtures` workflow runs `--check` when a pull request changes the input, output, generator, or Compose file. The pipeline therefore verifies the capture instead of trusting a committed file.

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
