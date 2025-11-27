# Phase 0.2: CSS Variables Audit Findings

**Generated:** 2025-11-27  
**Status:** ✅ COMPLETE

## Executive Summary

The Jaeger UI codebase currently has **minimal CSS variable usage**:
- **4 CSS variables** defined across 2 files
- **22 total usages** across the codebase
- **100% consistency** - all defined variables are used, no undefined variables referenced
- **2 naming patterns** identified: `--tx-color-*` and `--nav-*`

This is excellent news for our theming implementation - we have a clean slate with minimal existing variables to migrate.

## Detailed Findings

### 1. Existing CSS Variables

#### Color Variables (3 total)

All defined in `packages/jaeger-ui/src/components/common/vars.css`:

| Variable | Value | Usages | Files Using |
|----------|-------|--------|-------------|
| `--tx-color-title` | `rgba(0, 0, 0, 0.85)` | 9 | 7 files |
| `--tx-color-body` | `rgba(0, 0, 0, 0.65)` | 2 | 1 file |
| `--tx-color-muted` | `#aaa` | 7 | 5 files |

**Total color variable usages:** 18 (out of 528 total hardcoded colors = 3.4%)

#### Layout Variables (1 total)

Defined in `packages/jaeger-ui/src/components/common/utils.css`:

| Variable | Value | Usages | Files Using |
|----------|-------|--------|-------------|
| `--nav-height` | `48px` | 4 | 3 files |

### 2. Files with Variable Definitions

Only 2 files define CSS variables:

1. **`packages/jaeger-ui/src/components/common/vars.css`**
   - 3 color variables (`--tx-color-*`)
   - Appears to be the intended location for theme-related variables
   - Good naming convention: `tx` likely means "text"

2. **`packages/jaeger-ui/src/components/common/utils.css`**
   - 1 layout variable (`--nav-height`)
   - Mixed purpose file (utilities + variables)

### 3. Files Using Variables

Variables are used in the following files:

**`--tx-color-title` (9 usages in 7 files):**
- `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanDetail/AccordianKeyValues.css`
- `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanDetail/AccordianLogs.css`
- `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanDetail/AccordianReferences.css`
- `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanDetail/AccordianText.css`
- `packages/jaeger-ui/src/components/TracePage/TraceGraph/OpNode.css`
- `packages/jaeger-ui/src/components/DeepDependencies/Graph/DdgNodeContent/index.css`
- `packages/jaeger-ui/src/components/QualityMetrics/ScoreCard.css`

**`--tx-color-muted` (7 usages in 5 files):**
- `packages/jaeger-ui/src/components/common/utils.css`
- `packages/jaeger-ui/src/components/common/NameSelector.css`
- `packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanDetail/AccordianKeyValues.css`
- `packages/jaeger-ui/src/components/TracePage/TraceGraph/OpNode.css`
- `packages/jaeger-ui/src/components/DeepDependencies/Graph/DdgNodeContent/index.css`

**`--tx-color-body` (2 usages in 1 file):**
- `packages/jaeger-ui/src/components/common/NameSelector.css`

**`--nav-height` (4 usages in 3 files):**
- `packages/jaeger-ui/src/components/App/Page.css`
- `packages/jaeger-ui/src/components/TracePage/index.css`
- `packages/jaeger-ui/src/components/QualityMetrics/index.css`

### 4. Naming Convention Analysis

Two distinct naming patterns exist:

#### Pattern 1: `--tx-color-*` (Text Colors)
- `--tx-color-title` - Primary heading text
- `--tx-color-body` - Body text
- `--tx-color-muted` - Muted/secondary text

**Assessment:**
- ✅ Semantic naming (describes purpose, not value)
- ✅ Consistent prefix (`tx-color-`)
- ✅ Clear hierarchy (title > body > muted)
- ⚠️ Abbreviation `tx` may not be immediately clear (text?)

#### Pattern 2: `--nav-*` (Navigation)
- `--nav-height` - Navigation bar height

**Assessment:**
- ✅ Semantic naming
- ✅ Clear prefix
- ℹ️ Only one variable, hard to assess pattern consistency

### 5. Consistency Analysis

**✅ Excellent consistency:**
- All 4 defined variables are actively used
- No undefined variables are referenced
- No duplicate definitions
- Variables are defined in `:root` selector (global scope)

### 6. Comparison with Hardcoded Colors

From Phase 0.1 audit:
- **528 total hardcoded colors** found
- **18 CSS variable usages** for colors (3.4%)
- **96.6% of colors are still hardcoded**

This confirms that CSS variables are barely used in the current codebase.

## Recommendations

### 1. Keep Existing Variables

**Decision: KEEP and MIGRATE to new naming convention**

The existing variables should be:
1. Kept as aliases during migration
2. Gradually migrated to new token naming system
3. Eventually deprecated in favor of new tokens

### 2. Proposed Migration Path

**Existing → New Token Mapping:**

| Current Variable | New Token | Rationale |
|------------------|-----------|-----------|
| `--tx-color-title` | `--text-primary` | Clearer, matches industry standard |
| `--tx-color-body` | `--text-secondary` | More semantic |
| `--tx-color-muted` | `--text-muted` | Keep "muted", drop `tx-color` prefix |
| `--nav-height` | `--nav-height` | Keep as-is (layout, not theme) |

**Migration strategy:**
```css
/* Phase 1: Add new tokens alongside old ones */
:root {
  /* New tokens */
  --text-primary: rgba(0, 0, 0, 0.85);
  --text-secondary: rgba(0, 0, 0, 0.65);
  --text-muted: #aaa;
  
  /* Old tokens (aliases for backward compatibility) */
  --tx-color-title: var(--text-primary);
  --tx-color-body: var(--text-secondary);
  --tx-color-muted: var(--text-muted);
}

/* Phase 2: Gradually replace old usages with new tokens */
/* Phase 3: Remove old token aliases */
```

### 3. Consolidate Variable Definitions

**Current:** Variables split across 2 files  
**Proposed:** Consolidate into single `color-variables.css` file

Move all color variables from `vars.css` and `utils.css` into the new centralized file created in Phase 1.

### 4. Expand Variable Usage

Current 3.4% coverage should expand to ~100% through Phase 1 migration.

## Next Steps (Phase 0.3)

1. ✅ Existing variables documented
2. ✅ Naming patterns analyzed
3. ✅ Migration strategy defined
4. ⏭️ Proceed to Phase 0.3: Component Categorization

## Data Files

- **Detailed JSON:** `docs/adr/0001/phase-0-2-css-variables-detailed.json`
- **Audit Script:** `docs/adr/0001/phase-0-2-audit-css-variables.cjs`

