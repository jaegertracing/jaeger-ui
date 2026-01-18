# Jaeger v3 API Client

This directory contains the TypeScript client for interacting with Jaeger's v3 API (`/api/v3/`) endpoints.

## Files

### `client.ts`

The main API client with methods for fetching data from Jaeger's v3 endpoints:

- `fetchServices()` - Get list of service names
- `fetchSpanNames(service)` - Get list of span names for a service

All responses are validated at runtime using Zod schemas.

### `schemas.ts`

**Imports** Zod schemas from `generated-client.ts` for API response validation:

- `ServicesResponseSchema` - Validates `/api/v3/services` responses
- `OperationsResponseSchema` - Validates `/api/v3/operations` responses
- `traceIdHex`, `spanIdHex` - Helper validators (manually added)

**Note:** These schemas are **automatically post-processed** to enforce strict validation (removing optionality from Proto3/OpenAPI).

### `generated-client.ts`

**Auto-generated** from the Jaeger OpenAPI spec. Contains:

- Complete Zod schemas for ALL v3 endpoints
- Full OTLP type definitions (Span, Resource, etc.)
- Zodios client setup (commented out until needed)

Run from the project root:

```bash
npm run generate:api-types
```

This file is the source of truth for the full API schema. It is automatically processed by `scripts/postprocess-schemas.cjs` to:

1. Prepend copyright header
2. Enforce strict validation (remove `.partial()`)
3. Disable unused runtime dependencies

## Schema Strategy

We use **Automated Schema Generation with Strict Validation**:

1. **`generated-client.ts`** - Auto-generated from OpenAPI
2. **`postprocess-schemas.cjs`** - Automatically cleans up schema:
   - Enforces strictness (fixes Proto3 optionality)
   - Removes runtime dependencies
3. **`schemas.ts`** - Simply re-exports the generated schemas

This gives us:

- ✅ Single source of truth (OpenAPI spec)
- ✅ Strict validation (required fields enforced)
- ✅ Automation (regenerate when spec changes)

## When to Regenerate

Run `npm run generate:api-types` when:

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
