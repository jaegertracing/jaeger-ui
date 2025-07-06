# Sparse Trace Visualization Implementation

## Overview

This document describes the implementation of **Issue #459: Sparse traces visualisation** - a solution for efficiently visualizing traces with long gaps between span groups.

## Problem Statement

Sparse traces containing span groups interleaved with long spanless gaps were visualized inefficiently. The timeline was strictly linear, causing spans to appear as tiny slivers when there were hours-long delays between operations (e.g., a consumer processing messages after significant delays).

## Solution

The implementation introduces a **compressed timeline** approach that:

1. **Detects large gaps** between span groups
2. **Compresses empty spaces** while preserving context
3. **Provides visual indicators** for collapsed gaps (similar to GitHub's diff view)
4. **Maintains interactivity** with expand/collapse functionality

## Key Components

### 1. Gap Analysis (`utils.tsx`)

```typescript
// Configuration for sparse trace behavior
interface SparseTraceConfig {
  enabled: boolean;
  gapThresholdMultiplier: number; // Gap must be N times larger than surrounding spans
  minGapDuration: number; // Minimum gap duration to consider (microseconds)
  maxCollapsedGapWidth: number; // Maximum width percentage for collapsed gaps
}

// Analyzes trace spans to identify collapsible gaps
function analyzeTraceGaps(spans, traceStartTime, traceDuration, config): TimelineGap[]
```

**Gap Detection Criteria:**
- Gap duration > `minGapDuration` (default: 1 second)
- Gap duration > `gapThresholdMultiplier` × surrounding span duration (default: 3x)
- Collapsed gaps are limited to `maxCollapsedGapWidth` of timeline (default: 2%)

### 2. Timeline Transformation (`utils.tsx`)

```typescript
// Creates sparse-aware view bounds function
function createSparseViewedBoundsFunc(viewRange, gaps): ViewedBoundsFunctionType

// Maps timestamps from original to compressed timeline
function mapToCompressedTimeline(timestamp, traceStartTime, collapsibleGaps, originalDuration): number
```

The transformation:
- Calculates total time saved by collapsing gaps
- Creates a compressed timeline duration
- Maps original timestamps to compressed positions
- Preserves relative positioning of spans

### 3. Gap Visualization (`TimelineGap.tsx`)

```typescript
interface TimelineGapProps {
  gap: TimelineGap;
  isCollapsed: boolean;
  onToggleCollapse: (gap: TimelineGap) => void;
  columnDivision: number;
  traceDuration: number;
}
```

**Visual Features:**
- **Collapsed state**: Blue gradient background with zigzag pattern and duration label
- **Expanded state**: Dashed border with collapse hint on hover
- **Interactive**: Click to toggle between collapsed/expanded
- **Tooltip**: Shows gap details (duration, start/end times)

### 4. Integration (`VirtualizedTraceView.tsx`)

**Enhanced Row State:**
```typescript
type RowState = {
  isDetail: boolean;
  span: Span;
  spanIndex: number;
} | {
  isGap: true;
  gap: TimelineGap;
};
```

**Key Methods:**
- `getTraceGaps()`: Analyzes current trace for gaps
- `getViewedBounds()`: Returns sparse-aware or standard bounds function
- `toggleGapCollapse()`: Handles gap expand/collapse interactions
- `renderGapRow()`: Renders gap visualization components

## File Structure

```
src/components/TracePage/TraceTimelineViewer/
├── utils.tsx                 # Core gap analysis and timeline transformation
├── utils.test.js            # Tests for sparse trace functionality
├── TimelineGap.tsx          # Gap visualization component
├── TimelineGap.css          # Gap styling
├── VirtualizedTraceView.tsx # Integration with existing timeline
├── VirtualizedTraceView.css # Additional gap row styling
└── SparseTraceDemo.tsx      # Demo component showcasing the solution
```

## Configuration

Default configuration can be customized:

```typescript
const DEFAULT_SPARSE_TRACE_CONFIG: SparseTraceConfig = {
  enabled: true,
  gapThresholdMultiplier: 3,    // Gap must be 3x larger than surrounding spans
  minGapDuration: 1000000,      // 1 second minimum gap
  maxCollapsedGapWidth: 0.02,   // 2% maximum width for collapsed gaps
};
```

## Usage Examples

### Basic Gap Detection
```typescript
const gaps = analyzeTraceGaps(trace.spans, trace.startTime, trace.duration);
console.log(`Found ${gaps.length} gaps, ${gaps.filter(g => g.shouldCollapse).length} collapsible`);
```

### Custom Configuration
```typescript
const customConfig = {
  ...DEFAULT_SPARSE_TRACE_CONFIG,
  gapThresholdMultiplier: 5,    // More aggressive gap detection
  minGapDuration: 5000000,      // 5 second minimum
};
```

## Benefits

1. **Improved Visibility**: Spans are clearly visible instead of tiny slivers
2. **Context Preservation**: Gap information is maintained and displayed
3. **Performance**: Efficient rendering with virtualized lists
4. **Flexibility**: Configurable thresholds and behavior
5. **User Experience**: Interactive expand/collapse functionality
6. **Backward Compatibility**: Falls back to standard timeline when no gaps detected

## Testing

The implementation includes comprehensive tests covering:
- Gap detection with various span configurations
- Timeline compression calculations
- Edge cases (overlapping spans, small gaps, etc.)
- Integration with existing timeline functionality

Run tests with:
```bash
npm test -- --testPathPattern=utils.test.js
```

## Demo

A demo component (`SparseTraceDemo.tsx`) showcases the functionality with a realistic sparse trace scenario (message producer → 5-minute delay → consumer).

## Future Enhancements

1. **User Preferences**: Allow users to enable/disable sparse visualization
2. **Advanced Gap Types**: Support for different gap visualization styles
3. **Zoom Integration**: Maintain gap compression during timeline zoom operations
4. **Performance Optimization**: Further optimize for traces with many gaps
5. **Accessibility**: Enhanced keyboard navigation and screen reader support

## Implementation Notes

- The solution is **non-breaking** - existing traces without significant gaps render normally
- **Memory efficient** - gaps are calculated on-demand with memoization
- **Responsive** - gap visualizations adapt to different screen sizes
- **Theme compatible** - Uses existing Jaeger UI color schemes and patterns

This implementation successfully addresses Issue #459 by providing an efficient, user-friendly solution for visualizing sparse traces while maintaining the performance and functionality of the existing timeline viewer.
