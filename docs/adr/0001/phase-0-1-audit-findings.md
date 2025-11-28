# Phase 0.1: Color Audit Findings

**Generated:** 2025-11-27  
**Status:** ✅ Complete

## Executive Summary

The comprehensive color audit has been completed on the Jaeger UI codebase. Here are the key findings:

### Statistics

- **Total hardcoded colors found:** 528
- **Unique color values:** 150
- **CSS files scanned:** 103
- **Files with hardcoded colors:** 85 (82.5%)
- **CSS properties affected:** 21

### Key Insights

1. **High color fragmentation:** 150 unique colors for a UI is excessive and indicates lack of design system
2. **Grayscale dominance:** Most used colors are grays/whites (#ddd, #999, #fff, #bbb, #ccc, #f5f5f5, #fafafa, #e8e8e8)
3. **Inconsistent grays:** Multiple similar grays used (#ddd, #ccc, #bbb, #aaa, #999, #888, #777) - clear consolidation opportunity
4. **Background colors:** Most common use case (124 occurrences) - primarily light grays for surfaces
5. **Text colors:** Second most common (102 occurrences) - mostly dark grays and blacks
6. **Shadow patterns:** Consistent use of `rgba(0, 0, 0, 0.1)` and `rgba(0, 0, 0, 0.3)` for shadows

## Top 10 Most Used Colors

| Rank | Color | Occurrences | Primary Use |
|------|-------|-------------|-------------|
| 1 | `white` | 40 | white-space property (25), text color (9), backgrounds (6) |
| 2 | `#dddddd` | 31 | borders (16), backgrounds (7), outlines (4) |
| 3 | `#999999` | 22 | text color (13), borders (6) |
| 4 | `#ffffff` | 18 | backgrounds (12), text color (5) |
| 5 | `#bbbbbb` | 16 | text color (5), borders (7) |
| 6 | `#cccccc` | 15 | backgrounds (4), borders (9) |
| 7 | `#f5f5f5` | 15 | backgrounds (15) |
| 8 | `#fafafa` | 15 | backgrounds (15) |
| 9 | `#e8e8e8` | 12 | borders (8), backgrounds (3) |
| 10 | `#000000` | 12 | text color (9), border-color (2) |

## Color Usage by Property

### Background Colors (124 uses, 62 unique colors)
- `#fafafa` (11x) - Very light gray
- `#f5f5f5` (9x) - Very light gray
- `#dddddd` (7x) - Light gray
- `#ffffff` (7x) - White
- `#eeeeee` (5x) - Very light gray

**Pattern:** Multiple very similar light grays used for surface backgrounds. These should consolidate to 2-3 surface levels.

### Text Colors (102 uses, 41 unique colors)
- `#999999` (13x) - Medium gray (muted text)
- `white` (9x) - White text
- `#000000` (9x) - Black text
- `#cc0000` (5x) - Red (errors)
- `#bbbbbb` (5x) - Light gray (disabled/muted)

**Pattern:** Clear hierarchy: primary text (black), secondary text (dark gray), muted text (medium gray), disabled (light gray).

### Borders (45 uses, 26 unique colors)
- `#e6e6e6` (6x)
- `#999999` (5x)
- `#cccccc` (3x)
- `#bbbbbb` (3x)
- `#dddddd` (3x)

**Pattern:** Too many similar border grays. Should consolidate to 2-3 border colors (default, subtle, emphasis).

### Shadows (30 uses, 9 unique colors)
- `rgba(0, 0, 0, 0.1)` (10x) - Light shadow
- `rgba(0, 0, 0, 0.3)` (8x) - Medium shadow
- `rgba(0, 0, 0, 0.2)` (4x) - Medium-light shadow
- `rgba(0, 0, 0, 0.15)` (3x) - Light-medium shadow

**Pattern:** Good consistency with black-based shadows. Can consolidate to 2-3 elevation levels.

## Files Requiring Most Attention

### High Priority (>15 hardcoded colors)
1. `TracePage/TraceTimelineViewer/SpanBarRow.css` - 34 colors
2. `DependencyGraph/dag.css` - 21 colors
3. `TraceDiff/TraceDiffHeader/TraceDiffHeader.css` - 19 colors
4. `DependencyGraph/DAGOptions.css` - 18 colors
5. `TracePage/TraceGraph/TraceGraph.css` - 18 colors
6. `TraceDiff/TraceDiffGraph/renderNode.css` - 17 colors
7. `DeepDependencies/Header/index.css` - 16 colors

### Medium Priority (10-15 hardcoded colors)
8. `common/NameSelector.css` - 15 colors
9. `common/utils.css` - 15 colors
10. `TraceDiff/TraceDiffGraph/TraceDiffGraph.css` - 15 colors
11. `DeepDependencies/Graph/getNodeRenderers.css` - 14 colors
12. `common/FilteredList/ListItem.css` - 13 colors
13. `TracePage/TracePageHeader/TracePageHeader.css` - 13 colors
14. `SearchTracePage/SearchForm.css` - 12 colors
15. `DeepDependencies/SidePanel/DetailsPanel.css` - 11 colors
16. `common/ErrorMessage.css` - 10 colors
17. `common/LoadingIndicator.css` - 10 colors

## Special Colors (Functional, Not Themeable)

These colors appear to be functional/data visualization and should likely NOT be themeable:

- `#eb2f96` - Pink (8 occurrences) - appears in graph nodes
- `#fffb8f` - Yellow (9 occurrences) - appears in graph gradients
- `#119999` - Teal (7 occurrences) - brand/accent color
- `teal` - Named color (5 occurrences) - loading indicators, brand
- `#cc0000` - Red (6 occurrences) - errors/warnings

## Next Steps

See Phase 0.2-0.5 in the implementation plan:
- 0.2: Analyze existing CSS variables
- 0.3: Component categorization
- 0.4: Derive token taxonomy from this data
- 0.5: Create migration mapping

