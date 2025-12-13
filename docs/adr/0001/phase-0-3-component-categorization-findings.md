# Phase 0.3: Component Categorization Findings

**Generated:** 2025-11-27  
**Status:** ✅ COMPLETE (Updated with Business-Function Prioritization)

## Executive Summary

Analyzed **103 CSS files** totaling **5,619 lines** with **528 hardcoded colors**.

**NEW APPROACH:** Components are prioritized by **business function** rather than CSS complexity. The most critical user workflows (Trace Search and Trace Viewing) are prioritized first.

### Statistics

| Metric | Value |
|--------|-------|
| Total CSS files | 103 |
| Total CSS lines | 5,619 |
| Total hardcoded colors | 528 |
| Average colors per file | 5.1 |
| Files with colors | 85 (83%) |
| Files without colors | 18 (17%) |

### Key Insight

**Business-function prioritization** ensures that the most-used features are themed first, providing maximum value to all users. The critical user journey is: **Search → View Trace**.

## Business-Function-Based Prioritization

### Tier 1: Critical Path - Trace Search (Landing Page)

**Primary entry point for all users**

| Component | CSS File | Colors | Lines | Notes |
|-----------|----------|--------|-------|-------|
| SearchTracePage | `SearchTracePage/index.css` | 5 | 30 | Main container |
| SearchForm | `SearchTracePage/SearchForm.css` | 12 | 69 | Primary search interface |
| FileLoader | `SearchTracePage/FileLoader.css` | 3 | 9 | File upload UI |
| SearchResults | `SearchTracePage/SearchResults/index.css` | 8 | 41 | Results container |
| ResultItem | `SearchTracePage/SearchResults/ResultItem.css` | 6 | 37 | Individual result cards |
| ResultItemTitle | `SearchTracePage/SearchResults/ResultItemTitle.css` | 9 | 53 | Result titles |
| DiffSelection | `SearchTracePage/SearchResults/DiffSelection.css` | 5 | 30 | Diff comparison UI |
| ScatterPlot | `SearchTracePage/SearchResults/ScatterPlot.css` | 7 | 31 | Visualization |

**Tier 1 Total:** 8 files, 55 colors (10% of total)

### Tier 2: Critical Path - Trace Viewing

**Core trace visualization and analysis**

#### TracePage Container

| Component | CSS File | Colors | Lines |
|-----------|----------|--------|-------|
| TracePage | `TracePage/index.css` | 2 | 10 |

#### TracePageHeader (Trace Metadata and Controls)

| Component | CSS File | Colors | Lines |
|-----------|----------|--------|-------|
| TracePageHeader | `TracePage/TracePageHeader/TracePageHeader.css` | 13 | 101 |
| TracePageSearchBar | `TracePage/TracePageHeader/TracePageSearchBar.css` | 7 | 46 |
| AltViewOptions | `TracePage/TracePageHeader/AltViewOptions.css` | 6 | 34 |
| KeyboardShortcutsHelp | `TracePage/TracePageHeader/KeyboardShortcutsHelp.css` | 5 | 28 |
| CanvasSpanGraph | `TracePage/TracePageHeader/SpanGraph/CanvasSpanGraph.css` | 8 | 52 |
| GraphTicks | `TracePage/TracePageHeader/SpanGraph/GraphTicks.css` | 5 | 23 |
| Scrubber | `TracePage/TracePageHeader/SpanGraph/Scrubber.css` | 6 | 38 |
| TickLabels | `TracePage/TracePageHeader/SpanGraph/TickLabels.css` | 4 | 19 |
| ViewingLayer | `TracePage/TracePageHeader/SpanGraph/ViewingLayer.css` | 5 | 27 |

**TracePageHeader Subtotal:** 9 files, 59 colors

#### TraceTimelineViewer (Core Timeline)

| Component | CSS File | Colors | Lines | Priority |
|-----------|----------|--------|-------|----------|
| TraceTimelineViewer | `TracePage/TraceTimelineViewer/index.css` | 4 | 21 | Core |
| **SpanBarRow** | `TracePage/TraceTimelineViewer/SpanBarRow.css` | **34** | 190 | **HIGHEST** |
| SpanBar | `TracePage/TraceTimelineViewer/SpanBar.css` | 7 | 129 | High |
| SpanDetailRow | `TracePage/TraceTimelineViewer/SpanDetailRow.css` | 8 | 47 | High |
| TimelineHeaderRow | `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineHeaderRow.css` | 6 | 35 | Medium |
| TimelineCollapser | `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineCollapser.css` | 6 | 28 | Medium |
| TimelineViewingLayer | `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineViewingLayer.css` | 5 | 22 | Medium |
| TimelineRow | `TracePage/TraceTimelineViewer/TimelineRow.css` | 7 | 43 | Medium |
| VirtualizedTraceView | `TracePage/TraceTimelineViewer/VirtualizedTraceView.css` | 8 | 56 | Medium |
| Ticks | `TracePage/TraceTimelineViewer/Ticks.css` | 6 | 31 | Low |
| SpanTreeOffset | `TracePage/TraceTimelineViewer/SpanTreeOffset.css` | 4 | 18 | Low |
| ReferencesButton | `TracePage/TraceTimelineViewer/ReferencesButton.css` | 5 | 24 | Low |
| grid.css | `TracePage/TraceTimelineViewer/grid.css` | 0 | 816 | Layout only |

**TraceTimelineViewer Subtotal:** 13 files, 100 colors

#### TraceTimelineViewer/SpanDetail (Expanded Span Details)

| Component | CSS File | Colors | Lines |
|-----------|----------|--------|-------|
| SpanDetail | `TracePage/TraceTimelineViewer/SpanDetail/index.css` | 10 | 53 |
| AccordianKeyValues | `TracePage/TraceTimelineViewer/SpanDetail/AccordianKeyValues.css` | 7 | 42 |
| AccordianLogs | `TracePage/TraceTimelineViewer/SpanDetail/AccordianLogs.css` | 6 | 35 |
| AccordianReferences | `TracePage/TraceTimelineViewer/SpanDetail/AccordianReferences.css` | 5 | 28 |
| AccordianText | `TracePage/TraceTimelineViewer/SpanDetail/AccordianText.css` | 4 | 21 |
| KeyValuesTable | `TracePage/TraceTimelineViewer/SpanDetail/KeyValuesTable.css` | 8 | 48 |
| TextList | `TracePage/TraceTimelineViewer/SpanDetail/TextList.css` | 5 | 26 |

**SpanDetail Subtotal:** 7 files, 45 colors

**Tier 2 Total:** 30 files, 206 colors (39% of total)

### Tier 3: Foundation Components

**Must be done first as they're used everywhere**

| Component | CSS File | Colors | Lines | Notes |
|-----------|----------|--------|-------|-------|
| vars.css | `common/vars.css` | 3 | 12 | **Existing CSS variables** |
| utils.css | `common/utils.css` | 15 | 138 | Foundation utilities |
| App/index.css | `App/index.css` | 2 | 14 | Global styles |
| App/TopNav.css | `App/TopNav.css` | 3 | 18 | Navigation |
| App/Page.css | `App/Page.css` | 0 | 8 | Page layout |

**Tier 3 Total:** 5 files, 23 colors (4% of total)

### Common Component Dependencies

**Used by Tier 1 & 2 components**

| Component | CSS File | Colors | Lines | Used By |
|-----------|----------|--------|-------|---------|
| LoadingIndicator | `common/LoadingIndicator.css` | 10 | 55 | Search, Trace |
| ErrorMessage | `common/ErrorMessage.css` | 10 | 54 | Search, Trace |
| BreakableText | `common/BreakableText.css` | 2 | 12 | Trace |
| CopyIcon | `common/CopyIcon.css` | 3 | 18 | Trace |
| LabeledList | `common/LabeledList.css` | 4 | 24 | Trace |
| TraceId | `common/TraceId.css` | 5 | 28 | Trace |
| TraceName | `common/TraceName.css` | 4 | 22 | Trace |
| VerticalResizer | `common/VerticalResizer.css` | 8 | 45 | Trace |
| FilteredList/ListItem | `common/FilteredList/ListItem.css` | 13 | 56 | Trace |
| FilteredList/index | `common/FilteredList/index.css` | 6 | 32 | Trace |

**Dependencies Total:** 10 files, 65 colors (12% of total)

### Tier 4: Secondary Features

**Lower priority - defer until Tiers 1-3 complete**

| Feature Area | Files | Colors | % of Total |
|--------------|-------|--------|------------|
| TraceGraph | 2 | 18 | 3.4% |
| TraceFlamegraph | 1 | 5 | 0.9% |
| TraceStatistics | 6 | 12 | 2.3% |
| CriticalPath | 4 | 14 | 2.7% |
| DependencyGraph | 3 | 40 | 7.6% |
| DeepDependencies | 12 | 68 | 12.9% |
| TraceDiff | 8 | 68 | 12.9% |
| Monitor | 4 | 14 | 2.7% |
| QualityMetrics | 6 | 12 | 2.3% |
| Other common | 8 | 23 | 4.4% |

**Tier 4 Total:** 54 files, 274 colors (52% of total)

## Recommended Migration Strategy

### BATCH 1: Foundation (Tier 3)
**5 files, 23 colors (4% of total)**

These are used everywhere and must be migrated first:
- `common/vars.css` - Migrate existing CSS variables
- `common/utils.css` - Foundation utilities
- `App/index.css` - Global styles
- `App/TopNav.css` - Navigation
- `App/Page.css` - Page layout

### BATCH 2: Trace Search - Landing Page (Tier 1)
**18 files, 120 colors (23% of total)**

Critical path for all users:
- All SearchTracePage components (8 files, 55 colors)
- Common dependencies (10 files, 65 colors):
  - LoadingIndicator, ErrorMessage, etc.

**After Batch 2:** 27% of all colors migrated, **100% of Search page themed**

### BATCH 3: Trace Viewing - Core Functionality (Tier 2)
**30 files, 206 colors (39% of total)**

Critical path for trace analysis:
- TracePage container (1 file)
- TracePageHeader (9 files, 59 colors)
- TraceTimelineViewer core (13 files, 100 colors)
- SpanDetail components (7 files, 45 colors)

**After Batch 3:** 66% of all colors migrated, **100% of critical user journey themed**

### BATCH 4: Secondary Features (Tier 4)
**54 files, 274 colors (52% of total)**

Lower priority - can be done incrementally:
- DependencyGraph, DeepDependencies, TraceDiff
- TraceGraph, TraceFlamegraph, TraceStatistics
- Monitor, QualityMetrics, CriticalPath

## Rationale for Business-Function Prioritization

1. **User Journey First:** Most users follow: Search → View Trace. These are the critical paths.

2. **Maximum Impact:** Theming the most-used features provides immediate value to all users.

3. **Dependency Management:** By identifying dependencies explicitly, we ensure shared components are themed consistently.

4. **Incremental Value:** Users see theming in their primary workflows first, even if secondary features aren't themed yet.

5. **SpanBarRow Priority:** Despite having the highest color count (34), it's part of the critical Trace viewing workflow and must be included in Batch 3.

## Next Steps

1. ✅ Components categorized by business function
2. ✅ Migration batches defined based on user journey
3. ⏭️ Proceed to Phase 0.4: Finalize token taxonomy
4. ⏭️ Begin Phase 1: Implement migration batches

## Data Files

- **Detailed JSON:** `docs/adr/0001/phase-0-3-component-categorization-detailed.json`
- **Audit Script:** `docs/adr/0001/phase-0-3-categorize-components.cjs`
