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

### `v3-trace-probe.json` and `v3-trace-local-2.21.0.json`

The probe is the OTLP payload submitted to a local Jaeger. The other file is the `GET /api/v3/traces/{trace_id}` response that came back, and it is the single valid case the `*.trace-contract.test.ts` files build every malformed case from. Parsing genuine backend output is how drift between the server and the schemas surfaces as a test failure.

The probe is hand-authored and is not generated. Recapture the response with `pnpm run generate:v3-fixture`, which needs Docker, `curl` and `python3`. To verify the committed fixture without overwriting it, run `./scripts/generate-v3-fixture.sh --check`, which recaptures into a temporary file, compares, and exits non-zero on drift.

Every input that can change the shape of the response is pinned in that script rather than left to a default:

- The image is pinned by digest, not tag, since a tag can be re-pushed.
- Storage is declared rather than inherited. `scripts/jaeger-fixture-config.yaml` names in-memory storage explicitly, so the question "which storage produced this fixture" has a checked-in answer instead of depending on the default compiled into the binary. A capture taken with that config is identical to one taken with the image default, which is what confirms the default was in-memory.
- The probe carries explicit trace and span IDs and explicit nanosecond timestamps, so the submitted trace is byte-identical on every run. It covers all seven `AnyValue` variants, an omitted `kind`, an empty `status`, a numeric `kind` and `status.code`, nested `kvlistValue`, and one span with `events` and `links`.
- `raw_traces=false` is passed explicitly. It keeps Jaeger's enrichment, such as clock skew adjustment, which is what the UI receives in production. Flipping it returns a different document.
- The capture is accepted only once every span in the probe has come back, rather than on the first HTTP 200. With this image the trace becomes visible atomically, so this is a guard rather than a fix for an observed failure: it keeps the guarantee if the probe ever grows past a single OTLP batch, or if the storage default behind the digest changes.
- The version is read back from the image itself and checked against the tag the fixture is named after, so a digest that stops resolving to 2.21.0 fails instead of silently recapturing.
- The response is first written exactly as it arrived and then handed to the repo formatter. In write mode, the deterministic response and formatter reproduce the committed bytes. In `--check` mode, parsed JSON is compared after normalising only the unordered collections below, so formatting and line endings do not count as drift.

The backend may vary span order, attribute order and `kvlistValue` entry order without changing the contract. `--check` sorts those collections before comparing, and the contract assertions locate spans by name and attributes by key. `arrayValue` entries, events and links remain positional and are compared as received. Status representation is intentionally pinned: this fixture contains `status: {}` for an unset status, and both the contract test and `--check` report drift if a future backend omits it. The two forms encode `STATUS_CODE_UNSET`, but they are different parsed shapes at the validation boundary.

The `Verify v3 Fixture` workflow runs `--check` on every pull request that touches the probe, the config, the script or the fixture, so the capture is verified by the pipeline rather than trusted because it is committed. It is path-filtered because the digest pin means nothing else can make the capture drift.

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
