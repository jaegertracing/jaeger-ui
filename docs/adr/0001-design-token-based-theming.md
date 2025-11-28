# ADR 0001: Design Token-Based Theming Architecture

## Status

Proposed

---

> **📋 AUDIT STATUS:**
> ✅ **Phase 0.1 Complete** - Color audit finished (528 colors found, 150 unique values)
> ✅ **Phase 0.2 Complete** - CSS variables analyzed (4 variables found, 22 usages)
> 📊 **Real Data Available:**
> - `0001/phase-0-audit-findings.md` - Color audit summary
> - `0001/color-consolidation-analysis.md` - Data-driven token taxonomy
> - `0001/phase-0-audit-findings-detailed.json` - Complete color audit data (550KB)
> - `0001/phase-0-2-css-variables-findings.md` - CSS variables analysis
> - `0001/phase-0-2-css-variables-detailed.json` - CSS variables data (14KB)
> - `0001/phase-0-audit-colors.cjs` - Color audit script
> - `0001/phase-0-2-audit-css-variables.cjs` - CSS variables audit script
>
> ⚠️ **Note:** This ADR contains EXAMPLE values to illustrate the process.
> Where you see specific colors/numbers, they are ILLUSTRATIVE unless marked as actual audit results.
>
> 📁 **Supporting Documents:** All related files are in `docs/adr/0001/` directory.

---

## Context

Jaeger UI currently has no theme support. Users have requested dark mode and the ability to customize the UI appearance. We need to implement a theming system that:

- Supports light and dark modes
- Is maintainable and scalable
- Minimizes code duplication
- Makes it easy to add new themes in the future
- Works with our existing Ant Design component library
- Doesn't require touching every component when adding a new theme

### Current State

- Hardcoded colors throughout the codebase (e.g., `#11939a`, `rgba(0, 0, 0, 0.85)`)
- No centralized color management
- Mix of inline styles, CSS files, and Ant Design theme configuration
- ~73+ component CSS files that would need theme-aware styles

### Alternative Approaches Considered

1. **Component-level theme selectors** (e.g., PR #3160 approach)
   - Uses `body[data-theme='light']` selectors in every component
   - Requires 2-3 CSS blocks per component (default + light + dark)
   - Results in massive code duplication
   - Easy to forget theme styles for new components
   - Hard to maintain consistency

2. **CSS-in-JS theme objects**
   - Would require major refactoring of existing CSS
   - Performance concerns with runtime style injection
   - Doesn't work well with existing CSS modules

3. **Design token-based approach** (RECOMMENDED)
   - Single source of truth for all theme values
   - Components reference semantic tokens, never hardcoded values
   - Theme switching only requires updating token values
   - Scalable to unlimited themes

## Decision

We will implement a **design token-based theming system** using CSS custom properties (variables) with the following architecture:

### Core Principles

1. **Semantic tokens over hardcoded values**: All colors, shadows, spacing, etc. are defined as semantic tokens
2. **Single source of truth**: Theme definitions live in one place
3. **Component ignorance**: Components don't know about themes, only tokens
4. **Progressive enhancement**: Can be implemented incrementally without breaking existing functionality

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Theme Definition Layer (theme-tokens.css)                   │
│ - Defines all CSS custom properties                         │
│ - Light theme (default) + Dark theme overrides              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Component Layer (*.css)                                      │
│ - Uses var(--token-name) exclusively                         │
│ - No theme-specific selectors                                │
│ - No hardcoded colors                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Theme Provider (React Context)                               │
│ - Manages theme state                                        │
│ - Sets document.body.dataset.theme                           │
│ - Persists preference to localStorage                        │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Key Principle

Start with REALITY (what exists), not THEORY (what we think we need).

### Phase 0: Discovery & Analysis ⭐ CRITICAL FIRST STEP

**Goal:** Understand the current codebase and derive a taxonomy based on ACTUAL usage, not assumptions.

This phase was missing from the original plan but is ESSENTIAL for success.

#### 0.1 Comprehensive Color Audit ✅ COMPLETE

Find ALL hardcoded colors in the codebase using script in `./0001/phase-0-audit-colors.cjs`.

**Run the audit:**
```bash
cd /path/to/jaeger-ui
node docs/adr/0001/phase-0-audit-colors.cjs
```

**Output files:**
- `./0001/phase-0-audit-findings-detailed.json` - Complete machine-readable data (550KB)
- Console output with summary statistics and top colors

**Expected output:**
- Total hardcoded colors found
- Top 20 most-used color values
- Colors grouped by CSS property (background, color, border, etc.)
- Detailed JSON export for migration tool

**Actual output:**
- Findings summary: `./0001/phase-0-1-audit-findings.md`
- Detailed findings: `./0001/phase-0-1-audit-findings-detailed.json`


#### 0.2 Analyze Existing CSS Variables ✅ COMPLETE

Audit what CSS variables already exist using the automated script:

```bash
# Run the CSS variables audit script
node docs/adr/0001/phase-0-2-audit-css-variables.cjs
```

**✅ ACTUAL FINDINGS**:

**Summary:**
- **4 CSS variables** defined (3 color, 1 layout)
- **22 total usages** across the codebase
- **100% consistency** - all defined variables are used
- **2 naming patterns:** `--tx-color-*` and `--nav-*`

Full details in `./0001/phase-0-2-css-variables-findings.md`.

**Existing variables:**
- `--tx-color-title: rgba(0, 0, 0, 0.85)` - 9 usages in 7 files
- `--tx-color-body: rgba(0, 0, 0, 0.65)` - 2 usages in 1 file
- `--tx-color-muted: #aaa` - 7 usages in 5 files
- `--nav-height: 48px` - 4 usages in 3 files

**Decision: MIGRATE**
- Migrate to new naming convention: `--tx-color-title` → `--text-primary`
- See detailed migration strategy in findings document

#### 0.3 Component Categorization ✅ COMPLETE

**Prioritization Strategy:** Components are prioritized based on **business functions** rather than CSS complexity. The most critical user workflows should be themed first.

**Critical Business Functions:**
1. **Trace Search** - Landing page and primary entry point for users
2. **Trace Viewing** - Core trace visualization and analysis (TracePage/TraceTimeline)

**Component Inventory by Business Priority:**

##### Tier 1: Critical Path - Trace Search (Landing Page)

**SearchTracePage** and all dependencies:

| Component | CSS File | Hardcoded Colors | Notes |
|-----------|----------|------------------|-------|
| SearchTracePage | `SearchTracePage/index.css` | ~5 | Main container |
| SearchForm | `SearchTracePage/SearchForm.css` | 12 | Primary search interface |
| FileLoader | `SearchTracePage/FileLoader.css` | ~3 | File upload UI |
| SearchResults | `SearchTracePage/SearchResults/index.css` | ~8 | Results container |
| ResultItem | `SearchTracePage/SearchResults/ResultItem.css` | ~6 | Individual result cards |
| ResultItemTitle | `SearchTracePage/SearchResults/ResultItemTitle.css` | ~4 | Result titles |
| DiffSelection | `SearchTracePage/SearchResults/DiffSelection.css` | ~5 | Diff comparison UI |
| ScatterPlot | `SearchTracePage/SearchResults/ScatterPlot.css` | ~7 | Visualization |

**Dependencies (common components used by SearchTracePage):**
- `common/utils.css` (15 colors) - Foundation utilities
- `common/LoadingIndicator.css` (10 colors) - Loading states
- `common/ErrorMessage.css` (10 colors) - Error handling
- `App/TopNav.css` - Navigation (visible on every page)
- `App/Page.css` - Page layout
- `App/index.css` - Global styles

##### Tier 2: Critical Path - Trace Viewing

**TracePage/TraceTimeline** and all dependencies:

| Component | CSS File | Hardcoded Colors | Notes |
|-----------|----------|------------------|-------|
| TracePage | `TracePage/index.css` | ~5 | Main trace page container |
| **TraceTimelineViewer** | `TracePage/TraceTimelineViewer/index.css` | ~12 | Core timeline component |
| SpanBarRow | `TracePage/TraceTimelineViewer/SpanBarRow.css` | 34 | **HIGHEST COLOR COUNT** |
| SpanBar | `TracePage/TraceTimelineViewer/SpanBar.css` | ~10 | Individual span bars |
| SpanDetailRow | `TracePage/TraceTimelineViewer/SpanDetailRow.css` | ~8 | Span details |
| TimelineHeaderRow | `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineHeaderRow.css` | ~9 | Timeline header |
| TimelineCollapser | `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineCollapser.css` | ~6 | Collapse controls |
| TimelineViewingLayer | `TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineViewingLayer.css` | ~5 | Viewing layer |
| TimelineRow | `TracePage/TraceTimelineViewer/TimelineRow.css` | ~7 | Timeline rows |
| VirtualizedTraceView | `TracePage/TraceTimelineViewer/VirtualizedTraceView.css` | ~8 | Virtualized list |
| Ticks | `TracePage/TraceTimelineViewer/Ticks.css` | ~6 | Timeline ticks |
| SpanTreeOffset | `TracePage/TraceTimelineViewer/SpanTreeOffset.css` | ~4 | Tree indentation |
| ReferencesButton | `TracePage/TraceTimelineViewer/ReferencesButton.css` | ~5 | Reference links |
| grid.css | `TracePage/TraceTimelineViewer/grid.css` | ~8 | Grid layout |

**TraceTimelineViewer/SpanDetail** (expanded span details):
- `SpanDetail/index.css` (~9 colors)
- `SpanDetail/AccordianKeyValues.css` (~7 colors)
- `SpanDetail/AccordianLogs.css` (~6 colors)
- `SpanDetail/AccordianReferences.css` (~5 colors)
- `SpanDetail/AccordianText.css` (~4 colors)
- `SpanDetail/KeyValuesTable.css` (~8 colors)
- `SpanDetail/TextList.css` (~5 colors)

**TracePageHeader** (trace metadata and controls):
- `TracePageHeader/TracePageHeader.css` (13 colors)
- `TracePageHeader/TracePageSearchBar.css` (~7 colors)
- `TracePageHeader/AltViewOptions.css` (~6 colors)
- `TracePageHeader/KeyboardShortcutsHelp.css` (~5 colors)
- `TracePageHeader/SpanGraph/CanvasSpanGraph.css` (~8 colors)
- `TracePageHeader/SpanGraph/GraphTicks.css` (~5 colors)
- `TracePageHeader/SpanGraph/Scrubber.css` (~6 colors)
- `TracePageHeader/SpanGraph/TickLabels.css` (~4 colors)
- `TracePageHeader/SpanGraph/ViewingLayer.css` (~5 colors)

**Dependencies (common components used by TracePage):**
- `common/BreakableText.css` - Text wrapping
- `common/CopyIcon.css` - Copy functionality
- `common/LabeledList.css` - Key-value displays
- `common/TraceId.css` - Trace ID display
- `common/TraceName.css` - Trace name display
- `common/VerticalResizer.css` - Resizable panels
- `common/FilteredList/` - Filtering UI

##### Tier 3: Foundation Components

These must be done first as they're used everywhere:

| Component | CSS File | Hardcoded Colors | Notes |
|-----------|----------|------------------|-------|
| vars.css | `common/vars.css` | 3 | **EXISTING CSS VARIABLES** |
| utils.css | `common/utils.css` | 15 | Foundation utilities |
| App/index.css | `App/index.css` | ~8 | Global styles |
| App/TopNav.css | `App/TopNav.css` | ~10 | Navigation |
| App/Page.css | `App/Page.css` | ~6 | Page layout |

##### Tier 4: Secondary Features

Lower priority features (defer until Tier 1-3 complete):

- **TraceGraph** - Alternative trace visualization
- **TraceFlamegraph** - Flamegraph view
- **TraceStatistics** - Statistics panel
- **CriticalPath** - Critical path analysis
- **DependencyGraph** - Service dependency graph
- **DeepDependencies** - Deep dependency analysis
- **TraceDiff** - Trace comparison
- **Monitor** - Monitoring features
- **QualityMetrics** - Quality metrics

**Rationale for Business-Function Prioritization:**

1. **User Journey First:** Most users land on Search → view a Trace. These are the critical paths.
2. **Maximum Impact:** Theming the most-used features provides immediate value to all users.
3. **Dependency Management:** By identifying dependencies explicitly, we ensure shared components are themed consistently.
4. **Incremental Value:** Users see theming in their primary workflows first, even if secondary features aren't themed yet.

**✅ ACTUAL COLOR COUNTS:** See `0001/phase-0-1-udit-findings.md` for detailed audit data.

#### 0.4 Derive Token Taxonomy from Real Data ✅ COMPLETED

**This is the KEY deliverable** - create the token system based on what actually exists, not generic best practices.

Create `0001/phase-0-4-color-consolidation-analysis.md` (✅ COMPLETED):

```markdown
# Design Token Taxonomy

## Methodology

This taxonomy is derived from analyzing the actual Jaeger UI codebase:
- Analyzed X CSS files
- Found Y unique color values
- Identified Z common patterns

## Token Categories

**✅ ACTUAL AUDIT COMPLETED (Phase 0.1):**
- See `0001/phase-0-1-audit-findings.md` for complete audit results
- 528 hardcoded colors found across 85 files
- 150 unique color values identified
- Top colors: `white` (40), `#dddddd` (31), `#999999` (22), `#ffffff` (18)
- See `0001/phase-0-4-color-consolidation-analysis.md` for data-driven token taxonomy
```

#### 0.5 Create Migration Mapping ✅ COMPLETED

Create `0001/phase-0-5-migration-mapping.md` - a lookup table for developers:

> **⚠️ NOTE:** The examples below show the FORMAT. Actual values will come from Phase 0.1 audit data.

```markdown
# Color Migration Mapping

## Quick Reference

| Old Value | New Token | Context |
|-----------|-----------|---------|
| `#ffffff`, `#fff`, `white` | `var(--surface-primary)` | backgrounds |
| `#f5f5f5` | `var(--surface-secondary)` | secondary backgrounds |
| `#11939a` | `var(--text-link)` | link color |
| `#00474e` | `var(--text-link-hover)` | link hover |
| `rgba(0, 0, 0, 0.85)` | `var(--text-primary)` | primary text |
| `#e6e6e6` | `var(--border-default)` | borders |
| ... | ... | ... |

## By Component

### SearchForm.css
- Line 28: `background-color: #11939a` → `background-color: var(--interactive-primary)`
- Line 34: `background-color: #fff` → `background-color: var(--surface-primary)`
[... etc ...]
```

**Deliverables from Phase 0:**
- ✅ `0001/phase-0-1-audit-colors.cjs` - Color audit script
- ✅ `0001/phase-0-1-audit-findings-detailed.json` - Color audit data (550KB)
- ✅ `0001/phase-0-1-audit-findings.md` - Color audit summary
- ✅ `0001/phase-0-1-color-consolidation-analysis.md` - Derived token system (THE KEY DOCUMENT)
- ✅ `0001/phase-0-2-audit-css-variables.cjs` - CSS variables audit script
- ✅ `0001/phase-0-2-css-variables-detailed.json` - CSS variables data (14KB)
- ✅ `0001/phase-0-2-css-variables-findings.md` - CSS variables analysis
- ✅ `0001/phase-0-5-migration-mapping.md` - Old color → New token mapping (Phase 0.5 - pending)

---

### Phase 1: Centralize Colors

**Goal:** Create a single source of truth for ALL colors currently in use, WITHOUT introducing theming yet.

This is a pure refactoring step - no visual changes, no new features, just consolidation.

#### 1.1 Create Centralized Color Variables ✅ COMPLETED

Use `packages/jaeger-ui/src/components/common/vars.css` for variables based on Phase 0 findings:

> **ACTUAL token values** must come from:
> - `0001/phase-0-4-color-consolidation-analysis.md` (recommended initial tokens)
> - `0001/phase-0-1-audit-findings-detailed.json` (complete audit data)
> - `0001/phase-0-1-audit-findings.md` (complete audit summary)

**Import this file FIRST** in `packages/jaeger-ui/src/components/App/index.jsx`:

```javascript
// MUST be imported before any component CSS
import '../../components/common/vars.css';
```

#### 1.2 Incremental Component Migration

**Goal:** Replace hardcoded colors with variables, one component at a time.

**Process for each component:**

1. **Check migration mapping** (`./0001/phase-0-5-migration-mapping.md`) and the prioritized components `./0001/phase-0-3-component-categorization-findings.md`
2. **Replace colors** using find-and-replace
3. **Test visually** - should look IDENTICAL
4. **Commit** with message: `refactor(ComponentName): migrate to centralized color variables`

**Example migration** - `SearchForm.css`:

```diff
/* Before */
.SearchForm--submit {
-  background-color: #11939a;
+  background-color: var(--interactive-primary);
  color: white;
}

.SearchForm--submit:hover {
-  background-color: #fff;
+  background-color: var(--surface-primary);
}

.SearchForm--labelCount {
-  color: #999;
+  color: var(--text-muted);
}

.SearchForm--hintTrigger {
-  border: 1px solid #999;
+  border: 1px solid var(--text-muted);
-  color: #999;
+  color: var(--text-muted);
}
```

**Migration order** (based on business-function prioritization from Phase 0.3):

**Batch 1: Foundation (Tier 3)** ✅ COMPLETED
These are used everywhere and must be migrated first:
- [x] `App/index.css` - Global styles (~8 colors)
- [x] `App/TopNav.css` - Navigation visible on every page (~10 colors)
- [x] `App/Page.css` - Page layout (~6 colors)

**Batch 2: Trace Search - Landing Page (Tier 1)**
Critical path for all users:
- [ ] `SearchTracePage/index.css` - Main container (~5 colors)
- [ ] `SearchTracePage/SearchForm.css` - Primary search interface (12 colors)
- [ ] `SearchTracePage/FileLoader.css` - File upload UI (~3 colors)
- [ ] `SearchTracePage/SearchResults/index.css` - Results container (~8 colors)
- [ ] `SearchTracePage/SearchResults/ResultItem.css` - Result cards (~6 colors)
- [ ] `SearchTracePage/SearchResults/ResultItemTitle.css` - Result titles (~4 colors)
- [ ] `SearchTracePage/SearchResults/DiffSelection.css` - Diff comparison (~5 colors)
- [ ] `SearchTracePage/SearchResults/ScatterPlot.css` - Visualization (~7 colors)

**Batch 2 Dependencies (common components):**
- [ ] `common/LoadingIndicator.css` - Loading states (10 colors)
- [ ] `common/ErrorMessage.css` - Error handling (10 colors)

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

**Migration Strategy:**
1. Complete Batch 1 (Foundation) first - these are dependencies for everything
2. Complete Batch 2 (Trace Search) - immediate user-facing value
3. Complete Batch 3 (Trace Viewing) - completes the critical user journey
4. Batch 4 can be done incrementally or deferred to future releases


#### 1.3 Handle Existing CSS Variables

**Decision:** Migrate or keep existing variables?

Current variables in `vars.css`:
```css
:root {
  --tx-color-title: rgba(0, 0, 0, 0.85);
  --tx-color-body: rgba(0, 0, 0, 0.65);
  --tx-color-muted: #aaa;
}
```

**Option A:** Keep and add aliases
```css
:root {
  /* New naming */
  --text-primary: rgba(0, 0, 0, 0.85);
  --text-secondary: rgba(0, 0, 0, 0.65);
  --text-muted: #aaa;

  /* Legacy aliases - deprecated, remove in Phase 3 */
  --tx-color-title: var(--text-primary);
  --tx-color-body: var(--text-secondary);
  --tx-color-muted: var(--text-muted);
}
```

**Option B:** Direct migration (RECOMMENDED)
- Find all `var(--tx-color-title)` → replace with `var(--text-primary)`
- Find all `var(--tx-color-body)` → replace with `var(--text-secondary)`
- Remove old variables

#### 1.4 Validation & Testing

**Visual regression testing:**

```bash
# Take screenshots before migration
npm run test:visual:baseline

# After each component migration
npm run test:visual:compare

# Should show ZERO visual differences
```

**Automated validation:**

```bash
# Run the audit script again
node docs/adr/0001/phase-0-audit-colors.cjs > phase-1-audit-after.txt

# Compare before/after
diff docs/adr/0001/phase-0-audit-findings-detailed.json phase-1-audit-after.txt

# Goal: Significant reduction in hardcoded colors
```

**Manual testing checklist:**
- [ ] All pages render correctly
- [ ] No visual regressions
- [ ] Colors match exactly
- [ ] No console errors
- [ ] All tests pass

**Deliverables from Phase 1:**
- ✅ `vars.css` - Single source of truth for current colors
- ✅ All components migrated to use variables
- ✅ Zero (or near-zero) hardcoded colors remaining
- ✅ Visual regression tests passing
- ✅ No functional changes - pure refactoring

---

### Phase 2: Add Dark Theme Support

**Goal:** Now that all colors are centralized, add dark theme by ONLY updating the variable definitions.

This is where the design token approach pays off - we only touch ONE file!

#### 2.1 Design Dark Theme Colors

**Work with designer** to create dark theme palette based on light theme tokens:

Create `0001/dark-theme-palette.md` (optional documentation):

```markdown
# Dark Theme Color Palette

## Methodology
- Start with light theme tokens
- Invert luminosity while maintaining contrast ratios
- Ensure WCAG AA compliance (4.5:1 for text, 3:1 for UI components)
- Test with actual UI screenshots

## Token Mappings

| Token | Light Value | Dark Value | Rationale |
|-------|-------------|------------|-----------|
| --surface-primary | #ffffff | #1a1a1a | Main background |
| --surface-secondary | #f5f5f5 | #2a2a2a | Secondary background |
| --text-primary | rgba(0,0,0,0.85) | rgba(255,255,255,0.92) | High contrast |
| --text-link | #11939a | #7bdcff | Brighter for dark bg |
| --border-default | #e6e6e6 | rgba(255,255,255,0.2) | Subtle on dark |
| ... | ... | ... | ... |
```

#### 2.2 Add Dark Theme Variables

Update `packages/jaeger-ui/src/components/common/vars.css` to add dark theme overrides:

```css
/* ... existing :root { } with light theme ... */

/* ============================================
   DARK THEME OVERRIDES
   Only override values that change in dark mode
   ============================================ */
body[data-theme='dark'] {
  /* Surfaces */
  --surface-primary: #1a1a1a;
  --surface-secondary: #2a2a2a;
  --surface-tertiary: #3a3a3a;
  --surface-overlay: rgba(0, 0, 0, 0.8);

  /* Text */
  --text-primary: rgba(255, 255, 255, 0.92);
  --text-secondary: rgba(255, 255, 255, 0.68);
  --text-muted: rgba(255, 255, 255, 0.52);
  --text-link: #7bdcff;
  --text-link-hover: #a8e8ff;
  --text-inverse: rgba(0, 0, 0, 0.85);

  /* Borders */
  --border-default: rgba(255, 255, 255, 0.2);
  --border-subtle: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.3);

  /* Interactive */
  --interactive-primary: #7bdcff;
  --interactive-primary-hover: #a8e8ff;
  --interactive-secondary: #20c7d1;

  /* Feedback - brighter for dark backgrounds */
  --feedback-error: #ff6b6b;
  --feedback-warning: #ffa94d;
  --feedback-success: #51cf66;
  --feedback-info: #74c0fc;

  /* Shadows - darker and more pronounced */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.6);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.7);

  /* Browser hint */
  color-scheme: dark;
}
```

**That's it!** All components automatically get dark theme because they use variables.

#### 2.3 Create Theme Provider Component

Create `packages/jaeger-ui/src/components/App/ThemeProvider.tsx`:

```typescript
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const THEME_STORAGE_KEY = 'jaeger-ui-theme';
const DEFAULT_MODE: ThemeMode = 'light';

const ThemeModeContext = createContext<ThemeContextValue>({
  mode: DEFAULT_MODE,
  setMode: () => undefined,
  toggleMode: () => undefined,
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

// Helper to detect system preference
function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Helper to read stored preference
function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (e) {
    // localStorage might be blocked
  }
  return null;
}

// Helper to persist preference
function setStoredTheme(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    // localStorage might be blocked
  }
}

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from stored preference, fallback to system, then default
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return getStoredTheme() ?? getSystemTheme();
  });

  // Update DOM and storage when mode changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = mode;
    }
    setStoredTheme(mode);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(current => current === 'light' ? 'dark' : 'light');
  }, []);

  const contextValue = useMemo(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode]
  );

  // Ant Design theme configuration
  const antdTheme: ThemeConfig = useMemo(() => ({
    token: {
      // Map Ant Design tokens to our CSS variables
      // This ensures Ant components also respect the theme
      colorPrimary: mode === 'light' ? '#1976d2' : '#7bdcff',
      colorBgContainer: mode === 'light' ? '#ffffff' : 'rgba(12, 20, 36, 0.95)',
      colorBgLayout: mode === 'light' ? '#f5f7fb' : 'rgba(8, 16, 32, 0.92)',
      colorText: mode === 'light' ? 'rgba(13, 30, 54, 0.9)' : 'rgba(244, 248, 255, 0.92)',
      colorBorder: mode === 'light' ? '#d3ddeb' : 'rgba(123, 220, 255, 0.35)',
    },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
```

#### 1.3 Create Theme Toggle Component

Create `packages/jaeger-ui/src/components/App/ThemeToggleButton.tsx`:

```typescript
import React from 'react';
import { Button, Tooltip } from 'antd';
import { IoMoon, IoSunny } from 'react-icons/io5';
import { useThemeMode } from './ThemeProvider';
import './ThemeToggleButton.css';

export default function ThemeToggleButton() {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';
  const label = isDark ? 'Light' : 'Dark';

  return (
    <Tooltip title={`Switch to ${label.toLowerCase()} mode`} placement="bottomRight">
      <Button
        aria-label="Toggle color mode"
        aria-pressed={isDark}
        className="ThemeToggleButton"
        onClick={toggleMode}
        type="text"
        icon={isDark ? <IoSunny /> : <IoMoon />}
      >
        {label} mode
      </Button>
    </Tooltip>
  );
}
```

With CSS in `ThemeToggleButton.css`:

```css
.ThemeToggleButton {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-inverse);
  border: 1px solid var(--border-subtle);
  background: var(--surface-overlay);
  transition: all 0.2s ease;
}

.ThemeToggleButton:hover {
  background: var(--surface-secondary);
  border-color: var(--border-default);
}
```

#### 1.4 Integrate Theme Provider

Update `packages/jaeger-ui/src/components/App/index.jsx`:

```jsx
import AppThemeProvider from './ThemeProvider';
import '../styles/theme-tokens.css'; // Import tokens first!

export default class JaegerUIApp extends Component {
  render() {
    return (
      <AppThemeProvider>
        <Provider store={store}>
          <Page>
            {/* ... routes ... */}
          </Page>
        </Provider>
      </AppThemeProvider>
    );
  }
}
```

### Phase 2: Create Migration Tooling

#### 2.1 Color Audit Script

Create `docs/adr/0001/phase-0-audit-colors.cjs` to find all hardcoded colors (✅ COMPLETED):

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Regex patterns for colors
const patterns = {
  hex: /#[0-9a-fA-F]{3,8}\b/g,
  rgb: /rgba?\([^)]+\)/g,
  hsl: /hsla?\([^)]+\)/g,
};

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  Object.entries(patterns).forEach(([type, regex]) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Skip if it's already a CSS variable
      if (content.slice(Math.max(0, match.index - 10), match.index).includes('var(--')) {
        continue;
      }

      findings.push({
        file: filePath,
        line: content.slice(0, match.index).split('\n').length,
        type,
        value: match[0],
      });
    }
  });

  return findings;
}

// Scan all CSS files
const cssFiles = glob.sync('packages/jaeger-ui/src/**/*.css');
const allFindings = cssFiles.flatMap(auditFile);

// Group by color value
const grouped = allFindings.reduce((acc, finding) => {
  if (!acc[finding.value]) acc[finding.value] = [];
  acc[finding.value].push(finding);
  return acc;
}, {});

// Output report
console.log('Color Audit Report');
console.log('==================\n');
console.log(`Total hardcoded colors found: ${allFindings.length}\n`);

Object.entries(grouped)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([color, occurrences]) => {
    console.log(`${color} (${occurrences.length} occurrences)`);
    occurrences.slice(0, 3).forEach(occ => {
      console.log(`  - ${occ.file}:${occ.line}`);
    });
    if (occurrences.length > 3) {
      console.log(`  ... and ${occurrences.length - 3} more`);
    }
    console.log('');
  });

// Export JSON for migration tool
fs.writeFileSync(
  'color-audit.json',
  JSON.stringify(grouped, null, 2)
);
```

#### 2.2 Color Mapping Guide

Create `0001/migration-mapping.md` (⏳ Phase 0.5 - pending):

```markdown
# Color Migration Guide

## Common Color Mappings

| Old Value | New Token | Usage |
|-----------|-----------|-------|
| `#ffffff`, `#fff` | `var(--surface-primary)` | White backgrounds |
| `#f5f5f5`, `#fafafa` | `var(--surface-secondary)` | Light gray backgrounds |
| `#000`, `rgba(0,0,0,0.85)` | `var(--text-primary)` | Primary text |
| `#666`, `#999` | `var(--text-secondary)` | Secondary text |
| `#11939a` | `var(--interactive-secondary)` | Jaeger teal (secondary actions) |
| `#1976d2` | `var(--interactive-primary)` | Primary blue (main actions) |
| `#db2828` | `var(--feedback-error)` | Error states |
| `#ccc`, `#d8d8d8` | `var(--border-default)` | Borders |

## Decision Tree

1. **Is it a background color?**
   - White/very light → `--surface-primary`
   - Light gray → `--surface-secondary`
   - Medium gray → `--surface-tertiary`
   - Overlay/modal → `--surface-overlay`

2. **Is it text?**
   - Main content → `--text-primary`
   - Supporting text → `--text-secondary`
   - Hints/placeholders → `--text-tertiary`
   - Disabled → `--text-disabled`
   - On dark backgrounds → `--text-inverse`

3. **Is it interactive?**
   - Primary action → `--interactive-primary` + hover/active variants
   - Secondary action → `--interactive-secondary` + hover/active variants

4. **Is it feedback?**
   - Error → `--feedback-error`
   - Warning → `--feedback-warning`
   - Success → `--feedback-success`
   - Info → `--feedback-info`

5. **Is it a border?**
   - Standard → `--border-default`
   - Subtle → `--border-subtle`
   - Emphasized → `--border-strong`

6. **Is it a shadow?**
   - Use `--shadow-{xs|sm|md|lg|xl|2xl}` based on elevation

## Migration Process

For each CSS file:

1. Run the audit script to find hardcoded colors
2. For each color, determine its semantic meaning
3. Replace with appropriate token
4. Test in both light and dark modes
5. Commit with descriptive message
```

### Phase 3: Incremental Migration

#### 3.1 Prioritization Strategy

Migrate components in this order:

**Priority 1 - Foundation (Week 3-4)**
- `packages/jaeger-ui/src/components/App/index.css` (global styles)
- `packages/jaeger-ui/src/components/App/Page.css`
- `packages/jaeger-ui/src/components/App/TopNav.css`
- `packages/jaeger-ui/src/components/common/*.css` (shared components)

**Priority 2 - High-Traffic Pages (Week 4-5)**
- `packages/jaeger-ui/src/components/SearchTracePage/**/*.css`
- `packages/jaeger-ui/src/components/TracePage/**/*.css`

**Priority 3 - Secondary Pages (Week 5-6)**
- `packages/jaeger-ui/src/components/DependencyGraph/**/*.css`
- `packages/jaeger-ui/src/components/Monitor/**/*.css`
- `packages/jaeger-ui/src/components/QualityMetrics/**/*.css`

**Priority 4 - Remaining Components (Week 6-8)**
- All other component CSS files
- Edge cases and special states

#### 3.2 Migration Template

For each component, follow this pattern:

**Before:**
```css
.SearchForm {
  background-color: #ffffff;
  border: 1px solid #d8d8d8;
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.SearchForm:hover {
  border-color: #11939a;
}

body[data-theme='dark'] .SearchForm {
  background-color: rgba(12, 20, 36, 0.95);
  border-color: rgba(123, 220, 255, 0.35);
  color: rgba(244, 248, 255, 0.92);
}
```

**After:**
```css
.SearchForm {
  background-color: var(--surface-primary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.SearchForm:hover {
  border-color: var(--interactive-secondary);
}

/* No theme-specific selectors needed! */
```

#### 3.3 Testing Checklist

For each migrated component:

- [ ] Visual regression test in light mode
- [ ] Visual regression test in dark mode
- [ ] Toggle between themes works smoothly
- [ ] No hardcoded colors remain (run audit script)
- [ ] Ant Design components within also themed correctly
- [ ] Accessibility: sufficient contrast in both themes
- [ ] No console errors or warnings

### Phase 4: Ant Design Integration

#### 4.1 Sync Ant Design Theme

Ensure Ant Design's theme tokens align with our CSS variables:

```typescript
// In ThemeProvider.tsx
const antdTheme: ThemeConfig = useMemo(() => {
  // Read computed CSS variables from :root
  const root = document.documentElement;
  const getToken = (name: string) =>
    getComputedStyle(root).getPropertyValue(name).trim();

  return {
    token: {
      colorPrimary: getToken('--interactive-primary'),
      colorBgContainer: getToken('--surface-primary'),
      colorBgLayout: getToken('--surface-secondary'),
      colorText: getToken('--text-primary'),
      colorTextSecondary: getToken('--text-secondary'),
      colorBorder: getToken('--border-default'),
      colorError: getToken('--feedback-error'),
      colorWarning: getToken('--feedback-warning'),
      colorSuccess: getToken('--feedback-success'),
      colorInfo: getToken('--feedback-info'),
      borderRadius: 8, // or read from --radius-md
    },
    components: {
      Button: {
        primaryShadow: getToken('--shadow-sm'),
      },
      Card: {
        boxShadow: getToken('--shadow-md'),
      },
      // ... other component-specific overrides
    },
  };
}, [mode]);
```

**Note:** This creates a bridge between our CSS variables and Ant Design's theme system.

### Phase 5: Documentation & Governance

#### 5.1 Developer Documentation

Create `0001/README.md` (✅ COMPLETED):

```markdown
# Theming Guide for Developers

## Quick Start

### Using Theme Tokens

**DO:**
```css
.MyComponent {
  background: var(--surface-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}
```

**DON'T:**
```css
.MyComponent {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cccccc;
}

/* NEVER use theme-specific selectors in components! */
body[data-theme='dark'] .MyComponent {
  background: #1a1a1a;
}
```

### Available Tokens

See `packages/jaeger-ui/src/styles/theme-tokens.css` for the complete list.

### Adding New Tokens

1. Determine if an existing token can be reused
2. If not, add to `theme-tokens.css` with semantic name
3. Define value for both light and dark themes
4. Document in this guide
5. Update TypeScript types if needed

### Testing Your Changes

```bash
# Run in light mode
npm start

# Toggle to dark mode using the theme switcher in top nav

# Run visual regression tests
npm run test:visual
```

## Architecture

- **Single source of truth**: All theme values in `theme-tokens.css`
- **Semantic naming**: Tokens describe purpose, not appearance
- **Component ignorance**: Components never know about themes
- **CSS variables**: Automatic theme switching via CSS cascade

## Common Patterns

### Conditional Styling

**DON'T:**
```css
body[data-theme='dark'] .Button {
  background: #333;
}
```

**DO:**
```css
/* Add a new token if needed */
:root {
  --button-special-bg: #f0f0f0;
}
body[data-theme='dark'] {
  --button-special-bg: #333;
}

/* Component uses the token */
.Button {
  background: var(--button-special-bg);
}
```

### Opacity Variations

**DON'T:**
```css
.Overlay {
  background: rgba(255, 255, 255, 0.9);
}
body[data-theme='dark'] .Overlay {
  background: rgba(0, 0, 0, 0.9);
}
```

**DO:**
```css
/* Define token with opacity included */
:root {
  --overlay-bg: rgba(255, 255, 255, 0.9);
}
body[data-theme='dark'] {
  --overlay-bg: rgba(12, 20, 36, 0.9);
}

.Overlay {
  background: var(--overlay-bg);
}
```

## Linting

We enforce token usage via ESLint:

```javascript
// .eslintrc.js
rules: {
  'no-hardcoded-colors': 'error', // Custom rule
}
```

This prevents hardcoded colors from being committed.
```

#### 5.2 ESLint Rule for Enforcement

Create `eslint-rules/no-hardcoded-colors.js`:

```javascript
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded color values in CSS',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      hardcodedColor: 'Hardcoded color "{{value}}" found. Use a CSS variable from theme-tokens.css instead.',
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;

        const colorPatterns = [
          /#[0-9a-fA-F]{3,8}\b/,
          /rgba?\([^)]+\)/,
          /hsla?\([^)]+\)/,
        ];

        const isColor = colorPatterns.some(pattern => pattern.test(node.value));
        const isVariable = node.value.includes('var(--');

        if (isColor && !isVariable) {
          context.report({
            node,
            messageId: 'hardcodedColor',
            data: { value: node.value },
          });
        }
      },
    };
  },
};
```

#### 5.3 Visual Regression Testing

Set up Playwright or Chromatic for visual regression:

```javascript
// tests/visual/theme-switching.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test('Search page renders correctly in light mode', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveScreenshot('search-light.png');
  });

  test('Search page renders correctly in dark mode', async ({ page }) => {
    await page.goto('/search');
    await page.evaluate(() => {
      document.body.dataset.theme = 'dark';
    });
    await expect(page).toHaveScreenshot('search-dark.png');
  });

  test('Theme toggle works', async ({ page }) => {
    await page.goto('/search');

    // Start in light mode
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');

    // Click toggle
    await page.click('[aria-label="Toggle color mode"]');

    // Should be dark now
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');

    // Preference should persist
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  });
});
```

### Phase 6: Rollout & Monitoring

#### 6.1 Feature Flag

Initially hide theme toggle behind feature flag:

```typescript
// In config
export const FEATURES = {
  THEME_SWITCHING: process.env.REACT_APP_ENABLE_THEME_SWITCHING === 'true',
};

// In TopNav
{FEATURES.THEME_SWITCHING && <ThemeToggleButton />}
```

#### 6.2 Gradual Rollout

1. **Week 10**: Enable for internal testing
2. **Week 11**: Beta release to opt-in users
3. **Week 12**: General availability

#### 6.3 Monitoring

Track theme usage:

```typescript
// In ThemeProvider
useEffect(() => {
  analytics.track('theme_changed', {
    theme: mode,
    timestamp: Date.now(),
  });
}, [mode]);
```

## Consequences

### Positive

✅ **Maintainability**: Single source of truth for all theme values
✅ **Scalability**: Adding new themes only requires updating token definitions
✅ **Developer Experience**: Components don't need to think about themes
✅ **Consistency**: Enforced through tokens and linting
✅ **Performance**: CSS variables are highly performant
✅ **Accessibility**: Easier to ensure proper contrast ratios
✅ **Future-proof**: Can add unlimited themes without touching components

### Negative

⚠️ **Initial Investment**: Significant upfront work to migrate existing code
⚠️ **Learning Curve**: Team needs to learn token system
⚠️ **IE11 Support**: CSS variables not supported (but IE11 is EOL)

### Neutral

ℹ️ **Migration Timeline**: 10-12 weeks for complete migration
ℹ️ **Code Review Overhead**: Need to enforce token usage in reviews
ℹ️ **Documentation**: Requires ongoing maintenance of token catalog

## Alternatives Considered

See "Alternative Approaches Considered" section above.

## References

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Design Tokens (W3C Community Group)](https://design-tokens.github.io/community-group/format/)
- [Ant Design Theming](https://ant.design/docs/react/customize-theme)
- [Material Design Color System](https://m3.material.io/styles/color/system/overview)

## Decision Makers

- [List key stakeholders who approved this approach]

## Date

[Date of decision]

---

**Status**: Proposed
**Last Updated**: [Date]
**Next Review**: [Date]

---

## Appendix A: Color Audit Script

Complete implementation available at `docs/adr/0001/phase-0-audit-colors.cjs` (✅ COMPLETED).

The script below shows the reference implementation:

```javascript
#!/usr/bin/env node

/**
 * Color Audit Script
 *
 * Scans all CSS files in the codebase and identifies hardcoded color values.
 * Generates a detailed report for migration planning.
 *
 * Usage:
 *   node docs/adr/0001/phase-0-audit-colors.cjs
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Regex patterns for different color formats
const patterns = {
  hex: /#[0-9a-fA-F]{3,8}\b/g,
  rgb: /rgba?\([^)]+\)/g,
  hsl: /hsla?\([^)]+\)/g,
  named: /\b(white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|brown|cyan|magenta|teal|lime|olive|navy|maroon|aqua|fuchsia|silver)\b/gi,
};

/**
 * Audit a single CSS file for hardcoded colors
 */
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  lines.forEach((line, idx) => {
    // Skip lines that are:
    // - Comments
    // - CSS variable definitions (--variable-name)
    // - CSS variable usage (var(--variable-name))
    if (
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*') ||
      line.includes('--') ||
      line.includes('var(')
    ) {
      return;
    }

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(value => {
          // Skip common non-color values
          if (value === 'white-space' || value === 'content') return;

          findings.push({
            file: filePath.replace(process.cwd() + '/', ''),
            line: idx + 1,
            type,
            value: normalizeColor(value),
            context: line.trim(),
            property: extractProperty(line),
          });
        });
      }
    });
  });

  return findings;
}

/**
 * Normalize color values for grouping
 */
function normalizeColor(color) {
  // Normalize hex colors
  if (color.startsWith('#')) {
    color = color.toLowerCase();
    // Expand 3-digit hex to 6-digit
    if (color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
  }
  // Normalize whitespace in rgb/hsl
  color = color.replace(/\s+/g, ' ');
  return color;
}

/**
 * Extract CSS property name from a line
 */
function extractProperty(line) {
  const match = line.match(/^\s*([a-z-]+)\s*:/);
  return match ? match[1] : 'unknown';
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(80));
  console.log('JAEGER UI - COLOR AUDIT REPORT');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');

  // Scan all CSS files
  const cssFiles = glob.sync('packages/jaeger-ui/src/**/*.css');
  console.log(`Scanning ${cssFiles.length} CSS files...\n`);

  const allFindings = cssFiles.flatMap(auditFile);

  // Group by color value
  const byColor = allFindings.reduce((acc, finding) => {
    if (!acc[finding.value]) acc[finding.value] = [];
    acc[finding.value].push(finding);
    return acc;
  }, {});

  // Group by property
  const byProperty = allFindings.reduce((acc, finding) => {
    if (!acc[finding.property]) acc[finding.property] = [];
    acc[finding.property].push(finding);
    return acc;
  }, {});

  // Group by file
  const byFile = allFindings.reduce((acc, finding) => {
    if (!acc[finding.file]) acc[finding.file] = [];
    acc[finding.file].push(finding);
    return acc;
  }, {});

  // Summary statistics
  console.log('='.repeat(80));
  console.log('SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total hardcoded colors found: ${allFindings.length}`);
  console.log(`Unique color values: ${Object.keys(byColor).length}`);
  console.log(`Files with hardcoded colors: ${Object.keys(byFile).length}`);
  console.log(`CSS properties affected: ${Object.keys(byProperty).length}`);
  console.log('');

  // Top 30 most used colors
  console.log('='.repeat(80));
  console.log('TOP 30 MOST USED COLORS');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(byColor)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 30)
    .forEach(([color, occurrences], index) => {
      console.log(`${index + 1}. ${color} (${occurrences.length} occurrences)`);

      // Show property breakdown
      const props = {};
      occurrences.forEach(occ => {
        props[occ.property] = (props[occ.property] || 0) + 1;
      });
      console.log(`   Properties: ${Object.entries(props)
        .sort((a, b) => b[1] - a[1])
        .map(([p, c]) => `${p}(${c})`)
        .join(', ')}`);

      // Show sample locations (first 3)
      occurrences.slice(0, 3).forEach(occ => {
        console.log(`   - ${occ.file}:${occ.line}`);
      });
      if (occurrences.length > 3) {
        console.log(`   ... and ${occurrences.length - 3} more`);
      }
      console.log('');
    });

  // Colors by CSS property
  console.log('='.repeat(80));
  console.log('COLORS BY CSS PROPERTY');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(byProperty)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([property, occurrences]) => {
      const uniqueColors = new Set(occurrences.map(o => o.value));
      console.log(`${property}: ${occurrences.length} uses, ${uniqueColors.size} unique colors`);

      // Show top 5 colors for this property
      const colorCounts = {};
      occurrences.forEach(occ => {
        colorCounts[occ.value] = (colorCounts[occ.value] || 0) + 1;
      });

      Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([color, count]) => {
          console.log(`  ${color} (${count}x)`);
        });
      console.log('');
    });

  // Files with most hardcoded colors
  console.log('='.repeat(80));
  console.log('FILES WITH MOST HARDCODED COLORS (Top 20)');
  console.log('='.repeat(80));
  console.log('');

  Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .forEach(([file, occurrences]) => {
      console.log(`${file}: ${occurrences.length} hardcoded colors`);
    });
  console.log('');

  // Export detailed JSON for migration tool
  const jsonOutput = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalFindings: allFindings.length,
      uniqueColors: Object.keys(byColor).length,
      filesScanned: cssFiles.length,
      filesWithColors: Object.keys(byFile).length,
    },
    byColor,
    byProperty,
    byFile,
    allFindings,
  };

  fs.writeFileSync(
    'docs/adr/0001/phase-0-audit-findings-detailed.json',
    JSON.stringify(jsonOutput, null, 2)
  );

  console.log('='.repeat(80));
  console.log(`Detailed JSON report saved to: docs/adr/0001/phase-0-audit-findings-detailed.json`);
  console.log('='.repeat(80));
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the top colors and identify patterns');
  console.log('2. Create token taxonomy based on actual usage');
  console.log('3. Create migration mapping document');
  console.log('4. Begin incremental migration');
}

// Run the audit
main();
```

Save this script and run it as the FIRST step of implementation.

