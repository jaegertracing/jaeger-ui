**Migration order** (based on business-function prioritization from Phase 0.3):

**Batch 1: Foundation (Tier 3)** ✅ COMPLETED
These are used everywhere and must be migrated first:
- [x] `App/index.css` - Global styles (~8 colors)
- [x] `App/TopNav.css` - Navigation visible on every page (~10 colors)
- [x] `App/Page.css` - Page layout (~6 colors)

**Batch 2: Trace Search - Landing Page (Tier 1)** ✅ COMPLETED
Critical path for all users:
- [x] `SearchTracePage/index.css` - Main container (~5 colors)
- [x] `SearchTracePage/SearchForm.css` - Primary search interface (12 colors)
- [x] `SearchTracePage/FileLoader.css` - File upload UI (~3 colors)
- [x] `SearchTracePage/SearchResults/index.css` - Results container (~8 colors)
- [x] `SearchTracePage/SearchResults/ResultItem.css` - Result cards (~6 colors)
- [x] `SearchTracePage/SearchResults/ResultItemTitle.css` - Result titles (~4 colors)
- [x] `SearchTracePage/SearchResults/DiffSelection.css` - Diff comparison (~5 colors)
- [x] `SearchTracePage/SearchResults/ScatterPlot.css` - Visualization (~7 colors)

**Batch 2 Dependencies (common components):** ✅ COMPLETED
- [x] `common/LoadingIndicator.css` - Loading states (10 colors)
- [x] `common/ErrorMessage.css` - Error handling (10 colors)

**Batch 3: Trace Viewing - Core Functionality (Tier 2)**
Critical path for trace analysis:

*TracePage container:*
- [ ] `TracePage/index.css` - Main trace page container (~5 colors)

*TracePageHeader (trace metadata and controls):*
- [ ] `TracePage/TracePageHeader/TracePageHeader.css` - Header (13 colors)
- [ ] `TracePage/TracePageHeader/TracePageSearchBar.css` - Search bar (~7 colors)
- [ ] `TracePage/TracePageHeader/AltViewOptions.css` - View options (~6 colors)
- [ ] `TracePage/TracePageHeader/KeyboardShortcutsHelp.css` - Shortcuts help (~5 colors)
- [ ] `TracePage/TracePageHeader/SpanGraph/CanvasSpanGraph.css` - Mini span graph (~8 colors)
- [ ] `TracePage/TracePageHeader/SpanGraph/GraphTicks.css` - Graph ticks (~5 colors)
- [ ] `TracePage/TracePageHeader/SpanGraph/Scrubber.css` - Scrubber control (~6 colors)
- [ ] `TracePage/TracePageHeader/SpanGraph/TickLabels.css` - Tick labels (~4 colors)
- [ ] `TracePage/TracePageHeader/SpanGraph/ViewingLayer.css` - Viewing layer (~5 colors)

*TraceTimelineViewer (core timeline):*
- [ ] `TracePage/TraceTimelineViewer/index.css` - Timeline container (~12 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanBarRow.css` - **HIGHEST PRIORITY** (34 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanBar.css` - Individual span bars (~10 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanDetailRow.css` - Span details (~8 colors)
- [ ] `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineHeaderRow.css` - Header (~9 colors)
- [ ] `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineCollapser.css` - Collapse controls (~6 colors)
- [ ] `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineViewingLayer.css` - Viewing layer (~5 colors)
- [ ] `TracePage/TraceTimelineViewer/TimelineRow.css` - Timeline rows (~7 colors)
- [ ] `TracePage/TraceTimelineViewer/VirtualizedTraceView.css` - Virtualized list (~8 colors)
- [ ] `TracePage/TraceTimelineViewer/Ticks.css` - Timeline ticks (~6 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanTreeOffset.css` - Tree indentation (~4 colors)
- [ ] `TracePage/TraceTimelineViewer/ReferencesButton.css` - Reference links (~5 colors)
- [ ] `TracePage/TraceTimelineViewer/grid.css` - Grid layout (~8 colors)

*TraceTimelineViewer/SpanDetail (expanded span details):*
- [ ] `TracePage/TraceTimelineViewer/SpanDetail/index.css` - Span detail container (~9 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanDetail/AccordianKeyValues.css` - Key-value accordion (~7 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanDetail/AccordianLogs.css` - Logs accordion (~6 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanDetail/AccordianReferences.css` - References accordion (~5 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanDetail/AccordianText.css` - Text accordion (~4 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanDetail/KeyValuesTable.css` - Key-value table (~8 colors)
- [ ] `TracePage/TraceTimelineViewer/SpanDetail/TextList.css` - Text list (~5 colors)

**Batch 3 Dependencies (common components):**
- [ ] `common/BreakableText.css` - Text wrapping
- [ ] `common/CopyIcon.css` - Copy functionality
- [ ] `common/LabeledList.css` - Key-value displays
- [ ] `common/TraceId.css` - Trace ID display
- [ ] `common/TraceName.css` - Trace name display
- [ ] `common/VerticalResizer.css` - Resizable panels
- [ ] `common/FilteredList/ListItem.css` - Filtering UI (13 colors)
- [ ] `common/FilteredList/index.css` - Filtering container

**Batch 4: Secondary Features (Tier 4)**
Lower priority - defer until Batches 1-3 complete:
- [ ] TraceGraph components (alternative trace visualization)
- [ ] TraceFlamegraph components (flamegraph view)
- [ ] TraceStatistics components (statistics panel)
- [ ] CriticalPath components (critical path analysis)
- [ ] DependencyGraph components (service dependency graph)
- [ ] DeepDependencies components (deep dependency analysis)
- [ ] TraceDiff components (trace comparison)
- [ ] Monitor components (monitoring features)
- [ ] QualityMetrics components (quality metrics)
- [ ] Remaining common components
