# Color Consolidation Analysis

**Based on:** Phase 0.1 Color Audit  
**Purpose:** Identify which colors can be consolidated into design tokens

## Grayscale Consolidation Opportunities

### Current State: 20+ Similar Grays

The audit found excessive gray color fragmentation. Here's how they can be consolidated:

#### Very Light Grays (Backgrounds/Surfaces)
**Current:** 7 different colors with 71 total uses
- `#ffffff` (18) - Pure white
- `#fafafa` (15) - Off-white
- `#f8f8f8` (6) - Very light gray
- `#f6f6f6` (3) - Very light gray
- `#f5f5f5` (15) - Very light gray
- `#f0f0f0` (8) - Light gray
- `#eeeeee` (9) - Light gray

**Proposed Tokens:**
```css
--surface-primary: #ffffff;      /* Pure white - main backgrounds */
--surface-secondary: #fafafa;    /* Off-white - secondary surfaces */
--surface-tertiary: #f5f5f5;     /* Light gray - tertiary surfaces */
```

**Consolidation:** 7 colors → 3 tokens (71 uses)

---

#### Light Grays (Borders/Dividers)
**Current:** 6 different colors with 64 total uses
- `#e8e8e8` (12) - Light gray
- `#e6e6e6` (8) - Light gray
- `#e4e4e4` (7) - Light gray
- `#dddddd` (31) - Light gray
- `#d8d8d8` (6) - Light gray

**Proposed Tokens:**
```css
--border-default: #e8e8e8;       /* Default borders */
--border-subtle: #f0f0f0;        /* Subtle dividers */
```

**Consolidation:** 6 colors → 2 tokens (64 uses)

---

#### Medium Grays (Borders/Muted Text)
**Current:** 5 different colors with 64 total uses
- `#cccccc` (15) - Medium-light gray
- `#bbbbbb` (16) - Medium-light gray
- `#aaaaaa` (7) - Medium gray
- `#999999` (22) - Medium gray
- `#888888` (6) - Medium-dark gray

**Proposed Tokens:**
```css
--border-emphasis: #cccccc;      /* Emphasized borders */
--text-muted: #999999;           /* Muted/secondary text */
--text-disabled: #bbbbbb;        /* Disabled text */
```

**Consolidation:** 5 colors → 3 tokens (64 uses)

---

#### Dark Grays (Text)
**Current:** 4 different colors with 23 total uses
- `#777777` (5) - Dark gray
- `#666666` (2) - Dark gray
- `#555555` (2) - Dark gray
- `#444444` (6) - Very dark gray
- `#000000` (12) - Black

**Proposed Tokens:**
```css
--text-primary: #000000;         /* Primary text - black */
--text-secondary: #444444;       /* Secondary text - dark gray */
```

**Consolidation:** 5 colors → 2 tokens (27 uses)

---

## Shadow Consolidation

### Current State: 4 Similar Black Shadows

**Current:** 4 different rgba values with 30 total uses
- `rgba(0, 0, 0, 0.1)` (10) - Light shadow
- `rgba(0, 0, 0, 0.15)` (5) - Light-medium shadow
- `rgba(0, 0, 0, 0.2)` (7) - Medium shadow
- `rgba(0, 0, 0, 0.3)` (11) - Strong shadow

**Proposed Tokens:**
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);      /* Subtle elevation */
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.15);     /* Medium elevation */
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.2);      /* High elevation */
```

**Consolidation:** 4 colors → 3 shadow tokens (30 uses)

---

## Accent/Brand Colors

### Teal/Cyan (Brand Color)
**Current:** Multiple teal variations
- `#119999` (7) - Dark teal
- `teal` (5) - Named teal
- `rgba(0, 128, 128, 0.6)` (4) - Teal with opacity
- `#11939a` (1) - Teal variant

**Proposed Tokens:**
```css
--color-primary: #119999;                    /* Primary brand color */
--color-primary-hover: #0d7a7a;             /* Hover state */
--color-primary-alpha: rgba(17, 153, 153, 0.1);  /* Subtle backgrounds */
```

**Consolidation:** 4 colors → 3 tokens (17 uses)

---

## Semantic Colors

### Error/Warning Colors
**Current:**
- `#cc0000` (6) - Red for errors
- `#eb2f96` (8) - Pink (appears to be for graph nodes, not errors)

**Proposed Tokens:**
```css
--color-error: #cc0000;          /* Error text/borders */
--color-error-bg: #fff1f0;       /* Error backgrounds */
```

### Highlight/Selection Colors
**Current:**
- `#fff3d7` (6) - Yellow highlight
- `#fffb8f` (9) - Bright yellow (graph gradients)
- `#fff566` (2) - Yellow

**Proposed Tokens:**
```css
--color-highlight: #fff3d7;      /* Selection/emphasis */
--color-highlight-strong: #fffb8f;  /* Strong emphasis */
```

---

## Summary

### Consolidation Impact

| Category | Current Colors | Proposed Tokens | Uses Affected | Reduction |
|----------|---------------|-----------------|---------------|-----------|
| Surface backgrounds | 7 | 3 | 71 | 57% |
| Borders | 6 | 2 | 64 | 67% |
| Medium grays | 5 | 3 | 64 | 40% |
| Dark grays/text | 5 | 2 | 27 | 60% |
| Shadows | 4 | 3 | 30 | 25% |
| Brand/accent | 4 | 3 | 17 | 25% |
| **TOTAL** | **31** | **16** | **273** | **48%** |

### Key Findings

1. **48% of color uses** (273 out of 528) can be consolidated by addressing just grayscale colors
2. **Remaining 255 uses** include:
   - Functional colors (data visualization, graphs)
   - Component-specific colors
   - Special states (hover, active, disabled)

3. **Next Phase:** Analyze the remaining 255 color uses to determine:
   - Which are functional/data colors (should NOT be themeable)
   - Which need additional semantic tokens
   - Which are one-offs that can be consolidated

---

## Recommended Token Structure (Initial)

Based on this analysis, here's the initial token structure:

```css
:root {
  /* Surfaces */
  --surface-primary: #ffffff;
  --surface-secondary: #fafafa;
  --surface-tertiary: #f5f5f5;
  
  /* Text */
  --text-primary: #000000;
  --text-secondary: #444444;
  --text-muted: #999999;
  --text-disabled: #bbbbbb;
  
  /* Borders */
  --border-default: #e8e8e8;
  --border-subtle: #f0f0f0;
  --border-emphasis: #cccccc;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.2);
  
  /* Brand */
  --color-primary: #119999;
  --color-primary-hover: #0d7a7a;
  --color-primary-alpha: rgba(17, 153, 153, 0.1);
  
  /* Semantic */
  --color-error: #cc0000;
  --color-error-bg: #fff1f0;
  --color-highlight: #fff3d7;
  --color-highlight-strong: #fffb8f;
}
```

This covers **52% of all color uses** with just 20 tokens!

