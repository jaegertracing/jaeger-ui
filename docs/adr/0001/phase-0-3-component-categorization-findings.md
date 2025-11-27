# Phase 0.3: Component Categorization Findings

**Generated:** 2025-11-27  
**Status:** ✅ COMPLETE

## Executive Summary

Analyzed **103 CSS files** totaling **5,619 lines** with **528 hardcoded colors**:
- **10 HIGH priority** files (≥15 colors) = 188 colors (36% of total)
- **16 MEDIUM priority** files (8-14 colors) = 161 colors (30% of total)
- **59 LOW priority** files (1-7 colors) = 179 colors (34% of total)
- **18 files** with no colors

**Key insight:** Just **26 files (25%)** contain **349 colors (66%)** of all hardcoded colors. Focusing on these high/medium priority files will give us the most impact.

## Detailed Findings

### 1. Overall Statistics

| Metric | Value |
|--------|-------|
| Total CSS files | 103 |
| Total CSS lines | 5,619 |
| Total hardcoded colors | 528 |
| Average colors per file | 5.1 |
| Files with colors | 85 (83%) |
| Files without colors | 18 (17%) |

### 2. Priority Distribution

| Priority | Files | Colors | % of Total Colors |
|----------|-------|--------|-------------------|
| HIGH (≥15 colors) | 10 | 188 | 36% |
| MEDIUM (8-14 colors) | 16 | 161 | 30% |
| LOW (1-7 colors) | 59 | 179 | 34% |
| NONE (0 colors) | 18 | 0 | 0% |

**Impact Analysis:**
- Top 10 files (HIGH) = 36% of all colors
- Top 26 files (HIGH + MEDIUM) = 66% of all colors
- Remaining 77 files = 34% of all colors

### 3. Components by Category

Sorted by total colors in category:

| Category | Files | Colors | Lines | Avg Colors/File |
|----------|-------|--------|-------|-----------------|
| TracePage | 38 | 186 | 2,556 | 4.9 |
| Common/Utilities | 18 | 94 | 816 | 5.2 |
| Other | 10 | 68 | 547 | 6.8 |
| DeepDependencies | 12 | 68 | 634 | 5.7 |
| SearchTracePage | 8 | 41 | 300 | 5.1 |
| DependencyGraph | 3 | 40 | 257 | 13.3 |
| Monitor | 4 | 14 | 258 | 3.5 |
| QualityMetrics | 6 | 12 | 167 | 2.0 |
| App/Layout | 4 | 5 | 84 | 1.3 |

**Key Observations:**
- **TracePage** is the largest category (38 files, 186 colors)
- **DependencyGraph** has highest color density (13.3 colors/file)
- **App/Layout** has minimal colors (only 5 total) - good foundation for migration
- **Common/Utilities** has 94 colors across 18 files - critical for reusability

### 4. HIGH Priority Components (≥15 colors)

These 10 files should be migrated first after foundation:

| # | Component | Colors | Lines | Complexity | Category |
|---|-----------|--------|-------|------------|----------|
| 1 | `TracePage/TraceTimelineViewer/SpanBarRow.css` | 34 | 190 | MODERATE | TracePage |
| 2 | `DependencyGraph/dag.css` | 21 | 82 | SIMPLE | DependencyGraph |
| 3 | `TraceDiff/TraceDiffHeader/TraceDiffHeader.css` | 19 | 98 | SIMPLE | Other |
| 4 | `DependencyGraph/DAGOptions.css` | 18 | 151 | MODERATE | DependencyGraph |
| 5 | `TracePage/TraceGraph/TraceGraph.css` | 18 | 111 | MODERATE | TracePage |
| 6 | `TraceDiff/TraceDiffGraph/renderNode.css` | 17 | 94 | SIMPLE | Other |
| 7 | `DeepDependencies/Header/index.css` | 16 | 102 | MODERATE | DeepDependencies |
| 8 | `common/NameSelector.css` | 15 | 74 | SIMPLE | Common/Utilities |
| 9 | `common/utils.css` | 15 | 138 | MODERATE | Common/Utilities |
| 10 | `TraceDiff/TraceDiffGraph/TraceDiffGraph.css` | 15 | 158 | MODERATE | Other |

**Total:** 188 colors across 10 files

### 5. MEDIUM Priority Components (8-14 colors)

Top 10 of 16 medium priority files:

| # | Component | Colors | Lines | Complexity |
|---|-----------|--------|-------|------------|
| 1 | `DeepDependencies/Graph/getNodeRenderers.css` | 14 | 56 | SIMPLE |
| 2 | `common/FilteredList/ListItem.css` | 13 | 56 | SIMPLE |
| 3 | `TracePage/TracePageHeader/TracePageHeader.css` | 13 | 101 | MODERATE |
| 4 | `SearchTracePage/SearchForm.css` | 12 | 69 | SIMPLE |
| 5 | `DeepDependencies/SidePanel/DetailsPanel.css` | 11 | 73 | SIMPLE |
| 6 | `common/ErrorMessage.css` | 10 | 54 | SIMPLE |
| 7 | `common/LoadingIndicator.css` | 10 | 55 | SIMPLE |
| 8 | `DeepDependencies/Header/HopsSelector/Selector.css` | 10 | 92 | SIMPLE |
| 9 | `TracePage/TraceTimelineViewer/SpanDetail/index.css` | 10 | 53 | SIMPLE |
| 10 | `SearchTracePage/SearchResults/ResultItemTitle.css` | 9 | 53 | SIMPLE |

**Total:** 161 colors across 16 files (see JSON for complete list)

### 6. Largest CSS Files

Top 10 by line count:

| # | Component | Lines | Colors | Priority |
|---|-----------|-------|--------|----------|
| 1 | `TracePage/TraceTimelineViewer/grid.css` | 816 | 0 | NONE |
| 2 | `TracePage/TraceTimelineViewer/SpanBarRow.css` | 190 | 34 | HIGH |
| 3 | `TraceDiff/TraceDiffGraph/TraceDiffGraph.css` | 158 | 15 | HIGH |
| 4 | `DependencyGraph/DAGOptions.css` | 151 | 18 | HIGH |
| 5 | `common/utils.css` | 138 | 15 | HIGH |
| 6 | `TracePage/TraceTimelineViewer/SpanBar.css` | 129 | 7 | LOW |
| 7 | `TracePage/TraceGraph/TraceGraph.css` | 111 | 18 | HIGH |
| 8 | `DeepDependencies/Header/index.css` | 102 | 16 | HIGH |
| 9 | `TracePage/TracePageHeader/TracePageHeader.css` | 101 | 13 | MEDIUM |
| 10 | `TraceDiff/TraceDiffHeader/TraceDiffHeader.css` | 98 | 19 | HIGH |

**Note:** `grid.css` is the largest file (816 lines) but has NO colors - likely layout-only.

## Recommended Migration Strategy

### BATCH 1: Foundation (22 files, 99 colors)

**Goal:** Establish foundation and common utilities first

**App/Layout (4 files, 5 colors):**
- `App/TopNav.css` (3 colors) - Visible on every page
- `App/index.css` (2 colors)
- `App/Page.css` (0 colors)
- `App/TraceIDSearchInput.css` (0 colors)

**Common/Utilities - HIGH priority (2 files, 30 colors):**
- `common/NameSelector.css` (15 colors)
- `common/utils.css` (15 colors)

**Common/Utilities - MEDIUM priority (4 files, 41 colors):**
- `common/FilteredList/ListItem.css` (13 colors)
- `common/ErrorMessage.css` (10 colors)
- `common/LoadingIndicator.css` (10 colors)
- `common/VerticalResizer.css` (8 colors)

**Common/Utilities - LOW priority (12 files, 23 colors):**
- All remaining common utilities

**Rationale:**
- App/Layout files are visible on every page
- Common utilities are reused across components
- Establishes token usage patterns for rest of codebase
- Only 99 colors to migrate (19% of total)

### BATCH 2: High-Impact Components (8 files, 158 colors)

**Goal:** Migrate highest color-density files (excluding common utilities already in Batch 1)

1. `TracePage/TraceTimelineViewer/SpanBarRow.css` (34 colors) - Largest single file
2. `DependencyGraph/dag.css` (21 colors)
3. `TraceDiff/TraceDiffHeader/TraceDiffHeader.css` (19 colors)
4. `DependencyGraph/DAGOptions.css` (18 colors)
5. `TracePage/TraceGraph/TraceGraph.css` (18 colors)
6. `TraceDiff/TraceDiffGraph/renderNode.css` (17 colors)
7. `DeepDependencies/Header/index.css` (16 colors)
8. `TraceDiff/TraceDiffGraph/TraceDiffGraph.css` (15 colors)

**Rationale:**
- These 8 files contain 30% of all hardcoded colors
- Combined with Batch 1: 49% of all colors migrated
- High visibility components (TracePage, DependencyGraph)

### BATCH 3: Remaining High + Medium Priority (18 files, 191 colors)

**Goal:** Complete migration of all high/medium priority files

- 2 remaining HIGH priority files (already counted in Batch 2)
- 16 MEDIUM priority files (8-14 colors each)

**Rationale:**
- After Batch 3: 85% of all colors migrated (448/528)
- Remaining 80 colors spread across 59 LOW priority files
- Can be migrated incrementally or as-needed

### BATCH 4: Low Priority (59 files, 179 colors) - OPTIONAL

**Goal:** Complete 100% migration

- 59 files with 1-7 colors each
- Can be done incrementally
- Low impact, low urgency

## Next Steps (Phase 0.4)

1. ✅ Components categorized by priority
2. ✅ Migration batches defined
3. ⏭️ Proceed to Phase 0.4: Finalize token taxonomy based on this categorization

## Data Files

- **Detailed JSON:** `docs/adr/0001/phase-0-3-component-categorization-detailed.json`
- **Audit Script:** `docs/adr/0001/phase-0-3-categorize-components.cjs`

