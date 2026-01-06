# ADR 0004: State Management Strategy for Jaeger UI

**Status**: Proposed  
**Last Updated**: 2026-01-05  
**Reviewed**: Pending

---

## TL;DR

This ADR evaluates three state management approaches for Jaeger UI's long-term architecture: **React Context/Hooks**, **Zustand**, and **Redux Toolkit (RTK)**. The primary challenge is handling heavy trace objects (5,000+ spans) while maintaining performance, contributor ergonomics, and alignment with React's future (React Server Components, Concurrent Mode, React Compiler).

**Key Insight**: Jaeger UI's data pattern is "Heavy Object Analysis," not "High-Frequency Live Updates." We load massive, immutable JSON traces (up to 50,000+ spans) and provide filtering/visualization tools. This extreme scale favors different trade-offs than typical CRUD applications.

**Recommendation**: **Adopt Zustand + React Query** as the strategic state management architecture. At 50,000-span scale, Zustand's selective subscription model and minimal overhead become critical advantages. Combined with React Query for server state and mandatory virtualization (@tanstack/react-virtual), this provides the only viable path to smooth performance while maintaining contributor simplicity. This creates a cohesive TanStack ecosystem: **Zustand + TanStack Query + TanStack Virtual**.

---

## Context & Problem

### Current State

Jaeger UI currently uses **Redux** (classic pattern, pre-RTK) for state management across the application. While functional, this presents several challenges:

1. **Legacy Redux Overhead**: Significant boilerplate distributed across the codebase:
    - **10 Reducers**: Complex domain logic spread across files like `trace.ts` (178 lines) and `services.ts` (114 lines).
    - **18+ Action Creators**: Defined using `redux-actions`, adding layers of indirection.
    - **21+ Connected Components**: Using the legacy `connect(mapStateToProps, mapDispatchToProps)` pattern, which often averages 30-50 lines of boilerplate per component just for state plumbing.
    - **Fragmented Selectors**: Logic is often duplicated or defined inline within `mapStateToProps`, making it hard to reuse or optimize.

### Current Redux State Mapping

The current Redux store is a monolith containing both **Server State** (data from APIs) and **Client UI State** (ephemeral view settings).

#### 1. Server State (Data)
These should be migrated to **React Query**:
| State Slice | Description | Primary Consumers |
|-------------|-------------|-------------------|
| `trace` | Map of `FetchedTrace` and `search` results | `TracePage`, `SearchPage` |
| `services` | Lists of services and operations | `SearchPage`, `MonitorPage` |
| `dependencies`| Service dependency graph data | `DependenciesPage` |
| `metrics` | Sytem performance metrics (latencies, errors) | `MonitorPage` |
| `ddg` | Deep Dependency Graph data | `DeepDependenciesPage` |
| `archive` | Status of archived traces | `TracePage` |

#### 2. Client UI State (View)
These should be migrated to **Zustand**:
| State Slice | Description | Primary Consumers |
|-------------|-------------|-------------------|
| `traceTimeline`| Collapsed spans (`childrenHiddenIDs`), open detail tabs (`detailStates`), column widths | `TraceTimelineViewer` |
| `traceDiff` | Comparison state between two traces | `TraceDiff` |
| `embedded` | UI flags for iframe/embedded mode | `TopNav`, `Page` |
| `config` | Feature flags and app configuration | Global |

**Critical Observation**: Some UI state (like `traceTimeline`) is globally shared but context-specific to a single trace. This leads to complexity in manually clearing state when switching traces, a problem that Zustand's modular stores and React Query's cache invalidation will solve naturally.

2. **Extreme Trace Scale**: Single traces can contain **50,000+ spans**, each with attributes, events, and resource information - totaling hundreds of MB of data
3. **Performance Critical**: At 50K scale, even minor inefficiencies cause UI freezes. Global store updates triggering unnecessary re-renders become catastrophic.
4. **Contributor Friction**: Learning Redux adds cognitive load for new open-source contributors
5. **React Evolution**: Uncertainty about Redux compatibility with React Server Components (RSC) and React Compiler

### The Core Use Case: Heavy Object Analysis

Unlike typical web applications with high-frequency real-time updates, Jaeger UI has a distinct data pattern:

**What We Have**:
- Load large, complex, **immutable** trace JSON (once)
- Provide tools to filter, search, expand/collapse, and visualize
- Minimal "live" data updates (traces are historical snapshots)
- Client-side filtering and derived computations (critical path, statistics)

**What We Don't Have**:
- Real-time streaming updates
- Frequent server mutations
- Multi-user collaborative editing
- Optimistic updates

This pattern significantly influences which state management solution is optimal.

### Project Constraints

As an **open-source project**, we must optimize for:

1. **Low Barrier to Entry**: Contributors should quickly understand the architecture
2. **Stability**: Minimize maintenance churn from dependency updates
3. **React Core Alignment**: Follow React team's long-term philosophy and best practices
4. **Bundle Size**: Keep the UI lightweight
5. **Performance**: Handle 50,000+ span traces without lag
6. **Legacy Class Components**: ~40 class components exist that haven't been migrated to functional components (see analysis below)

### Class Component Constraint

Jaeger UI currently has **~40 legacy class components** that predate the hooks era. This affects state management choices differently:

**Impact on React Context:**
- Class components use `<Context.Consumer>` render props or `static contextType`
- Still suffers from same re-render issues
- Slightly more verbose than hooks

**Impact on Zustand:**
- Class components **cannot use hooks** (`useTraceStore()`)
- **Solutions**:
  1. Use Zustand's non-hook API: `store.subscribe()` and `store.getState()`
  2. Create HOC wrapper for class components
  3. Convert class components to functional components (long-term)
- Works fine but requires bridge pattern during migration

**Impact on Redux:**
- Redux's traditional pattern (`connect()` HOC) was **designed for class components**
- Class components have **zero friction** with Redux
- This is actually a point in Redux's favor for the interim migration period

**Verdict**: The class component constraint slightly favors Redux for the short-term, but doesn't change the long-term recommendation because:
1. React is moving away from class components (React team discourages new ones)
2. The 40 class components will eventually need conversion anyway
3. Zustand works fine with class components using HOCs or direct store access
4. Migration path should include gradual class→functional conversion alongside state management migration

---

## Research Criteria

The evaluation focuses on five key dimensions:

### 1. Memory Efficiency

**Question**: How does each solution handle large, immutable trace objects? Risk of memory bloat or stale closures?

### 2. Re-render Scalability

**Question**: In a timeline with 50,000 spans (using virtualization to render ~100 visible at a time), how effectively does each prevent "global flickering" when a single span's UI state (e.g., `isHovered`) changes? Can it handle rapid state changes (e.g., mouse moving across spans at 60 FPS)?

### 3. Governance & Maintenance

**Question**: What is the "Bus Factor" and project health? Which is most likely to be maintained and compatible with React 19/20+?

### 4. Contributor Ergonomics

**Question**: What is the "Boilerplate vs. Clarity" ratio for adding new features (e.g., a "Trace Statistics" view)?

### 5. Integration with Server State

**Question**: How well does each complement **React Query** or **SWR** for separating server state (fetching/caching) from UI state?

---

## Option 1: React Context + Hooks

### Architecture

Use React's built-in Context API with `useContext`, `useState`, and `useReducer` for global state management.

```typescript
// Example: Trace Context
const TraceContext = createContext<TraceState | null>(null);

function TraceProvider({ children }: { children: React.ReactNode }) {
  const [traceData, setTraceData] = useState<Trace | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  
  const value = useMemo(() => ({
    traceData,
    expandedSpans,
    toggleSpan: (spanId: string) => { /* ... */ }
  }), [traceData, expandedSpans]);
  
  return <TraceContext.Provider value={value}>{children}</TraceContext.Provider>;
}
```

### Evaluation

| Criterion | Assessment | Grade |
|-----------|------------|-------|
| **Memory Efficiency** | **Moderate Risk**: Large objects passed through Context can cause memory overhead issues. If not carefully memoized, every context update creates new object references, potentially bloating memory with historical copies during garbage collection cycles. At 50K span scale (hundreds of MB), this becomes critical. | ⚠️ C+ |
| **Re-render Scalability** | **Completely Unusable**: Context changes trigger re-renders of **all** consuming components. At 50,000 spans, even with virtualization rendering only ~100 visible spans, a single hover state change would attempt to re-render hundreds of components. Even with aggressive context splitting (20+ separate contexts), performance would be unacceptable. The UI would freeze on every interaction. | ⛔ **F** |
| **Governance & Maintenance** | **Excellent**: Built into React, zero maintenance burden. React 19 improved Context API with simplified provider syntax (`<Context>` instead of `<Context.Provider>`) and better DevTools support. Future-proof. | ✅ A+ |
| **Contributor Ergonomics** | **Mixed**: Simple to understand conceptually, but managing complex state with `useReducer` can become verbose. Splitting contexts to avoid re-render issues creates architectural complexity ("context hell"). Moderate learning curve for optimization patterns. | ⚠️ C+ |
| **Server State Integration** | **Good**: Works naturally with React Query. Use Context for UI state (filters, expand/collapse), React Query for trace data. Clear separation of concerns. | ✅ B+ |

### Memory Efficiency Deep Dive

- **Problem**: When passing large trace objects through Context, any update forces creation of new references
- **Mitigation Required**: 
  - Split contexts by concern (TraceDataContext, UIStateContext, FiltersContext)
  - Aggressive `useMemo` for context values
  - Avoid storing entire 5,000-span array in single context
- **Risk**: Even with mitigations, large object updates can cause GC pressure

### Re-render Performance Analysis

**Scenario**: User hovers over span #2,742 in a 5,000-span trace

Without optimization:
```typescript
// ❌ ALL components consuming TraceContext re-render
const { hoveredSpanId } = useContext(TraceContext);
// Even spans that don't care about hover state re-render
```

With optimization:
```typescript
// ✅ Requires splitting into multiple contexts
const { hoveredSpanId } = useContext(HoverStateContext);  // Separate context
const traceData = useContext(TraceDataContext);          // Different context
```

**Verdict**: Even with 20+ separate contexts, performance would be unacceptable at 50K scale. Context API is **completely ruled out** for this use case. The re-render overhead would make the UI unusable.

### React Core Alignment

**React 19 Improvements**:
- Simplified provider syntax: `<Context>` instead of `<Context.Provider>`
- New `use()` hook for conditional context consumption
- Better DevTools integration

**React Compiler Compatibility**: The React Compiler (v1.0 stable Oct 2025) auto-memoizes components, which **partially** mitigates Context re-render issues by preventing unnecessary child re-renders even when parent re-renders. However, it doesn't prevent the initial context consumer re-renders.

**Verdict**: Well-aligned with React's future, but doesn't solve core scalability issues for large component trees.

---

## Option 2: Zustand

### Architecture

Zustand is a lightweight (< 1KB), unopinionated state management library using a subscription-based model.

```typescript
// Example: Trace Store
import { create } from 'zustand';

interface TraceStore {
  traceData: Trace | null;
  expandedSpans: Set<string>;
  hoveredSpanId: string | null;
  
  setTraceData: (trace: Trace) => void;
  toggleSpan: (spanId: string) => void;
  setHoveredSpan: (spanId: string | null) => void;
}

const useTraceStore = create<TraceStore>((set) => ({
  traceData: null,
  expandedSpans: new Set(),
  hoveredSpanId: null,
  
  setTraceData: (trace) => set({ traceData: trace }),
  toggleSpan: (spanId) => set((state) => {
    const newSet = new Set(state.expandedSpans);
    newSet.has(spanId) ? newSet.delete(spanId) : newSet.add(spanId);
    return { expandedSpans: newSet };
  }),
setHoveredSpan: (spanId) => set({ hoveredSpanId: spanId }),
}));

// Usage in component - selective subscription
function SpanRow({ spanId }: { spanId: string }) {
  // ✅ Only re-renders when hoveredSpanId changes, not when expandedSpans changes
  const hoveredSpanId = useTraceStore((state) => state.hoveredSpanId);
  const isHovered = hoveredSpanId === spanId;
  
  return <div className={isHovered ? 'hovered' : ''}>{/* ... */}</div>;
}
```

### Evaluation

| Criterion | Assessment | Grade |
|-----------|------------|-------|
| **Memory Efficiency** | **Excellent**: Direct state updates without creating intermediate copies. Proxy-based system efficiently tracks changes. Immutable patterns with Immer middleware available if needed. Minimal memory overhead for large objects. | ✅ A |
| **Re-render Scalability** | **Excellent**: **Selective subscriptions** are Zustand's superpower. Components only re-render when their selected state slice changes. A hover state change affects only components subscribed to `hoveredSpanId`, not the entire 5,000-span tree. `useShallow` for object/array selections prevents unnecessary re-renders. | ✅ A+ |
| **Governance & Maintenance** | **Strong**: Maintained by Poimandres (Three.js ecosystem). 14M+ weekly downloads. Active development, React 19 compatible. Smaller community than Redux but healthy and responsive. Lower bus factor than React Context (not built-in) but strong open-source health. | ✅ A- |
| **Contributor Ergonomics** | **Excellent**: Minimal boilerplate, intuitive API. Learning curve ~30 minutes for someone familiar with React hooks. No provider wrappers, no action/reducer ceremony. Easy to add new state slices. | ✅ A+ |
| **Server State Integration** | **Excellent**: Explicitly designed to complement React Query. Use Zustand for client UI state, React Query for server state. Clean separation prevents state duplication. React Query docs recommend this pattern. | ✅ A+ |

### Memory Efficiency Deep Dive

**Strengths**:
- Direct mutations within `set()` callback - no middleware overhead
- Doesn't create shadow copies of entire state tree on every update
- Garbage collection friendly - old references released efficiently

**Handling Large Traces**:
```typescript
// ✅ Efficient: Only store reference, not duplicate
const useTraceStore = create<TraceStore>((set) => ({
  traceData: null,  // Single reference to trace object
  
  setTraceData: (trace) => set({ traceData: trace }),
  // trace object lives in memory once, not duplicated in store
}));
```

**Verdict**: Optimal for Jaeger UI's extreme-scale pattern. At 50K spans, Zustand's minimal overhead becomes critical.

### Re-render Performance Analysis

**Scenario**: User hovers over span #2,742 in a 5,000-span trace

```typescript
// ✅ Only components selecting hoveredSpanId re-render
function SpanRow({ spanId }) {
  const isHovered = useTraceStore((state) => state.hoveredSpanId === spanId);
  // This component ONLY re-renders when hoveredSpanId changes AND matches this spanId
}

// ✅ Components selecting other state are unaffected
function TraceHeader() {
  const traceName = useTraceStore((state) => state.traceData?.traceName);
  // DOES NOT re-render when hoveredSpanId changes
}
```

**Performance Testing** (from research):
- Tested with 10,000+ component applications
- Minimal re-render count compared to Context API
- Automatic batching of state updates
- With virtualization (@tanstack/react-virtual), only visible components re-render

**Critical Insight**: At 50K scale, **virtualization is mandatory** regardless of state management. You cannot render 50,000 DOM nodes. With @tanstack/react-virtual rendering ~100 visible spans:
- Zustand's selective subscriptions ensure only the 1-2 components that care about `hoveredSpanId` re-render
- Total re-render count: ~2 components vs. Context's ~100+ components

**TanStack Synergy**: Using @tanstack/react-virtual with @tanstack/react-query creates a cohesive ecosystem from the same maintainers, ensuring compatibility and consistent patterns.

**Verdict**: Exceeds performance requirements for 50,000-span traces when combined with virtualization.

### Contributor Ergonomics Deep Dive

**Adding a New Feature: "Trace Filters"**

```typescript
// Zustand approach - add to store
const useTraceStore = create<TraceStore>((set) => ({
  // Existing state...
  filters: { serviceName: '', spanKind: null },
  
  // New action - simple function
  setFilters: (filters) => set({ filters }),
}));

// Usage - one-liner
function FilterBar() {
  const { filters, setFilters } = useTraceStore();
  return <input value={filters.serviceName} onChange={e => setFilters({ ...filters, serviceName: e.target.value })} />;
}
```

**Lines of Code**: ~10 lines total

**Compare to Redux** (below) - 3-4x less boilerplate.

**Verdict**: Lowest friction for open-source contributors.

### Community & Ecosystem

**Download Stats** (2024-2025):
- 14M+ weekly downloads (npm)
- Active development throughout 2024
- React 19 compatibility confirmed (Nov 2024)

**Ecosystem**:
- Middleware: `persist`, `devtools`, `immer`, `subscribeWithSelector`
- TypeScript-first design
- Works outside React (Vanilla JS, Node.js)

**Bus Factor Mitigation**:
- Multiple core maintainers from Poimandres collective
- Simple 1KB core - could be forked if needed
- Well-documented, stable API

---

## Option 3: Redux Toolkit (RTK)

### Architecture

Redux Toolkit is the modern, official Redux approach with reduced boilerplate and built-in best practices.

```typescript
// Example: Trace Slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TraceState {
  traceData: Trace | null;
  expandedSpans: Set<string>;
  hoveredSpanId: string | null;
}

const traceSlice = createSlice({
  name: 'trace',
  initialState: {
    traceData: null,
    expandedSpans: new Set<string>(),
    hoveredSpanId: null,
  } as TraceState,
  reducers: {
    setTraceData: (state, action: PayloadAction<Trace>) => {
      state.traceData = action.payload;
    },
    toggleSpan: (state, action: PayloadAction<string>) => {
      const spanId = action.payload;
      if (state.expandedSpans.has(spanId)) {
        state.expandedSpans.delete(spanId);
      } else {
        state.expandedSpans.add(spanId);
      }
    },
    setHoveredSpan: (state, action: PayloadAction<string | null>) => {
      state.hoveredSpanId = action.payload;
    },
  },
});

export const { setTraceData, toggleSpan, setHoveredSpan } = traceSlice.actions;
export default traceSlice.reducer;

// Usage in component
function SpanRow({ spanId }: { spanId: string }) {
  const dispatch = useDispatch();
  const hoveredSpanId = useSelector((state: RootState) => state.trace.hoveredSpanId);
  
  return (
    <div 
      onMouseEnter={() => dispatch(setHoveredSpan(spanId))}
      className={hoveredSpanId === spanId ? 'hovered' : ''}
    >
      {/* ... */}
    </div>
  );
}
```

### Evaluation

| Criterion | Assessment | Grade |
|-----------|------------|-------|
| **Memory Efficiency** | **Good**: RTK includes Immer for immutable updates with mutable syntax. State normalization helps (storing spans by ID rather than nested arrays). However, Redux's serialization constraints and middleware overhead add memory footprint compared to Zustand. | ✅ B+ |
| **Re-render Scalability** | **Good with Optimization**: `useSelector` with equality functions prevents unnecessary re-renders. Use memoized selectors (Reselect) for derived data. Granular subscriptions possible but require discipline. Performance similar to Zustand when optimized but requires more manual effort. | ✅ B+ |
| **Governance & Maintenance** | **Excellent**: Official Redux team (now React core team member Mark Erikson). Massive ecosystem, 9M+ weekly downloads. Long-term stability guaranteed. However, React Server Components compatibility is limited - **Redux only works in Client Components** (`"use client"`). | ✅ A- |
| **Contributor Ergonomics** | **Moderate**: RTK significantly reduced Redux boilerplate compared to classic Redux, but still more ceremonial than Zustand. Must understand slices, actions, reducers, `useSelector`, `useDispatch`. DevTools are excellent. Learning curve ~2-3 hours. | ⚠️ B- |
| **Server State Integration** | **Good**: RTK Query is Redux's built-in answer to React Query. Provides caching, invalidation, and optimistic updates. However, if already using React Query, having two data-fetching libraries adds complexity. RTK Query is Redux-specific, less portable than React Query. | ✅ B |

### Memory Efficiency Deep Dive

**Strengths**:
- **Immer Integration**: Write "mutable" code that produces immutable updates efficiently
- **State Normalization**: Store spans as `{ [spanId]: span }` instead of arrays reduces lookup overhead

```typescript
// ✅ Normalized state structure
interface TraceState {
  spans: {
    byId: { [spanId: string]: Span };
    allIds: string[];
  };
}
```

**Weaknesses Compared to Zustand**:
- Middleware overhead (redux-thunk, redux-devtools, etc.)
- Serialization constraints (no functions, class instances in state)
- Larger bundle size (~13KB vs Zustand's 1KB)

**Verdict**: Efficient but heavier than Zustand.

### Re-render Scalability Deep Dive

**At 50,000-Span Scale**: Virtualization is mandatory. Using `@tanstack/react-virtual` to render only visible spans (~100-200 at a time).

**Optimization Techniques**:

```typescript
// ✅ Optimized selector with equality check
import { shallowEqual } from 'react-redux';

function SpanRow({ spanId }) {
  // Only re-renders if THIS span's hover state changes
  const isHovered = useSelector(
    (state: RootState) => state.trace.hoveredSpanId === spanId,
    shallowEqual
  );
  
  return <div className={isHovered ? 'hovered' : ''}>{/* ... */}</div>;
}
```

**Memoized Selectors** (Reselect):
```typescript
import { createSelector } from '@reduxjs/toolkit';

const selectExpandedSpans = (state: RootState) => state.trace.expandedSpans;
const selectSpanId = (_state: RootState, spanId: string) => spanId;

const selectIsExpanded = createSelector(
  [selectExpandedSpans, selectSpanId],
  (expandedSpans, spanId) => expandedSpans.has(spanId)
  // Only recomputes when expandedSpans or spanId changes
);
```

**Verdict**: Achieves similar performance to Zustand but requires more manual optimization effort.

### React Server Components (RSC) Constraints

**Critical Limitation**: Redux (including RTK) is **client-side only**.

- Redux relies on React Context, hooks (`useSelector`, `useDispatch`), and the `<Provider>` wrapper - all client-side features
- In Next.js App Router with RSC, Redux store **must** be created per-request on the server to avoid data contamination across users
- All components using Redux must be marked `"use client"`
- Server Components cannot access Redux state

**Implications for Jaeger UI**:
- If migrating to Next.js App Router (or React Server Components), Redux limits architecture
- Must separate Server Components (data fetching) from Client Components (Redux state)
- Adds complexity compared to Zustand (which has the same limitation but with less ceremony)

**Verdict**: Works but adds constraints in RSC architecture.

### Contributor Ergonomics Deep Dive

**Adding a New Feature: "Trace Filters"**

```typescript
// 1. Create slice (or add to existing)
const traceSlice = createSlice({
  name: 'trace',
  initialState: { filters: { serviceName: '', spanKind: null } },
  reducers: {
    setFilters: (state, action: PayloadAction<TraceFilters>) => {
      state.filters = action.payload;
    },
  },
});

export const { setFilters } = traceSlice.actions;

// 2. Configure store (if new slice)
const store = configureStore({
  reducer: {
    trace: traceSlice.reducer,
  },
});

// 3. Usage in component
function FilterBar() {
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.trace.filters);
  
  return (
    <input 
      value={filters.serviceName}
      onChange={e => dispatch(setFilters({ ...filters, serviceName: e.target.value }))}
    />
  );
}
```

**Lines of Code**: ~30-40 lines (3-4x more than Zustand)

**Cognitive Load**:
- Understand slices, actions, reducers
- Know when to use `PayloadAction<T>` typing
- Configure store correctly
- Remember `useDispatch` + `useSelector` pattern

**Verdict**: More complex than Zustand but structured and well-documented.

---

## Trade-off Matrix

| Dimension | React Context + Hooks | Zustand | Redux Toolkit |
|-----------|----------------------|---------|---------------|
| **Memory Efficiency** | ⚠️ C+ <br>Large objects cause GC pressure. **Critical at 50K scale** | ✅ A <br>Minimal overhead, direct mutations. **Optimal at 50K scale** | ✅ B+ <br>Good with Immer, heavier than Zustand |
| **Re-render Scalability** | ⛔ **F** <br>**Completely unusable at 50K spans**. Even with virtualization, causes UI freezes | ✅ A+ <br>Selective subscriptions prevent global flickering. **Essential at 50K scale** | ✅ B+ <br>Good with selectors, requires optimization |
| **Governance & Maintenance** | ✅ A+ <br>Built into React, zero dependencies | ✅ A- <br>Healthy OSS, 14M+ downloads, React 19 ready | ✅ A- <br>Official Redux, massive ecosystem, RSC limitations |
| **Contributor Ergonomics** | ⚠️ C+ <br>Simple concept, complex optimization | ✅ A+ <br>~10 lines of code for new features | ⚠️ B- <br>~30-40 lines, more concepts to learn |
| **Server State Integration** | ✅ B+ <br>Natural with React Query | ✅ A+ <br>Designed for React Query pairing | ✅ B <br>RTK Query alternative, more complex |
| **Bundle Size** | ✅ A+ <br>0 bytes (built-in) | ✅ A+ <br>~1KB | ⚠️ B- <br>~13KB + middleware |
| **DevTools** | ⚠️ C+ <br>Basic Context inspection | ✅ A <br>Redux DevTools compatible | ✅ A+ <br>Excellent time-travel debugging |
| **Learning Curve** | ⚠️ C+ <br>Moderate (optimization patterns) | ✅ A+ <br>~30 minutes | ⚠️ B- <br>~2-3 hours |
| **TypeScript Support** | ✅ B+ <br>Good, manual typing needed | ✅ A <br>TypeScript-first design | ✅ A+ <br>Excellent type inference |

---

## React Core Alignment Analysis

### React Compiler Impact

The **React Compiler** (v1.0 stable Oct 2025), formerly "React Forget," automatically memoizes components and removes the need for manual `useMemo`, `useCallback`, and `React.memo`.

**How it Affects Each Option**:

| Solution | Impact | Verdict |
|----------|--------|---------|
| **React Context** | ✅ **Helps**: Auto-memoization prevents child re-renders even when context consumer parent re-renders. However, doesn't prevent initial context consumer re-renders - fundamental limitation remains. | Partially mitigates, doesn't solve core issue |
| **Zustand** | ✅ **Neutral to Positive**: Compiler doesn't significantly change Zustand's value proposition. Zustand's selective subscriptions already prevent re-renders better than compiler can. Compiler may reduce need for manual memoization in components consuming Zustand. | Remains optimal |
| **Redux** | ✅ **Helps**: Similar to Context - removes manual memoization burden. Selector functions still needed for granular subscriptions. | Slightly improves ergonomics |

**Verdict**: React Compiler makes all options slightly better, but **doesn't change the fundamental trade-offs**. Zustand's selective subscription model remains superior for preventing re-renders.

### React Server Components (RSC) Compatibility

**Current State** (2024-2025):

All three options are **client-side only** - they cannot work in Server Components because they rely on hooks and state, which are React client features.

**Best Practice for Jaeger UI with RSC** (if/when adopted):

```typescript
// Server Component (app/traces/[id]/page.tsx)
async function TracePageServer({ params }: { params: { id: string } }) {
  // ✅ Fetch trace data on server
  const trace = await fetchTrace(params.id);
  
  // Pass to Client Component
  return <TraceViewerClient initialTrace={trace} />;
}

// Client Component ('use client')
function TraceViewerClient({ initialTrace }: { initialTrace: Trace }) {
  // ✅ Use Zustand/Redux for UI state
  const { expandedSpans, toggleSpan } = useTraceStore();
  
  // ✅ Use React Query for client-side refetching (if needed)
  const { data: trace } = useQuery({
    queryKey: ['trace', initialTrace.traceId],
    queryFn: () => fetchTrace(initialTrace.traceId),
    initialData: initialTrace,
  });
  
  return <TraceTimeline trace={trace} expandedSpans={expandedSpans} />;
}
```

**Verdict**: All three options work with RSC, but Zustand's minimal ceremony makes the client/server boundary cleaner.

### Future-Proofing Score

| Solution | React 18/19 | React Compiler | RSC Ready | Future Score |
|----------|-------------|----------------|-----------|--------------|
| **React Context** | ✅ Native | ⚠️ Partial Help | ✅ Client-side OK | ✅ A- |
| **Zustand** | ✅ Compatible | ✅ Synergistic | ✅ Client-side OK | ✅ A+ |
| **Redux Toolkit** | ✅ Compatible | ⚠️ Slight Help | ⚠️ Client-only constraints | ✅ A- |

---

## Proposed Hybrid Architecture

**Recommendation**: **Zustand (client UI state) + React Query (server state)**

### State Separation

```
┌─────────────────────────────────────────────────────────────┐
│                     Application State                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────┐   ┌─────────────────────────┐  │
│  │ React Query            │   │ Zustand                 │  │
│  │ (Server State)         │   │ (Client UI State)       │  │
│  ├────────────────────────┤   ├─────────────────────────┤  │
│  │ • Trace data fetching  │   │ • Expanded spans        │  │
│  │ • Trace caching        │   │ • Collapsed spans       │  │
│  │ • Trace search results │   │ • Hovered span ID       │  │
│  │ • Background refetch   │   │ • Selected span IDs     │  │
│  │ • Error handling       │   │ • Filter state          │  │
│  │ • Loading states       │   │ • View mode (timeline/  │  │
│  │                        │   │   flamegraph/graph)     │  │
│  │                        │   │ • Zoom level            │  │
│  │                        │   │ • Dark mode preference  │  │
│  └────────────────────────┘   └─────────────────────────┘  │
│           ↓                              ↓                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            React Components                         │   │
│  │  • TraceTimeline                                    │   │
│  │  • SpanDetail                                       │   │
│  │  • TraceFlamegraph                                  │   │
│  │  • TraceStatistics                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Example

```typescript
// ===== SERVER STATE (React Query) =====
import { useQuery } from '@tanstack/react-query';

function useTrace(traceId: string) {
  return useQuery({
    queryKey: ['trace', traceId],
    queryFn: () => fetchTrace(traceId),
    staleTime: 5 * 60 * 1000, // 5 minutes (traces are immutable)
    gcTime: 30 * 60 * 1000,   // 30 minutes cache
  });
}

function useSearchTraces(query: SearchQuery) {
  return useQuery({
    queryKey: ['traces', 'search', query],
    queryFn: () => searchTraces(query),
    enabled: !!query.serviceName, // Only run if query is set
  });
}

// ===== CLIENT UI STATE (Zustand) =====
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Expansion state
  expandedSpans: Set<string>;
  toggleSpan: (spanId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Hover state
  hoveredSpanId: string | null;
  setHoveredSpan: (spanId: string | null) => void;
  
  // Selection state
  selectedSpanIds: Set<string>;
  toggleSelection: (spanId: string) => void;
  clearSelection: () => void;
  
  // View state
  viewMode: 'timeline' | 'flamegraph' | 'graph';
  setViewMode: (mode: UIState['viewMode']) => void;
  
  // Filter state
  filters: {
    serviceName: string;
    spanKind: SpanKind | null;
    minDuration: number | null;
    maxDuration: number | null;
    hasErrors: boolean;
  };
  setFilters: (filters: Partial<UIState['filters']>) => void;
  resetFilters: () => void;
}

const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Expansion
      expandedSpans: new Set(),
      toggleSpan: (spanId) => set((state) => {
        const newSet = new Set(state.expandedSpans);
        newSet.has(spanId) ? newSet.delete(spanId) : newSet.add(spanId);
        return { expandedSpans: newSet };
      }),
      expandAll: () => set({ expandedSpans: new Set(['*']) }), // Special marker
      collapseAll: () => set({ expandedSpans: new Set() }),
      
      // Hover
      hoveredSpanId: null,
      setHoveredSpan: (spanId) => set({ hoveredSpanId: spanId }),
      
      // Selection
      selectedSpanIds: new Set(),
      toggleSelection: (spanId) => set((state) => {
        const newSet = new Set(state.selectedSpanIds);
        newSet.has(spanId) ? newSet.delete(spanId) : newSet.add(spanId);
        return { selectedSpanIds: newSet };
      }),
      clearSelection: () => set({ selectedSpanIds: new Set() }),
      
      // View mode
      viewMode: 'timeline',
      setViewMode: (mode) => set({ viewMode: mode }),
      
      // Filters
      filters: {
        serviceName: '',
        spanKind: null,
        minDuration: null,
        maxDuration: null,
        hasErrors: false,
      },
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),
      resetFilters: () => set({
        filters: {
          serviceName: '',
          spanKind: null,
          minDuration: null,
          maxDuration: null,
          hasErrors: false,
        }
      }),
    }),
    {
      name: 'jaeger-ui-state', // LocalStorage key
      partialize: (state) => ({
        // Only persist some state
        viewMode: state.viewMode,
        filters: state.filters,
        // Don't persist hover/selection state
      }),
    }
  )
);

// ===== USAGE IN COMPONENTS =====
function TracePageContent({ traceId }: { traceId: string }) {
  // Server state (React Query)
  const { data: trace, isLoading, error } = useTrace(traceId);
  
  // Client UI state (Zustand)
  const { expandedSpans, toggleSpan, hoveredSpanId } = useUIStore();
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorView error={error} />;
  if (!trace) return <NotFound />;
  
  return (
    <TraceTimeline 
      trace={trace}
      expandedSpans={expandedSpans}
      onToggleSpan={toggleSpan}
      hoveredSpanId={hoveredSpanId}
    />
  );
}

function SpanRow({ spanId, trace }: { spanId: string; trace: Trace }) {
  // ✅ Selective Zustand subscriptions - only re-renders when relevant state changes
  const isExpanded = useUIStore((state) => state.expandedSpans.has(spanId));
  const isHovered = useUIStore((state) => state.hoveredSpanId === spanId);
  const toggleSpan = useUIStore((state) => state.toggleSpan);
  const setHoveredSpan = useUIStore((state) => state.setHoveredSpan);
  
  const span = trace.spans.find(s => s.spanId === spanId)!;
  
  return (
    <div 
      className={isHovered ? 'hovered' : ''}
      onClick={() => toggleSpan(spanId)}
      onMouseEnter={() => setHoveredSpan(spanId)}
      onMouseLeave={() => setHoveredSpan(null)}
    >
      <SpanName>{span.name}</SpanName>
      {isExpanded && <SpanDetails span={span} />}
    </div>
  );
}
```

### Why This Combination Works

1. **Clear Separation of Concerns**:
   - React Query: "What data do I have?" (server state)
   - Zustand: "How am I viewing it?" (client UI state)

2. **Optimal Performance**:
   - React Query handles caching, preventing unnecessary network requests
   - Zustand's selective subscriptions prevent unnecessary re-renders

3. **Developer Experience**:
   - Both libraries have minimal boilerplate
   - TypeScript-first design
   - Excellent DevTools (React Query DevTools + Zustand DevTools via Redux DevTools protocol)

4. **Future-Proof**:
   - Both libraries actively maintained
   - Both compatible with React Server Components (as client-side tools)
   - Both work with React Compiler

5. **Open Source Friendly**:
   - Simple mental model for contributors
   - Well-documented patterns
   - Small bundle size (~15KB total)

---

## Migration Path

### Phase 1: Introduce Zustand Alongside Redux (2-3 weeks)

**Goal**: Prove the pattern with low-risk features.

1. **Install Dependencies**:
   ```bash
   npm install zustand @tanstack/react-query
   ```

2. **Create Initial Stores**:
   - `stores/useUIStore.ts` - View mode, expand/collapse, hover state
   - `stores/useFiltersStore.ts` - Filter preferences
   - `stores/usePreferencesStore.ts` - Dark mode, timezone, etc.

3. **Migrate Low-Risk Features**:
   - **Dark Mode** (currently in Redux) → Zustand persisted store
   - **Expand/Collapse State** → Zustand (transient, doesn't need Redux)
   - **Hover State** → Zustand (definitely doesn't need Redux)

4. **Coexistence Pattern**:
   ```typescript
   // Functional components can use hooks
   function TracePage() {
     // Old: Redux
     const trace = useSelector(selectTrace);
     
     // New: Zustand
     const expandedSpans = useUIStore((state) => state.expandedSpans);
     
     // ...
   }
   
   // Class components use connect() HOC (Redux) or Zustand HOC
   import { connect } from 'react-redux';
   import { createStoreConnector } from './utils/zustandClassBridge';
   
   class LegacyTraceView extends React.Component {
     render() {
       const { trace, expandedSpans } = this.props;
       // ...
     }
   }
   
   // Option A: Keep using Redux connect() for now
   export default connect(
     (state) => ({ trace: state.trace.data })
   )(LegacyTraceView);
   
   // Option B: Create Zustand HOC bridge
   const withUIStore = createStoreConnector(useUIStore, (state) => ({
     expandedSpans: state.expandedSpans,
     toggleSpan: state.toggleSpan,
   }));
   
   export default withUIStore(LegacyTraceView);
   ```

5. **Create Zustand Class Component Bridge** (utils/zustandClassBridge.ts):
   ```typescript
   // Helper to connect Zustand stores to class components
   import React from 'react';
   import type { StoreApi, UseBoundStore } from 'zustand';
   
   export function createStoreConnector<T, P>(
     useStore: UseBoundStore<StoreApi<T>>,
     selector: (state: T) => P
   ) {
     return function withStore<C extends React.ComponentType<P & any>>(
       Component: C
     ): React.ComponentType<Omit<React.ComponentProps<C>, keyof P>> {
       return class StoreConnector extends React.Component<
         Omit<React.ComponentProps<C>, keyof P>
       > {
         private unsubscribe?: () => void;
         
         state = {
           storeState: selector(useStore.getState()),
         };
         
         componentDidMount() {
           this.unsubscribe = useStore.subscribe((state) => {
             this.setState({ storeState: selector(state) });
           });
         }
         
         componentWillUnmount() {
           this.unsubscribe?.();
         }
         
         render() {
           return <Component {...this.props} {...this.state.storeState} />;
         }
       };
     };
   }
   ```

6. **Strategy for Class Components**:
   - **Short-term**: For class components that are actively maintained, create Zustand HOC bridges
   - **Medium-term**: Prioritize converting frequently-modified class components to functional components
   - **Long-term**: Convert all remaining class components as part of broader React modernization
   - **Keep Redux**: Optionally keep Redux `connect()` for class components that are rarely touched

     // ...
   }
   ```

### Phase 2: Introduce React Query for Data Fetching (3-4 weeks)

**Goal**: Separate server state from Redux.

1. **Setup React Query**:
   ```typescript
   // app/providers.tsx
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 5 * 60 * 1000,
         gcTime: 30 * 60 * 1000,
       },
     },
   });
   
   export function Providers({ children }) {
     return (
       <QueryClientProvider client={queryClient}>
         {children}
       </QueryClientProvider>
     );
   }
   ```

2. **Create Query Hooks**:
   ```typescript
   // hooks/useTraceQuery.ts
   export function useTraceQuery(traceId: string) {
     return useQuery({
       queryKey: ['trace', traceId],
       queryFn: () => fetchTrace(traceId),
       staleTime: Infinity, // Traces never change
     });
   }
   ```

3. **Migrate Data Fetching** (one page at a time):
   - `TracePage` → Use `useTraceQuery` instead of Redux thunk
   - `SearchPage` → Use `useSearchTracesQuery`
   - Keep computed/derived state in Redux during transition

### Phase 3: Migrate Derived State (4-6 weeks)

**Goal**: Move computed state (critical path, statistics) from Redux to Zustand or local state.

**Options**:

**Option A: Zustand with Computed Middleware**
```typescript
import { create } from 'zustand';
import { computed } from 'zustand-computed';

const useTraceStore = create(
  computed(
    (set) => ({
      trace: null,
      setTrace: (trace) => set({ trace }),
    }),
    (state) => ({
      // Computed values (memoized automatically)
      criticalPath: state.trace ? computeCriticalPath(state.trace) : null,
      statistics: state.trace ? computeStatistics(state.trace) : null,
    })
  )
);
```

**Option B: Local Computation with useMemo** (Preferred for heavy computations)
```typescript
function TracePage() {
  const { data: trace } = useTraceQuery(traceId);
  
  // ✅ Compute on-demand, memoized
  const criticalPath = useMemo(
    () => trace ? computeCriticalPath(trace) : null,
    [trace]
  );
  
  const statistics = useMemo(
    () => trace ? computeStatistics(trace) : null,
    [trace]
  );
  
  return <TraceView trace={trace} criticalPath={criticalPath} />;
}
```

**Recommendation**: Use Option B (local `useMemo`) for heavy computations like critical path. Zustand for lightweight UI state only.

### Phase 4: Deprecate Redux (2-3 weeks)

**Goal**: Remove Redux entirely.

1. **Verify All Migrated**:
   - Audit codebase for `useSelector`/`useDispatch` usage
   - Ensure all Redux slices have Zustand equivalents

2. **Remove Redux**:
   ```bash
   npm uninstall react-redux @reduxjs/toolkit
   ```

3. **Delete Files**:
   - `store/` directory
   - Redux-related actions, reducers, selectors

4. **Update Documentation**:
   - Update `CONTRIBUTING.md` with Zustand patterns
   - Add state management architecture diagram

### Rollback Plan

Each phase is independently reversible:

- **Phase 1**: Remove Zustand stores, keep Redux as-is
- **Phase 2**: Remove React Query hooks, restore Redux thunks
- **Phase 3**: Revert computation logic to Redux selectors
- **Phase 4**: Reinstall Redux (though unlikely to need this)

### Testing Strategy

1. **Unit Tests**: Update component tests to use Zustand/React Query mocks
2. **Integration Tests**: Verify entire trace viewing flow works
3. **Performance Tests**: Benchmark 5,000+ span traces before/after
4. **Visual Regression**: Screenshot tests to catch UI regressions

---

## Success Metrics

### Performance Targets

-   [ ] **Initial Load**: < 3s for 50,000-span trace (includes parsing + virtualization setup)
-   [ ] **Hover Interaction**: < 16ms (60 FPS) for hover state changes
-   [ ] **Expand/Collapse**: < 50ms for expanding span with 100 children
-   [ ] **Filter Application**: < 500ms for filtering 50,000 spans
-   [ ] **Scroll Performance**: 60 FPS while scrolling through virtualized list
-   [ ] **Memory Usage**: < 500MB for extreme trace (50,000 spans)
-   [ ] **Virtualization**: Only render visible spans (~100-200 at a time)

### Developer Experience Targets

- [ ] **PR Velocity**: No slowdown in feature development during/after migration

### Technical Debt Metrics

- [ ] **Bundle Size**: \u003c +10KB after migration (Zustand is tiny)
- [ ] **Test Coverage**: Maintain \u003e 80% coverage
- [ ] **TypeScript Errors**: Zero new type errors

---

## Decision Rationale

### Why Not React Context?

While Context API is built into React and has zero dependencies, it fundamentally cannot handle Jaeger UI's extreme scale requirements:

- **Re-render Problem**: At 50,000 spans, Context changes would trigger re-renders of hundreds of components simultaneously, freezing the UI
- **Complexity**: Even with 20+ split contexts, performance would be unacceptable
- **Memory**: Hundreds of MB of trace data being copied/memoized across contexts would cause GC pressure
- **Verdict**: ❌ **Completely ruled out** at 50K-span scale. This is non-negotiable.

### Why Not Redux Toolkit Alone?

Redux Toolkit is mature and well-supported, but presents friction for Jaeger UI:

- **Boilerplate**: 3-4x more code than Zustand for same functionality
- **Learning Curve**: Higher barrier for open-source contributors
- **Bundle Size**: 13KB vs 1KB for Zustand
- **Verdict**: ⚠️ Overkill for Jaeger UI's needs, but acceptable fallback

### Why Zustand + React Query?

This combination uniquely satisfies all criteria:

✅ **Performance**: Selective subscriptions prevent re-render cascades  
✅ **Simplicity**: Minimal boilerplate, intuitive API  
✅ **Future-Proof**: Compatible with React 19, RSC, React Compiler  
✅ **TanStack Ecosystem**: React Query + @tanstack/react-virtual from same team, ensuring compatibility  
✅ **Maintainability**: Healthy open-source projects, active development  
✅ **Contributor-Friendly**: Lowest learning curve, fastest development velocity  
✅ **Bundle Size**: < 20KB total (Zustand + React Query + TanStack Virtual)  

### Strategic Alignment

Zustand aligns with React team's direction:

- **React Compiler**: Zustand benefits from auto-memoization without changing API
- **React Server Components**: Works cleanly in Client Components
- **Concurrent Mode**: No issues with concurrent rendering
- **Future React**: Minimal API, no reliance on deprecated patterns

### Risk Mitigation

**Concern**: "Zustand is less mature than Redux"

**Response**: 
- 14M+ weekly downloads (2024)
- Maintained by Poimandres (trusted Three.js ecosystem)
- Simple 1KB core - could be forked if abandoned (unlikely)
- Already used in production by major companies

**Concern**: "What if we need Redux DevTools time-travel?"

**Response**:
- Zustand supports Redux DevTools protocol via middleware
- Time-travel debugging less critical for Jaeger (traces are immutable snapshots)
- If truly needed, Zustand's `temporal` middleware provides this

---

## Open Questions

### Q1: Should We Use Zustand Middleware?

**Available Middleware**:
- `persist` - LocalStorage/SessionStorage persistence ✅
- `devtools` - Redux DevTools integration ✅
- `immer` - Immer for immutable updates ❓
- `subscribeWithSelector` - Fine-grained subscriptions ❓
- `temporal` - Time-travel debugging ❓

**Recommendation**: Start minimal (only `persist` + `devtools`), add others if needed.

### Q2: How to Handle Optimistic Updates?

React Query handles this well:

```typescript
const mutation = useMutation({
  mutationFn: updateSpan,
  onMutate: async (newSpan) => {
    // Optimistic update
    await queryClient.cancelQueries(['trace', traceId]);
    const previousTrace = queryClient.getQueryData(['trace', traceId]);
    
    queryClient.setQueryData(['trace', traceId], (old) => ({
      ...old,
      spans: old.spans.map(s => s.spanId === newSpan.spanId ? newSpan : s),
    }));
    
    return { previousTrace };
  },
  onError: (_err, _newSpan, context) => {
    // Rollback on error
    queryClient.setQueryData(['trace', traceId], context.previousTrace);
  },
});
```

**Verdict**: React Query provides this out-of-the-box if needed.

### Q3: Should We Normalize Trace Data?

**Options**:

**Option A: Store as-is** (Array of spans)
```typescript
const trace = {
  traceId: '123',
  spans: [/* full span objects */],
};
```

**Option B: Normalize** (Map by ID)
```typescript
const trace = {
  traceId: '123',
  spans: {
    byId: { 'span-1': { /* span */ }, 'span-2': { /* span */ } },
    allIds: ['span-1', 'span-2'],
  },
};
```

**Recommendation**: Start with **Option A** (as-is). Only normalize if profiling shows lookup performance issues. Over-optimization is premature.

---

## References

### Research Sources

- [React Context Performance](https://medium.com/@kylelambert/react-context-api-performance-optimization-2024)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Redux Toolkit Best Practices 2024](https://redux-toolkit.js.org/usage/usage-guide)
- [React Query Official Docs](https://tanstack.com/query/latest)
- [React Compiler (React Forget) v1.0](https://react.dev/learn/react-compiler)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Redux vs Zustand vs Context](https://edstem.com/blog/redux-vs-zustand-vs-context)
- [State Management Comparison 2024](https://svitla.com/blog/state-management-libraries-in-react-ecosystem)

### Community Insights

- [Reddit: React State Management Recommendations 2024](https://www.reddit.com/r/reactjs/)
- [Stack Overflow: Zustand Performance with Large Data](https://stackoverflow.com/questions/tagged/zustand)
- [GitHub: Zustand React 19 Compatibility](https://github.com/pmndrs/zustand/discussions)

---

**Status**: Proposed  
**Approval Required**: Engineering Team, Project Maintainers  
**Next Steps**: Review this ADR, discuss concerns, vote on recommendation

---

## Appendix: Code Comparison

### Scenario: Add "Collapse All Spans" Feature

#### React Context + Hooks

```typescript
// ❌ 40-50 lines of code

// 1. Context definition
interface TraceContextValue {
  expandedSpans: Set<string>;
  collapseAll: () => void;
}

const TraceContext = createContext<TraceContextValue | null>(null);

// 2. Provider component
function TraceProvider({ children }) {
  const [expandedSpans, setExpandedSpans] = useState(new Set<string>());
  
  const collapseAll = useCallback(() => {
    setExpandedSpans(new Set());
  }, []);
  
  const value = useMemo(() => ({
    expandedSpans,
    collapseAll,
  }), [expandedSpans, collapseAll]);
  
  return <TraceContext.Provider value={value}>{children}</TraceContext.Provider>;
}

// 3. Custom hook
function useTraceContext() {
  const context = useContext(TraceContext);
  if (!context) throw new Error('useTraceContext must be used within TraceProvider');
  return context;
}

// 4. Usage in component
function TraceToolbar() {
  const { collapseAll } = useTraceContext();
  return <button onClick={collapseAll}>Collapse All</button>;
}
```

**Lines of Code**: ~40  
**Files Modified**: 3 (context, provider, component)

---

#### Zustand

```typescript
// ✅ 10 lines of code

// 1. Add to store (single file)
const useTraceStore = create<TraceStore>((set) => ({
  expandedSpans: new Set(),
  collapseAll: () => set({ expandedSpans: new Set() }),
}));

// 2. Usage in component
function TraceToolbar() {
  const collapseAll = useTraceStore((state) => state.collapseAll);
  return <button onClick={collapseAll}>Collapse All</button>;
}
```

**Lines of Code**: ~10  
**Files Modified**: 2 (store, component)

**Verdict**: Zustand is **4x more concise** for this common operation.

---

#### Redux Toolkit

```typescript
// ⚠️ 30-35 lines of code

// 1. Add reducer action
const traceSlice = createSlice({
  name: 'trace',
  initialState: {
    expandedSpans: new Set<string>(),
  },
  reducers: {
    collapseAll: (state) => {
      state.expandedSpans = new Set();
    },
  },
});

export const { collapseAll } = traceSlice.actions;

// 2. Selector (optional but recommended)
export const selectExpandedSpans = (state: RootState) => state.trace.expandedSpans;

// 3. Usage in component
function TraceToolbar() {
  const dispatch = useDispatch();
  
  return (
    <button onClick={() => dispatch(collapseAll())}>
      Collapse All
    </button>
  );
}
```

**Lines of Code**: ~30  
**Files Modified**: 2 (slice, component)

**Verdict**: Redux is **3x more verbose** than Zustand, though less than Context.

---

**Final Comparison**:

| Solution | Lines of Code | Files Modified | Cognitive Load |
|----------|---------------|----------------|----------------|
| Context | ~40 | 3 | High (provider pattern, memoization) |
| Zustand | ~10 | 2 | Low (single function call) |
| Redux | ~30 | 2 | Medium (dispatch pattern, action types) |
