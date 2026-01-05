# ADR 0002: Making Jaeger UI OpenTelemetry-Native

**Status**: Accepted  
**Last Updated**: 2025-12-29  
**Reviewed**: 2025-12-29

---

## TL;DR

This ADR presents a plan to make Jaeger UI "OpenTelemetry-native" by migrating the UI to use OpenTelemetry (OTEL) nomenclature and concepts throughout. We will build a facade over the existing internal data model that presents an OTEL-centric interface, migrate components incrementally to use OTEL terminology (attributes instead of tags, resource instead of process, events instead of logs), and finally switch to consuming OTLP data directly from `/api/v3/` endpoints.

**Key Insight**: Most components don't deeply depend on the exact trace data model - they only access small bits of it. This allows piecemeal migration.

**Recommendation**: Adopt a facade pattern over the legacy internal data model, enabling incremental component migration to OTEL nomenclature before switching backend APIs.

---

## Context & Problem

### Current State

Jaeger UI currently uses legacy Jaeger terminology throughout:
- **tags** (not OTEL "attributes")
- **process** (not OTEL "resource")
- **logs** (not OTEL "events")
- **serviceName** (not OTEL "resource.attributes['service.name']")
- **KeyValuePair** (not OTEL "Attribute" with typed values)

### The Data Flow

```
Backend (/api/) 
  → API Layer (jaeger.ts)
    → Actions (jaeger-api.ts)
      → Reducers (trace.ts) + Transform (transform-trace-data.tsx)
        → Redux Store (legacy Jaeger model)
          → Components (100+)
```

### Legacy Jaeger Data Model

```typescript
// Current internal types (src/types/trace.tsx)
KeyValuePair { key: string, value: any }
Process { serviceName: string, tags: KeyValuePair[] }
Log { timestamp: number, fields: KeyValuePair[] }
Span {
  spanID, traceID, processID,
  operationName,
  startTime, duration,
  tags: KeyValuePair[],
  logs: Log[],
  process: Process,
  references: SpanReference[],
  ...
}
```

### Component Usage Patterns

Analysis of 100+ components shows most access data through **simple properties**:

```typescript
// Common patterns in components:
span.process.serviceName          // ~30 usages
span.tags.find(t => t.key === X)  // ~25 usages
span.logs                         // ~15 usages
span.operationName                // ~40 usages
process.serviceName               // ~20 usages
```

**Key Observation**: Components don't deeply couple to data structure - they use simple accessor patterns.

### Problem Statement

**Goal**: Make Jaeger UI "OpenTelemetry-native"
- UI should use OTEL nomenclature everywhere
- Information architecture should match OTEL concepts
- Users should see OTEL terminology (attributes, resource, events)

**Why This Matters**:
1. Alignment with industry standard (OpenTelemetry)
2. Consistency with OTEL ecosystem and documentation
3. Future-proofing for OTEL-specific features
4. Reduced cognitive load for users familiar with OTEL

### What We Need: Facade Pattern

Build a **facade/wrapper over legacy data** that presents OTEL interface:
1. Legacy data stays in Redux store (initially)
2. Facade layer presents OTEL view: `.attributes`, `.resource`, `.events`
3. Components migrate to use facade (OTEL nomenclature)
4. Once all components migrated, swap to real OTLP from `/api/v3/`
5. Remove facade layer

---

## OTEL Data Model (Target State)

### OTEL Span Interface

```typescript
// Target: OTEL-centric interface
interface OtelSpan {
  // Identity
  traceId: string;              // was: traceID
  spanId: string;               // was: spanID
  parentSpanId?: string;        // was: references[0].spanID
  
  // Naming & Classification
  name: string;                 // was: operationName
  kind: SpanKind;               // was: derived from tags['span.kind']
  
  // Timing (microseconds initially, nanoseconds later)
  startTimeUnixMicros: number;  // was: startTime
  endTimeUnixMicros: number;    // was: startTime + duration
  durationMicros: number;       // keep for convenience
  
  // Core Data (OTEL terminology)
  attributes: Attribute[];      // was: tags: KeyValuePair[]
  events: Event[];              // was: logs: Log[]
  links: Link[];                // was: references (except parent)
  status: Status;               // was: derived from tags['error'], etc.
  
  // Context
  resource: Resource;           // was: process
  instrumentationScope: Scope;  // new OTEL concept (required in OTEL)
  
  // UI-specific (derived properties - keep these)
  depth: number;
  hasChildren: boolean;
  relativeStartTimeMicros: number;    // microseconds since trace start
  childSpanIds: string[];
  subsidiarilyReferencedBy: Link[];  // spans that reference this span via links (not parent)
}

// OTEL Resource (was Process)
interface Resource {
  attributes: Attribute[];      // includes service.name, etc.
  serviceName: string;          // convenience: attributes['service.name']
}

// OTEL Attribute (was KeyValuePair)
interface Attribute {
  key: string;
  value: AttributeValue;        // string | number | boolean | array | object
}

// OTEL Event (was Log)
interface Event {
  timeUnixMicro: number;        // was: timestamp
  name: string;                 // new: event type/name
  attributes: Attribute[];      // was: fields: KeyValuePair[]
}

// OTEL Link (was SpanReference for non-parent refs)
interface Link {
  traceId: string;
  spanId: string;
  attributes: Attribute[];
}

// OTEL Status
interface Status {
  code: StatusCode;             // ERROR, OK, UNSET
  message?: string;
}
```

### Nomenclature Mapping

| Legacy Jaeger         | OpenTelemetry           | Notes                     |
| --------------------- | ----------------------- | ------------------------- |
| `tags`                | `attributes`            | Core terminology change   |
| `process`             | `resource`              | Context terminology       |
| `process.serviceName` | `resource.serviceName`  | Convenience accessor      |
| `logs`                | `events`                | Semantic events not logs  |
| `operationName`       | `name`                  | Simpler, standard name    |
| `KeyValuePair`        | `Attribute`             | Typed values in OTEL      |
| `references`          | `parentSpanId + links`  | Split parent vs other refs|
| `spanID, traceID`     | `spanId, traceId`       | CamelCase consistency     |

### Span References vs. Links

In the legacy model reference types `CHILD_OF` | `FOLLOWS_FROM` were used to indicate both parent/child relations between spans as well as the blocking nature of the child span: a `CHILD_OF` span is presumed to block parent's execution, while a `FOLLOWS_FROM` span does not block parent's execution. In OTEL model the span hierarchy is represented explicitiy via `parentSpanID` field, but the blocking nature of the child span is not represented explicitly. Instead, it can be inferred from the child span's `span_kind`. A `PRODUCER`-`CONSUMER` pair of spans is a non-blocking pair, consumer runs independenly of the parent producer span and does not affet its critical path. Only `INTERNAL`/`CLIENT`/`SERVER` span kinds should be considered blocking.

---

## Decision

**Adopt a facade pattern approach with incremental component migration:**

1. **Phase 1**: Build OTEL facade over legacy internal data model
2. **Phase 2**: Migrate components to use facade (OTEL nomenclature)
3. **Phase 3**: Switch backend to `/api/v3/` OTLP data
4. **Phase 4**: Remove facade, use OTLP data directly

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Phase 1-2: Facade Pattern (OTEL view of legacy data)            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Backend (/api/ - legacy Jaeger JSON)                           │
│    ↓                                                             │
│  API Layer + Actions + Reducers (unchanged)                     │
│    ↓                                                             │
│  Redux Store: Legacy Jaeger Model                               │
│    {                                                             │
│      spans: Span[]  // legacy structure                         │
│      // spanID, operationName, tags, logs, process, etc.        │
│    }                                                             │
│    ↓                                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ OTEL FACADE LAYER (NEW)                                  │   │
│  │ src/model/                                                │   │
│  │                                                           │   │
│  │  - OtelSpanFacade wraps Span                             │   │
│  │    • .attributes → maps span.tags                        │   │
│  │    • .resource → maps span.process                       │   │
│  │    • .events → maps span.logs                            │   │
│  │    • .name → maps span.operationName                     │   │
│  │    • .spanId → maps span.spanID                          │   │
│  │                                                           │   │
│  │  - OtelTraceFacade wraps Trace                           │   │
│  │    • .spans → returns OtelSpanFacade[]                   │   │
│  │                                                           │   │
│  │  - Selectors: useOtelSpan(), useOtelTrace()             │   │
│  └──────────────────────────────────────────────────────────┘   │
│    ↓                                                             │
│  Components (GRADUALLY MIGRATED)                                │
│  - Use otelSpan.attributes instead of span.tags                 │
│  - Use otelSpan.resource instead of span.process                │
│  - Use otelSpan.events instead of span.logs                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Phase 3-4: Native OTLP (remove facade)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Backend (/api/v3/ - OTLP JSON/protobuf)                        │
│    ↓                                                             │
│  API Layer: OTLP Client (NEW)                                   │
│    ↓                                                             │
│  Redux Store: OTLP Model (DIRECTLY)                             │
│    {                                                             │
│      spans: OtelSpan[]  // native OTLP structure                │
│      // spanId, name, attributes, events, resource, etc.        │
│    }                                                             │
│    ↓                                                             │
│  Components (ALREADY MIGRATED - no changes needed)              │
│  - Already using .attributes, .resource, .events                │
│  - Facade removed, using native OTLP directly                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **OTEL-Native UI**: All components use OTEL terminology
2. **Incremental Migration**: Migrate components one-by-one
3. **Testable**: Each component migration is independently testable
4. **Backwards Compatible**: Old and new components coexist during migration
5. **Backend Switch Last**: Change backend API only after UI is ready

---

## Implementation Plan

### Phase 1: Build OTEL Facade ✅

**Goal**: Create facade layer that presents OTEL interface over legacy data.

#### 1.1 Create Facade Types ✅
  ```typescript
  export interface OtelSpan { ... }
  export interface OtelTrace { ... }
  export interface Resource { ... }
  export interface Attribute { ... }
  export interface Event { ... }
  export interface Link { ... }
  export interface Status { ... }
  export enum SpanKind { ... }
  export enum StatusCode { ... }
  ```

#### 1.2 Implement Facade Classes ✅
  ```typescript
  export class OtelSpanFacade implements OtelSpan {
    constructor(private legacySpan: Span) {}
    
    // Map legacy → OTEL
    get spanId(): string { return this.legacySpan.spanID; }
    get name(): string { return this.legacySpan.operationName; }
    get attributes(): Attribute[] { 
      return this.legacySpan.tags.map(kv => ({
        key: kv.key,
        value: kv.value
      }));
    }
    get resource(): Resource {
      return {
        attributes: this.legacySpan.process.tags,
        serviceName: this.legacySpan.process.serviceName
      };
    }
    get events(): Event[] {
      return this.legacySpan.logs.map(log => ({
        timeUnixMicro: log.timestamp,
        name: log.fields.find(f => f.key === 'event')?.value || 'log',
        attributes: log.fields
      }));
    }
    // ... all other mappings
  }
  ```

- ✅ Create `src/model/OtelTraceFacade.tsx`
- ✅ Create `src/model/OtelSpanFacade.tsx`

#### 1.3 Create Facade Selectors ✅
  ```typescript
  // Redux selectors that return facade wrappers
  export const selectOtelTrace = (state, traceId) => {
    const legacyTrace = selectTrace(state, traceId);
    return legacyTrace ? new OtelTraceFacade(legacyTrace) : null;
  };
  
  export const selectOtelSpans = (state, traceId) => {
    const legacyTrace = selectTrace(state, traceId);
    return legacyTrace?.spans.map(s => new OtelSpanFacade(s)) || [];
  };
  ```

#### 1.4 Create React Hooks ✅
  ```typescript
  export const useOtelTrace = (traceId: string): OtelTrace | null => {
    const trace = useSelector(state => selectOtelTrace(state, traceId));
    return trace;
  };
  
  export const useOtelSpan = (traceId: string, spanId: string): OtelSpan | null => {
    const spans = useSelector(state => selectOtelSpans(state, traceId));
    return spans.find(s => s.spanId === spanId) || null;
  };
  ```

#### 1.6 Terminology Toggle Feature Flag
Introduce a top-level configuration flag `useOpenTelemetryTerms` (defaulting to `false`) to control the display terminology.

- When `false`: Use legacy terminology (Tags, Logs, Processes, References, Operation Name).
- When `true`: Use OpenTelemetry terminology (Attributes, Events, Resources, Links, Span Name).

**Implementation Guidelines**:
- Components MUST check this flag before rendering labels or choosing which properties of the facade to display.
- Prefer using the `OtelSpanFacade` even when the flag is `false`, as the facade provides a unified interface, but use the flag to decide which terminology to present to the user.

#### 1.7 Testing ✅
- ✅ Test all property mappings
- ✅ Test with real trace data
- ✅ Performance benchmarks (facade overhead should be minimal)

### Phase 2: Component Migration

**Goal**: Migrate components incrementally to use OTEL facade.

#### Component Categories

**Category A: High Priority - Heavy Tag/Process/Log Users** (~20 components)
- TraceTimelineViewer components (SpanDetail, VirtualizedTraceView, etc.)
- TraceStatistics components
- SearchResults components

**Category B: Medium Priority - Moderate Users** (~30 components)
- TracePage header components
- TraceSpanView components
- Flamegraph components

**Category C: Low Priority - Light or No Direct Usage** (~50 components)
- Layout/container components
- Utility components

#### Per-Component Migration

**For each component:**

1. **Identify legacy property usage:**
   - `span.tags` → `otelSpan.attributes`
   - `span.process` → `otelSpan.resource`
   - `span.logs` → `otelSpan.events`
   - `span.operationName` → `otelSpan.name`
   - `span.spanID` → `otelSpan.spanId`
   - `process.serviceName` → `resource.serviceName`

2. **Update to use facade:**
   ```typescript
   // Before:
   const span = useSelector(state => selectSpan(state, spanId));
   const tags = span.tags;
   const serviceName = span.process.serviceName;
   
   // After:
   const otelSpan = useOtelSpan(traceId, spanId);
   const attributes = otelSpan.attributes;
   const serviceName = otelSpan.resource.serviceName;
   ```

3. **Update UI labels:**
  Use `config.useOpenTelemetryTerms` to control which labels to display:
   - Legacy → OpenTelemetry
   - "Tags" → "Attributes"
   - "Process" → "Resource"
   - "Logs" → "Events"
   - "references" → "Links"
   - "operationName" → "spanName"

4. **Update tests:**
   - Mock OtelSpan instead of Span
   - Test with facade wrapped data

5. **Visual regression test**
6. **Code review and merge**

#### Detailed Component Breakdown

**Pilot Migration**
- [x] `TraceTimelineViewer/SpanDetail/KeyValuesTable` - Tags → Attributes ✅
- [x] `TraceTimelineViewer/SpanDetail/AccordianLogs` - Logs → Events ✅

**Core Display Components**
- [x] `TraceTimelineViewer/VirtualizedTraceView` - Main trace view ✅
- [x] `TraceTimelineViewer/SpanBarRow` - Span bars ✅
- [x] `TraceTimelineViewer/SpanDetailRow` - Span details ✅
- [x] `TraceTimelineViewer/utils` - Utility functions (isErrorSpan, etc.) ✅

**Statistics & Analysis**
- [x] `TraceStatistics/tableValues` - Heavy tag user ✅
- [x] `TraceStatistics/PopupSql` - Tag extraction ✅
- [x] `TraceStatistics/index` - Statistics display ✅

**Search & Results**
- [x] `SearchResults/ResultItem` - Service name display ✅
- [ ] `SearchTracePage` - Trace list

**Supporting Components**
- [x] `TracePageHeader` - Header info ✅
- [x] `TraceFlamegraph` - Flamegraph view ✅
- [ ] `TraceSpanView` - Span table view

**Remaining Components**
- [x] `model/ddg/transformTracesToPaths` - DDG Path Aggregation ✅
- [ ] All remaining Category B and C components
- [ ] Verification and final testing

### Phase 3: Backend API Switch

**Goal**: Switch from `/api/` to `/api/v3/` OTLP endpoints.

#### 3.1 OTLP API Client

- [ ] Create `src/api/v3/client.ts`:
  ```typescript
  export class OtlpApiClient {
    async getTrace(traceId: string): Promise<OtelTrace> {
      const response = await fetch(`/api/v3/traces/${traceId}`);
      const otlpData = await response.json();
      return parseOtlpTrace(otlpData);
    }
    
    async findTraces(query: SearchQuery): Promise<OtelTrace[]> {
      // ... implement with OTLP query params
    }
  }
  ```

#### 3.2 OTLP Parser

- [ ] Create `src/api/v3/parser.ts`:
  ```typescript
  // Parse OTLP JSON/protobuf → OtelSpan/OtelTrace
  export function parseOtlpTrace(otlpData: any): OtelTrace {
    // Direct OTLP → OtelSpan (no legacy conversion)
    // Still add UI-specific derived fields:
    // - depth, hasChildren, relativeStartTimeMicros, childSpanIds
  }
  ```

#### 3.3 Redux Integration

- [ ] Update `src/reducers/trace.ts` to use OTLP parser
- [ ] Add feature flag for gradual rollout
- [ ] Testing and validation

### Phase 4: Cleanup & Optimization

**Goal**: Remove facade layer and legacy code.

- [ ] Remove `OtelSpanFacade`, `OtelTraceFacade` classes
- [ ] Update selectors to return OtelSpan directly
- [ ] Remove legacy types (mark as deprecated first)
- [ ] Remove `src/api/jaeger.ts` (old REST API)
- [ ] Remove `transformTraceData` (old transformer)
- [ ] Documentation updates

---

## Component Migration Details

### High Priority Components

**1. TraceTimelineViewer/SpanDetail/**
Files: `index.tsx`, `KeyValuesTable.tsx`, `AccordianKeyValues.tsx`, `AccordianLogs.tsx`, `AccordianReferences.tsx`

Changes needed:
- `process.serviceName` → `resource.serviceName`
- `tags` → `attributes` (heavy usage)
- `logs` → `events` (with event.name handling)
- UI labels: "Tags" → "Attributes", "Logs" → "Events", "Process" → "Resource"

**2. TraceTimelineViewer/VirtualizedTraceView.tsx**
Heavy user of `span.tags.find(...)` for `peer.service`, `span.kind`

Changes needed:
- Multiple `span.tags.find(...)` → `span.attributes.find(...)`
- `span.process.serviceName` → `span.resource.serviceName` (multiple times)

**3. TraceTimelineViewer/utils.tsx**
Utility functions: `isErrorSpan`, `isKindClient`, etc.

Changes needed:
- `span.tags.some(...)` → `span.attributes.some(...)`

**4. TraceStatistics/tableValues.tsx**
Heavy tag iteration and filtering

Changes needed:
- `span.tags.length`, `span.tags[tagIndex]` → attributes equivalents
- `span.process.serviceName` → `span.resource.serviceName`

**5. TraceSpanView/index.tsx**
Service name operations map

Changes needed:
- `span.process.serviceName` → `span.resource.serviceName`
- Filter key names update

**6. SearchResults/ResultItem.tsx**
Error checking with service name

Changes needed:
- `sp.process.serviceName` → `sp.resource.serviceName`

---

## Risks & Mitigation

### Risk 1: Facade Performance Overhead

**Impact**: Medium - Could slow down large trace rendering

**Mitigation**:
- Performance benchmarks before/after
- Memoization for facade wrappers
- Profile hot paths
- Facade is temporary (removed in Phase 4)

### Risk 2: Incomplete Component Migration

**Impact**: High - Components break when facade is removed

**Mitigation**:
- Comprehensive search for all usages
- TypeScript strict mode catches issues
- Gradual migration with coexistence
- Code review for each component
- Create linter rule to detect legacy property access

### Risk 3: UI/UX Regressions

**Impact**: Medium - User experience degrades

**Mitigation**:
- Visual regression testing
- Manual testing for each component
- Beta testing with internal users
- Gradual rollout
- Easy rollback per component

### Risk 4: Backend API Not Ready

**Impact**: High - Blocks Phase 3

**Mitigation**:
- Coordinate with backend team early
- Phase 1-2 can proceed independently
- Mock OTLP data for testing
- Feature flag allows using legacy API

---

## Success Metrics

### Technical Metrics

- [ ] **Component Migration**: 100% of components use OTEL nomenclature
- [ ] **Test Coverage**: Maintain or exceed current coverage (>80%)
- [ ] **Performance**: No regression in trace loading (±5%)
- [ ] **Type Safety**: TypeScript strict mode passes

### User Metrics

- [ ] **Visual Parity**: No visual regressions
- [ ] **User Feedback**: >80% positive on OTEL terminology
- [ ] **Error Rate**: No increase in client errors
- [ ] **Adoption**: Users understand OTEL terminology

---

## Next Steps

1. **Review & Approval** - Present ADR to team and stakeholders
2. **Backend Coordination** - Confirm `/api/v3/` timeline with backend team
3. **Phase 1 Kickoff** - Create facade layer structure
4. **Pilot Migration** - Migrate 1-2 pilot components to validate approach
5. **Component Migration** - Follow incremental migration schedule
6. **Backend Switch** - Coordinate switch to `/api/v3/`
7. **Cleanup** - Remove facade and legacy code

---

## References

- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [OpenTelemetry Tracing Spec](https://opentelemetry.io/docs/specs/otel/trace/)
- [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/)
- [Jaeger IDL API v3 Proto Files](https://github.com/jaegertracing/jaeger-idl/tree/main/proto/api_v3)
- [Jaeger UI Architecture](../../CONTRIBUTING.md)

---

**Status**: Accepted  
**Reviewed By**: @yurishkuro  
**Review Date**: 2025-12-29
