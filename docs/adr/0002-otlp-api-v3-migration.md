# ADR 0002: Migration from Legacy Jaeger Data Model to OTLP via API v3

**Status**: Proposed  
**Last Updated**: 2025-12-29  
**Next Review**: TBD

---

## TL;DR

This ADR presents a comprehensive plan to migrate Jaeger UI from the legacy Jaeger data model (served via REST `/api/` endpoints with JSON) to the OpenTelemetry Protocol (OTLP) data model served via gRPC-Web or JSON from `/api/v3/` endpoints. This migration aligns Jaeger with the OpenTelemetry ecosystem, enables interoperability with other observability tools, and positions Jaeger UI to leverage future OTLP enhancements.

**Recommendation**: Adopt a phased, backward-compatible migration approach using an adapter pattern to transform OTLP data to the internal data model, minimizing disruption while enabling a gradual transition.

---

## Context & Problem

### Current State

Jaeger UI currently consumes trace data through a REST API (`/api/`) that returns trace data in the legacy Jaeger JSON format. The data flows through the following architecture:

```
┌────────────────────────────────────────────────────────────────────┐
│ Current Architecture (Legacy Jaeger Model)                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Backend (Jaeger Query)                                           │
│  └─ REST API (/api/)                                              │
│     ├─ GET /api/traces/:id        → Returns Trace JSON           │
│     ├─ GET /api/traces             → Search traces                │
│     ├─ GET /api/services           → List services                │
│     ├─ GET /api/services/:svc/operations → List operations        │
│     ├─ GET /api/operations         → Get operations by kind       │
│     ├─ GET /api/dependencies       → Dependency graph             │
│     ├─ GET /api/metrics/:type      → Metrics (latencies, etc)     │
│     └─ POST /api/transform         → Transform OTLP → Jaeger      │
│          ▲                                                         │
│          │ (Currently used only for file uploads)                 │
│          │                                                         │
│  ┌───────▼────────────────────────────────────────────────┐       │
│  │ API Layer (packages/jaeger-ui/src/api/jaeger.ts)      │       │
│  │ - fetchTrace(), searchTraces(), fetchServices(), etc.  │       │
│  │ - All methods call REST /api/ endpoints               │       │
│  └────────────────────────────────────────────────────────┘       │
│          │                                                         │
│          ▼                                                         │
│  ┌───────────────────────────────────────────────────────┐        │
│  │ Actions (packages/jaeger-ui/src/actions/jaeger-api.ts)│        │
│  │ - Redux action creators using redux-actions            │        │
│  │ - Wraps API calls with action types                   │        │
│  └────────────────────────────────────────────────────────┘        │
│          │                                                         │
│          ▼                                                         │
│  ┌────────────────────────────────────────────────────────┐       │
│  │ Reducers (packages/jaeger-ui/src/reducers/trace.ts)   │       │
│  │ - Calls transformTraceData() on received data          │       │
│  │ - Manages Redux state for traces, search, services    │       │
│  └────────────────────────────────────────────────────────┘       │
│          │                                                         │
│          ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Transform Layer (src/model/transform-trace-data.tsx)       │  │
│  │ - Enriches trace data with derived properties               │  │
│  │ - Deduplicates and orders tags                              │  │
│  │ - Builds span tree structure                                │  │
│  │ - Calculates trace duration, service counts                 │  │
│  │ - Detects orphan spans                                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│          │                                                         │
│          ▼                                                         │
│  ┌────────────────────────────────────────────────────────┐       │
│  │ Components (React)                                      │       │
│  │ - TracePage, SearchTracePage, DeepDependencies, etc.   │       │
│  │ - Consume enriched trace data from Redux store         │       │
│  └────────────────────────────────────────────────────────┘       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Legacy Jaeger Data Model

The current data model is defined in `packages/jaeger-ui/src/types/trace.tsx`:

```typescript
// Core types
KeyValuePair { key: string, value: any }
Process { serviceName: string, tags: KeyValuePair[] }
Log { timestamp: number, fields: KeyValuePair[] }
SpanReference { refType: 'CHILD_OF' | 'FOLLOWS_FROM', spanID, traceID, span? }
SpanData { spanID, traceID, processID, operationName, startTime, duration,
           logs, tags?, references?, warnings?, childSpanIds? }
Span extends SpanData { depth, hasChildren, process, relativeStartTime,
                        subsidiarilyReferencedBy, ... }
Trace { traceID, processes: Record<string, Process>, spans: Span[],
        duration, startTime, endTime, services, traceName, ... }
```

### Key Dependencies

The legacy data model is deeply integrated into:

1. **Type Definitions** (`src/types/trace.tsx`): ~85 LOC defining core types
2. **API Layer** (`src/api/jaeger.ts`): ~141 LOC with 12+ API methods
3. **Transform Layer** (`src/model/transform-trace-data.tsx`): ~192 LOC of enrichment logic
4. **Selectors** (`src/selectors/trace.tsx`): Tree building and span selection
5. **Components**: 100+ components consuming trace data
6. **Reducers**: State management for traces, search, services
7. **Tests**: ~205 test files validating behavior

### Problem Statement

1. **Legacy Format**: The Jaeger-specific JSON format is not compatible with the OpenTelemetry ecosystem
2. **Limited Interoperability**: Cannot easily consume OTLP data from other sources (e.g., OTEL Collector, vendor backends)
3. **Manual Transformation**: Currently relies on backend `/api/transform` endpoint to convert OTLP → Jaeger (only for file uploads)
4. **Future-Proofing**: OTLP is the industry standard; staying on legacy format limits future enhancements
5. **Maintenance Burden**: Maintaining a legacy format alongside OTLP creates technical debt

### OTLP Data Model (API v3)

The new API v3 is based on [jaeger-idl/proto/api_v3](https://github.com/jaegertracing/jaeger-idl/tree/main/proto/api_v3) which uses OTLP (OpenTelemetry Protocol) as defined in the [OpenTelemetry specification](https://opentelemetry.io/docs/specs/otel/protocol/).

Key OTLP structures:

```
ResourceSpans {
  resource: Resource { attributes: KeyValue[] }
  scopeSpans: ScopeSpans[] {
    scope: InstrumentationScope { name, version, attributes }
    spans: Span[] {
      traceId: bytes
      spanId: bytes
      parentSpanId: bytes
      name: string
      kind: SpanKind (INTERNAL, SERVER, CLIENT, PRODUCER, CONSUMER)
      startTimeUnixNano: fixed64
      endTimeUnixNano: fixed64
      attributes: KeyValue[]
      events: Event[] { timeUnixNano, name, attributes }
      links: Link[] { traceId, spanId, attributes }
      status: Status { code, message }
    }
  }
}

KeyValue {
  key: string
  value: AnyValue { stringValue | intValue | doubleValue | boolValue |
                     arrayValue | kvlistValue | bytesValue }
}
```

### Key Differences

| Aspect           | Legacy Jaeger                  | OTLP (API v3)                       |
| ---------------- | ------------------------------ | ----------------------------------- |
| **Format**       | Jaeger-specific JSON           | OTLP (protobuf or JSON)             |
| **Span ID**      | String (hex)                   | bytes (16 bytes)                    |
| **Trace ID**     | String (hex, 16 or 32 chars)   | bytes (16 bytes, 128-bit)           |
| **Time Units**   | Microseconds                   | Nanoseconds                         |
| **Tags**         | KeyValuePair[]                 | attributes: KeyValue[] (typed)      |
| **Logs**         | Log { fields: KeyValuePair[] } | events: Event[]                     |
| **References**   | references: SpanReference[]    | parentSpanId + links: Link[]        |
| **Process**      | Top-level processes map        | resource.attributes (service.name)  |
| **Service Name** | process.serviceName            | resource.attributes["service.name"] |
| **Transport**    | REST/JSON                      | gRPC-Web or JSON (HTTP/2)           |

---

## Decision

**Adopt a phased, backward-compatible migration approach** using the following strategy:

1. **Adapter Pattern**: Create an OTLP-to-Internal adapter that transforms OTLP data into the current internal data model
2. **Dual API Support**: Support both `/api/` (legacy) and `/api/v3/` (OTLP) simultaneously
3. **Feature Flag**: Use configuration to toggle between legacy and OTLP APIs
4. **Progressive Migration**: Migrate API endpoints one at a time, starting with read-only trace fetching
5. **No Breaking Changes**: Maintain existing component interfaces during migration
6. **Future Flexibility**: Position for eventual removal of adapter and direct OTLP consumption

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ Proposed Architecture (Dual Support → OTLP Native)                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Backend (Jaeger Query v2)                                            │
│  ├─ REST API (/api/) - LEGACY                                         │
│  └─ gRPC-Web/JSON API (/api/v3/) - NEW ✨                             │
│     ├─ GetTrace(traceId) → TracesData (OTLP)                          │
│     ├─ FindTraces(query) → TracesData (OTLP)                          │
│     ├─ GetServices() → GetServicesResponse                            │
│     ├─ GetOperations(service) → GetOperationsResponse                 │
│     └─ GetDependencies() → GetDependenciesResponse                    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │ NEW: API Client Abstraction                              │         │
│  │ (packages/jaeger-ui/src/api/)                            │         │
│  │                                                           │         │
│  │  ┌────────────────┐         ┌─────────────────┐          │         │
│  │  │ api/client.ts  │◄────────┤ Feature Flag    │          │         │
│  │  │ (Facade)       │         │ useApiV3: bool  │          │         │
│  │  └────────┬───────┘         └─────────────────┘          │         │
│  │           │                                               │         │
│  │           ├──► Legacy Path                                │         │
│  │           │    └─ jaeger.ts (existing REST /api/)        │         │
│  │           │                                               │         │
│  │           └──► OTLP Path                                  │         │
│  │                ├─ api/v3/client.ts (gRPC-Web or fetch)   │         │
│  │                └─ api/v3/adapter.ts (OTLP → Internal)    │         │
│  │                                                           │         │
│  └───────────────────────────────────────────────────────────┘         │
│          │                                                             │
│          ▼                                                             │
│  ┌────────────────────────────────────────────────────────┐           │
│  │ Actions (no changes required)                          │           │
│  │ - Same action creators, different data source          │           │
│  └────────────────────────────────────────────────────────┘           │
│          │                                                             │
│          ▼                                                             │
│  ┌────────────────────────────────────────────────────────┐           │
│  │ Reducers (minimal changes)                             │           │
│  │ - transformTraceData() continues to work               │           │
│  │ - Data already in internal format from adapter         │           │
│  └────────────────────────────────────────────────────────┘           │
│          │                                                             │
│          ▼                                                             │
│  ┌────────────────────────────────────────────────────────┐           │
│  │ Components (no changes)                                │           │
│  │ - Continue using existing interfaces                   │           │
│  └────────────────────────────────────────────────────────┘           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Backward Compatibility**: No breaking changes to components or existing functionality
2. **Incremental Migration**: Each API endpoint can be migrated independently
3. **Feature-Flag Controlled**: Easy rollback if issues are discovered
4. **Testable**: Both paths can be tested in parallel
5. **Future-Ready**: Clear path to remove adapter and consume OTLP directly

---

## Implementation Plan

### Phase 1: Foundation (2-3 weeks)

**Goal**: Set up infrastructure for dual API support without breaking existing functionality.

#### 1.1 Project Setup

- [ ] Create new directory structure:

  ```
  packages/jaeger-ui/src/api/
  ├── jaeger.ts              (existing - legacy REST API)
  ├── client.ts              (NEW - API client facade)
  ├── v3/
  │   ├── client.ts          (NEW - OTLP API client)
  │   ├── adapter.ts         (NEW - OTLP → Internal adapter)
  │   ├── types.ts           (NEW - OTLP type definitions)
  │   └── utils.ts           (NEW - Conversion utilities)
  └── __tests__/
      ├── v3-adapter.test.ts (NEW - Adapter tests)
      └── v3-client.test.ts  (NEW - Client tests)
  ```

- [ ] Add feature flag to `src/types/config.tsx`:

  ```typescript
  export type Config = {
    // ... existing fields
    apiV3: {
      enabled: boolean;
      endpoint?: string; // e.g., '/api/v3'
      format?: 'json' | 'protobuf';
    };
  };
  ```

- [ ] Update `src/constants/default-config.tsx`:
  ```typescript
  apiV3: {
    enabled: false,  // Start disabled
    endpoint: '/api/v3',
    format: 'json',
  },
  ```

#### 1.2 OTLP Type Definitions

- [ ] Create `src/api/v3/types.ts` with OTLP type definitions:

  ```typescript
  // Based on OpenTelemetry proto definitions
  export interface IOtlpKeyValue {
    key: string;
    value: IOtlpAnyValue;
  }

  export interface IOtlpAnyValue {
    stringValue?: string;
    intValue?: number;
    doubleValue?: number;
    boolValue?: boolean;
    arrayValue?: IOtlpArrayValue;
    kvlistValue?: IOtlpKeyValueList;
    bytesValue?: Uint8Array;
  }

  export interface IOtlpSpan {
    traceId: Uint8Array;
    spanId: Uint8Array;
    parentSpanId?: Uint8Array;
    name: string;
    kind: SpanKind;
    startTimeUnixNano: number;
    endTimeUnixNano: number;
    attributes: IOtlpKeyValue[];
    events: IOtlpEvent[];
    links: IOtlpLink[];
    status?: IOtlpStatus;
  }

  export interface IOtlpResourceSpans {
    resource: IOtlpResource;
    scopeSpans: IOtlpScopeSpans[];
  }

  // ... additional types
  ```

#### 1.3 Utility Functions

- [ ] Create `src/api/v3/utils.ts`:

  ```typescript
  // Convert bytes to hex string
  export function bytesToHex(bytes: Uint8Array): string;

  // Convert hex string to bytes
  export function hexToBytes(hex: string): Uint8Array;

  // Convert nanoseconds to microseconds
  export function nanoToMicro(nano: number): number;

  // Convert microseconds to nanoseconds
  export function microToNano(micro: number): number;

  // Extract service name from OTLP resource
  export function extractServiceName(resource: IOtlpResource): string;

  // Convert OTLP AnyValue to simple value
  export function otlpValueToSimple(value: IOtlpAnyValue): any;
  ```

#### 1.4 Comprehensive Tests

- [ ] Unit tests for utility functions
- [ ] Unit tests for type conversions
- [ ] Integration tests with mock OTLP data

### Phase 2: OTLP Adapter (3-4 weeks)

**Goal**: Create adapter to transform OTLP data to internal Jaeger format.

#### 2.1 Core Adapter Implementation

- [ ] Create `src/api/v3/adapter.ts`:

  ```typescript
  import { IOtlpResourceSpans } from './types';
  import { TraceData, SpanData, Process } from '../../types/trace';

  export class OtlpAdapter {
    /**
     * Convert OTLP TracesData to internal TraceData format
     */
    static convertTrace(otlpData: IOtlpResourceSpans[]): TraceData;

    /**
     * Convert OTLP Span to internal SpanData
     */
    static convertSpan(otlpSpan: IOtlpSpan, resource: IOtlpResource, processId: string): SpanData;

    /**
     * Convert OTLP Resource to internal Process
     */
    static convertResource(resource: IOtlpResource): Process;

    /**
     * Convert OTLP attributes to KeyValuePair[]
     */
    static convertAttributes(attrs: IOtlpKeyValue[]): KeyValuePair[];

    /**
     * Convert OTLP events to logs
     */
    static convertEvents(events: IOtlpEvent[]): Log[];

    /**
     * Convert OTLP links + parentSpanId to references
     */
    static convertReferences(
      parentSpanId: Uint8Array | undefined,
      links: IOtlpLink[],
      traceId: string
    ): SpanReference[];
  }
  ```

#### 2.2 Adapter Features

- [ ] Handle OTLP span links → Jaeger references mapping
- [ ] Convert parent span relationship to CHILD_OF reference
- [ ] Convert OTLP links to FOLLOWS_FROM references
- [ ] Map OTLP resource attributes to Process.serviceName and tags
- [ ] Convert nanosecond timestamps to microseconds
- [ ] Convert byte arrays (trace/span IDs) to hex strings
- [ ] Handle OTLP AnyValue types → simple JavaScript values
- [ ] Preserve all OTLP metadata that doesn't have Jaeger equivalent (in tags)
- [ ] Handle missing or malformed data gracefully

#### 2.3 Edge Cases & Validation

- [ ] Handle traces with multiple services (multiple ResourceSpans)
- [ ] Handle missing service.name in resource attributes
- [ ] Handle empty or missing parent span IDs
- [ ] Validate trace ID and span ID formats
- [ ] Handle timestamp edge cases (zero, very large values)
- [ ] Preserve OTLP span status → convert to tags
- [ ] Preserve OTLP span kind → convert to tags

#### 2.4 Adapter Tests

- [ ] Unit tests for each conversion function
- [ ] Integration tests with realistic OTLP data
- [ ] Round-trip tests (if possible)
- [ ] Performance benchmarks (ensure no significant overhead)
- [ ] Tests with edge cases and malformed data

### Phase 3: OTLP API Client (2-3 weeks)

**Goal**: Implement API client for `/api/v3/` endpoints.

#### 3.1 API Client Implementation

- [ ] Create `src/api/v3/client.ts`:
  ```typescript
  export class OtlpApiClient {
    constructor(
      private baseUrl: string,
      private format: 'json' | 'protobuf'
    );

    /**
     * Fetch a single trace by ID
     */
    async getTrace(traceId: string): Promise<TraceData>;

    /**
     * Search for traces
     */
    async findTraces(query: SearchQuery): Promise<TraceData[]>;

    /**
     * Get list of services
     */
    async getServices(): Promise<string[]>;

    /**
     * Get operations for a service
     */
    async getOperations(service: string): Promise<string[]>;

    /**
     * Get dependencies
     */
    async getDependencies(
      endTime: number,
      lookback: number
    ): Promise<DependencyData>;

    /**
     * Get metrics (if supported by v3)
     */
    async getMetrics(
      metricType: string,
      services: string[],
      query: Record<string, any>
    ): Promise<MetricData>;
  }
  ```

#### 3.2 Client Features

- [ ] Support both JSON and protobuf formats (start with JSON)
- [ ] Handle gRPC-Web transport (if backend uses gRPC)
- [ ] Handle HTTP/JSON transport (if backend exposes JSON API)
- [ ] Error handling and retry logic
- [ ] Request/response logging for debugging
- [ ] Timeout handling
- [ ] Use existing `getJSON` helper or create v3-specific helper

#### 3.3 Client Tests

- [ ] Mock API responses for each endpoint
- [ ] Test error scenarios (404, 500, timeout)
- [ ] Test with different response formats
- [ ] Integration tests with mock backend

### Phase 4: API Facade & Integration (2-3 weeks)

**Goal**: Create unified API interface and integrate with existing codebase.

#### 4.1 API Facade

- [ ] Create `src/api/client.ts`:

  ```typescript
  import JaegerAPI from './jaeger';
  import { OtlpApiClient } from './v3/client';
  import getConfig from '../utils/config/get-config';

  class ApiClient {
    private legacyClient = JaegerAPI;
    private v3Client?: OtlpApiClient;

    constructor() {
      const config = getConfig();
      if (config.apiV3?.enabled) {
        this.v3Client = new OtlpApiClient(config.apiV3.endpoint || '/api/v3', config.apiV3.format || 'json');
      }
    }

    get useV3(): boolean {
      return getConfig().apiV3?.enabled && this.v3Client != null;
    }

    async fetchTrace(id: string): Promise<any> {
      return this.useV3 ? this.v3Client!.getTrace(id) : this.legacyClient.fetchTrace(id);
    }

    // ... similar methods for all API operations
  }

  export default new ApiClient();
  ```

#### 4.2 Action Integration

- [ ] Update `src/actions/jaeger-api.ts` to use new `ApiClient` facade:

  ```typescript
  import ApiClient from '../api/client'; // Instead of JaegerAPI

  export const fetchTrace = createAction(
    '@JAEGER_API/FETCH_TRACE',
    (id: string) => ApiClient.fetchTrace(id),
    (id: string) => ({ id })
  );

  // ... update all actions similarly
  ```

#### 4.3 Testing & Validation

- [ ] Test with feature flag disabled (legacy path)
- [ ] Test with feature flag enabled (OTLP path)
- [ ] Verify no regressions in existing functionality
- [ ] Test switching between modes at runtime
- [ ] Visual regression tests for UI components

### Phase 5: Incremental Endpoint Migration (4-6 weeks)

**Goal**: Migrate each API endpoint one at a time, validating thoroughly.

#### 5.1 Migration Order (Recommended)

1. **Read-only, low-risk endpoints first:**
   - [ ] `GET /api/v3/services` (getServices)
   - [ ] `GET /api/v3/operations` (getOperations)

2. **Core trace retrieval:**
   - [ ] `GET /api/v3/traces/:id` (getTrace)
   - [ ] Test extensively with production-like data

3. **Search functionality:**
   - [ ] `POST /api/v3/traces` or query endpoint (findTraces)
   - [ ] Map search parameters from legacy to OTLP format

4. **Supporting features:**
   - [ ] `GET /api/v3/dependencies` (getDependencies)
   - [ ] Metrics endpoints (if available in v3)

5. **Advanced features:**
   - [ ] Deep Dependency Graph (if v3 supports it)
   - [ ] Quality metrics integration

#### 5.2 Per-Endpoint Checklist

For each endpoint migration:

- [ ] Implement OTLP client method
- [ ] Implement adapter transformation
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Deploy to staging with feature flag enabled
- [ ] Test with real data
- [ ] Monitor for errors and performance
- [ ] Validate with users (beta testing)
- [ ] Document any differences from legacy behavior

#### 5.3 Testing Strategy

- [ ] Unit tests: 100% coverage for adapter and client
- [ ] Integration tests: Test with mock backend
- [ ] E2E tests: Test with real backend (staging)
- [ ] Performance tests: Ensure no degradation
- [ ] Load tests: Verify scalability
- [ ] Visual regression tests: Screenshots of key pages
- [ ] Browser compatibility tests

### Phase 6: Production Rollout (2-3 weeks)

**Goal**: Gradually enable API v3 in production with monitoring.

#### 6.1 Rollout Strategy

- [ ] **Week 1**: Deploy with feature flag disabled (dry run)
- [ ] **Week 2**: Enable for internal users (10%)
- [ ] **Week 3**: Gradual rollout to users (25% → 50% → 100%)
- [ ] Monitor error rates, latency, user feedback at each stage

#### 6.2 Monitoring & Observability

- [ ] Add metrics for API v3 usage:
  - Request count per endpoint
  - Latency (p50, p95, p99)
  - Error rate
  - Adapter conversion time
- [ ] Add logging for debugging:
  - Log all API v3 requests/responses (debug level)
  - Log adapter conversion errors
  - Log feature flag state changes

- [ ] Set up alerts:
  - Error rate > threshold
  - Latency > threshold
  - Conversion failures

#### 6.3 Rollback Plan

- [ ] Document rollback procedure:
  1. Set `apiV3.enabled = false` in config
  2. Redeploy (or hot-reload config if supported)
  3. Verify traffic returns to legacy API
- [ ] Test rollback procedure in staging
- [ ] Ensure legacy API remains fully functional

### Phase 7: Optimization & Cleanup (3-4 weeks)

**Goal**: Optimize performance and remove legacy code.

#### 7.1 Performance Optimization

- [ ] Profile adapter conversion performance
- [ ] Optimize hot paths in adapter
- [ ] Consider caching for repeated conversions
- [ ] Benchmark against legacy implementation
- [ ] Optimize protobuf parsing (if using protobuf format)

#### 7.2 Code Cleanup

- [ ] Remove legacy API code (once v3 is stable):
  - [ ] Remove `src/api/jaeger.ts`
  - [ ] Remove `ApiClient` facade (make `OtlpApiClient` the default)
  - [ ] Remove feature flag checks
- [ ] Update documentation
- [ ] Remove dead code and unused imports

#### 7.3 Consider Native OTLP Consumption (Future)

Once API v3 is stable, consider migrating components to consume OTLP data directly:

- [ ] Update internal types to match OTLP (breaking change)
- [ ] Update components to work with OTLP data structures
- [ ] Remove adapter layer entirely
- [ ] Update all tests

**Note**: This is a major breaking change and should only be done if there's clear benefit.

---

## API Endpoint Mapping

### Legacy (`/api/`) → API v3 (`/api/v3/`)

| Legacy Endpoint                     | API v3 Endpoint                    | Notes                     |
| ----------------------------------- | ---------------------------------- | ------------------------- |
| `GET /api/traces/:id`               | `GetTrace(traceId)`                | Returns OTLP TracesData   |
| `GET /api/traces?traceID=...`       | `FindTraces(query)`                | Search by trace IDs       |
| `GET /api/traces?service=...`       | `FindTraces(query)`                | Search with filters       |
| `GET /api/services`                 | `GetServices()`                    | List of service names     |
| `GET /api/services/:svc/operations` | `GetOperations(service)`           | Operations for service    |
| `GET /api/operations?service=...`   | `GetOperations(service, spanKind)` | Filter by span kind       |
| `GET /api/dependencies`             | `GetDependencies(start, end)`      | Dependency graph          |
| `GET /api/metrics/:type`            | TBD                                | May not be in v3 spec yet |
| `POST /api/transform`               | N/A (adapter)                      | OTLP → Jaeger (remove)    |
| `POST /api/archive/:id`             | TBD                                | Archive functionality     |

### Query Parameter Mapping

Legacy search parameters need to be mapped to OTLP query format:

| Legacy Param  | OTLP Equivalent   | Transformation             |
| ------------- | ----------------- | -------------------------- |
| `service`     | `service_name`    | Direct mapping             |
| `operation`   | `operation_name`  | Direct mapping             |
| `tags`        | `span_attributes` | JSON → key-value pairs     |
| `start`       | `start_time_min`  | Microseconds → nanoseconds |
| `end`         | `start_time_max`  | Microseconds → nanoseconds |
| `minDuration` | `duration_min`    | Microseconds → nanoseconds |
| `maxDuration` | `duration_max`    | Microseconds → nanoseconds |
| `limit`       | `max_traces`      | Direct mapping             |

---

## Risks & Mitigation

### Risk 1: Data Loss or Corruption During Conversion

**Description**: OTLP adapter might lose data or incorrectly transform values.

**Impact**: High - Could result in incorrect trace visualization or missing information.

**Mitigation**:

- Comprehensive unit and integration tests for adapter
- Round-trip testing (if possible)
- Gradual rollout with extensive validation
- Keep legacy API available during migration
- Add logging to track conversion issues

### Risk 2: Performance Degradation

**Description**: Adapter introduces overhead in data processing.

**Impact**: Medium - Could slow down trace loading and search.

**Mitigation**:

- Performance benchmarks comparing legacy vs. OTLP paths
- Profile adapter code and optimize hot paths
- Consider caching frequently accessed traces
- Monitor latency metrics during rollout
- Optimize conversion algorithms

### Risk 3: Backend API v3 Not Ready

**Description**: Backend `/api/v3/` endpoints may not be fully implemented or stable.

**Impact**: High - Blocks entire migration.

**Mitigation**:

- Coordinate with backend team early
- Define clear API contract and test it
- Use mock backend for development
- Incremental endpoint migration allows partial deployment
- Maintain legacy API support indefinitely if needed

### Risk 4: Incompatible Data Models

**Description**: Some legacy Jaeger features may not map cleanly to OTLP.

**Impact**: Medium - May lose some features or require workarounds.

**Mitigation**:

- Document all incompatibilities upfront
- Use OTLP attributes to preserve legacy metadata
- Extend OTLP with custom attributes if necessary
- Communicate feature changes to users
- Provide migration guide for affected features

### Risk 5: Breaking Changes for Embedders

**Description**: External applications embedding Jaeger UI may break.

**Impact**: Medium - Could affect downstream users.

**Mitigation**:

- Maintain backward compatibility during migration
- Document all API changes
- Provide migration guide for embedders
- Version the API clearly
- Communicate changes in release notes

### Risk 6: User Experience Disruption

**Description**: UI might behave differently with OTLP data.

**Impact**: Medium - Could confuse users or break workflows.

**Mitigation**:

- Extensive visual regression testing
- Beta testing with real users
- Gather user feedback early
- Document any behavior changes
- Provide rollback mechanism

### Risk 7: Increased Maintenance Complexity (Short-term)

**Description**: Maintaining both legacy and OTLP paths adds complexity.

**Impact**: Low-Medium - Temporary technical debt.

**Mitigation**:

- Use feature flags to manage dual support
- Clear documentation of both paths
- Aggressive timeline for removing legacy code
- Code reviews to ensure quality
- Automated testing for both paths

---

## Success Metrics

### Technical Metrics

- [ ] **API Coverage**: 100% of legacy API endpoints migrated to v3
- [ ] **Test Coverage**: >90% coverage for adapter and client code
- [ ] **Performance**: No more than 5% latency increase vs. legacy
- [ ] **Error Rate**: <0.1% conversion errors
- [ ] **Backward Compatibility**: 0 breaking changes to component interfaces

### User Metrics

- [ ] **User Satisfaction**: >80% positive feedback on new implementation
- [ ] **Adoption**: 100% of production traffic on API v3 within 3 months
- [ ] **Bug Reports**: <5 critical bugs related to migration
- [ ] **Zero Data Loss**: No reports of missing or incorrect trace data

### Project Metrics

- [ ] **Timeline**: Complete migration within 6 months
- [ ] **Documentation**: All changes documented with migration guides
- [ ] **Rollback**: Zero production rollbacks required
- [ ] **Team Velocity**: No significant slowdown in feature development

---

## Alternatives Considered

### Alternative 1: Big Bang Migration

**Approach**: Replace all legacy API calls with OTLP in one release.

**Pros**:

- Faster completion (in theory)
- No dual-path maintenance
- Clean cut from legacy

**Cons**:

- High risk - one mistake affects everything
- No gradual validation
- Difficult to rollback
- High testing burden

**Verdict**: ❌ **Rejected** - Too risky for production system.

### Alternative 2: Backend-Only Transformation

**Approach**: Keep UI unchanged, transform OTLP → Jaeger in backend.

**Pros**:

- Zero UI changes required
- Backend controls transformation
- UI remains simple

**Cons**:

- Maintains legacy format dependency
- Doesn't achieve goal of native OTLP support
- Increases backend complexity
- Doesn't enable OTLP interoperability in UI

**Verdict**: ❌ **Rejected** - Doesn't meet long-term goals.

### Alternative 3: New UI from Scratch

**Approach**: Build entirely new UI for OTLP data model.

**Pros**:

- No legacy constraints
- Clean architecture
- Could leverage modern frameworks

**Cons**:

- Massive effort (6-12 months+)
- High risk
- Feature parity challenging
- User disruption

**Verdict**: ❌ **Rejected** - Not feasible with available resources.

### Alternative 4: Gradual Internal Model Migration

**Approach**: Migrate internal data model to OTLP, then update all components.

**Pros**:

- Eventually native OTLP consumption
- Clean final architecture

**Cons**:

- Requires updating 100+ components
- High risk of regressions
- Long timeline
- Large breaking change

**Verdict**: ⚠️ **Deferred** - Consider after adapter-based migration is stable.

### Alternative 5: Client-Side Protobuf Parsing

**Approach**: Parse protobuf-encoded OTLP data directly in browser.

**Pros**:

- More efficient than JSON
- Smaller payload size
- Direct binary parsing

**Cons**:

- Requires protobuf library in UI
- Increases bundle size
- More complex debugging
- Browser compatibility concerns

**Verdict**: ⚠️ **Future Consideration** - Start with JSON, migrate to protobuf later if needed.

---

## Dependencies & Prerequisites

### Backend Requirements

- [ ] Jaeger backend supports `/api/v3/` endpoints (gRPC or JSON)
- [ ] API v3 implements all required query operations
- [ ] Backend provides OTLP-formatted responses
- [ ] API v3 is stable and production-ready

### Frontend Requirements

- [ ] Node.js >=24 (already required)
- [ ] TypeScript support (already in place)
- [ ] Testing infrastructure (Jest, React Testing Library)

### External Dependencies

- [ ] OTLP type definitions (generate from proto or hand-write)
- [ ] Potentially gRPC-Web library (if using protobuf)
- [ ] Potentially protobuf parsing library

---

## Documentation Requirements

### Developer Documentation

- [ ] **Architecture Overview**: Document new API architecture
- [ ] **Adapter Guide**: Explain OTLP → Internal transformation
- [ ] **Migration Guide**: How to extend or modify the adapter
- [ ] **Testing Guide**: How to test both API paths
- [ ] **Debugging Guide**: How to troubleshoot conversion issues

### User Documentation

- [ ] **Feature Comparison**: Legacy vs. OTLP behavior differences
- [ ] **Configuration Guide**: How to enable API v3
- [ ] **Troubleshooting**: Common issues and solutions
- [ ] **Release Notes**: Document changes in each release

### API Documentation

- [ ] **Endpoint Reference**: Document all API v3 endpoints
- [ ] **Query Format**: Document OTLP query parameters
- [ ] **Response Format**: Document OTLP response structure
- [ ] **Error Codes**: Document error handling

---

## Open Questions

1. **What is the status of the backend `/api/v3/` implementation?**
   - Which endpoints are available?
   - What is the response format (gRPC-Web, JSON, protobuf)?
   - Is it production-ready?

2. **Are there any OTLP features not supported by legacy Jaeger?**
   - How should we handle OTLP-specific features like span links with multiple traces?
   - Should we extend the UI to support new OTLP features?

3. **Should we generate TypeScript types from proto files or write them manually?**
   - Code generation ensures accuracy but adds build complexity
   - Manual types are simpler but may drift from spec

4. **What is the long-term plan for the legacy API?**
   - Will it be deprecated and removed?
   - What is the timeline?

5. **Should we support both JSON and protobuf in the initial implementation?**
   - JSON is easier to debug but larger
   - Protobuf is more efficient but harder to work with

6. **How should we handle the `/api/transform` endpoint currently used for file uploads?**
   - Should file uploads directly use the adapter?
   - Should we remove the backend transform endpoint dependency?

---

## Decision Points

### Go / No-Go Criteria

**Go** if:

- ✅ Backend API v3 is available and stable
- ✅ Team has capacity for 6-month project
- ✅ Stakeholders support the migration
- ✅ Performance benchmarks show acceptable overhead (<5% latency)

**No-Go** if:

- ❌ Backend API v3 is not production-ready
- ❌ Unacceptable performance degradation (>10% latency)
- ❌ Critical features lost in OTLP migration
- ❌ Insufficient testing infrastructure

### Checkpoint Reviews

- **After Phase 2**: Review adapter quality and performance
- **After Phase 4**: Review integration and validate no regressions
- **After Phase 5**: Review each endpoint migration before moving to next
- **After Phase 6**: Review production metrics before full rollout

---

## Timeline Summary

| Phase                 | Duration        | Key Deliverables                              |
| --------------------- | --------------- | --------------------------------------------- |
| 1. Foundation         | 2-3 weeks       | Project structure, types, utils, feature flag |
| 2. OTLP Adapter       | 3-4 weeks       | Adapter implementation, comprehensive tests   |
| 3. OTLP API Client    | 2-3 weeks       | API client, error handling, tests             |
| 4. API Facade         | 2-3 weeks       | Unified interface, action integration         |
| 5. Endpoint Migration | 4-6 weeks       | Migrate endpoints incrementally               |
| 6. Production Rollout | 2-3 weeks       | Gradual rollout, monitoring                   |
| 7. Optimization       | 3-4 weeks       | Performance tuning, cleanup                   |
| **Total**             | **18-26 weeks** | **4.5-6.5 months**                            |

---

## Next Steps

1. **Stakeholder Review**: Present this ADR to engineering leadership and backend team
2. **Backend Coordination**: Confirm API v3 availability and format
3. **Resource Allocation**: Assign team members to the project
4. **Kick-off Meeting**: Align on timeline, milestones, and responsibilities
5. **Proof of Concept**: Build a minimal adapter for one endpoint to validate approach
6. **Begin Phase 1**: Create project structure and foundation

---

## References

- [OpenTelemetry Protocol Specification](https://opentelemetry.io/docs/specs/otel/protocol/)
- [Jaeger IDL API v3 Proto Files](https://github.com/jaegertracing/jaeger-idl/tree/main/proto/api_v3)
- [Jaeger UI Architecture Documentation](../../../CONTRIBUTING.md)
- [ADR 0001: Design Token-Based Theming](./0001-design-token-based-theming.md)

---

**Status**: Awaiting Review  
**Reviewers**: [TBD]  
**Next Review Date**: [TBD]
