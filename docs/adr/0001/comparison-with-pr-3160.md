# Comparison: PR #3160 vs. Design Token Approach

This document compares the theming approach in PR #3160 with the recommended design token-based approach.

## Quick Summary

| Aspect | PR #3160 Approach | Design Token Approach |
|--------|-------------------|----------------------|
| **Files to modify for new theme** | ~73 component files | 1 token definition file |
| **Code duplication** | High (2-3 CSS blocks per component) | Minimal (tokens defined once) |
| **Maintenance burden** | High | Low |
| **Risk of inconsistency** | High | Low |
| **Learning curve** | Low | Medium |
| **Scalability** | Poor | Excellent |
| **Single source of truth** | No | Yes |

## Detailed Comparison

### Example: Styling a Search Form

#### PR #3160 Approach

```css
/* SearchForm.css - 140+ lines of theme-specific code */

.SearchForm .ant-input {
  background-color: rgba(255, 255, 255, 0.92) !important;
  border-color: rgba(9, 28, 55, 0.25) !important;
  color: var(--tx-color-body) !important;
  box-shadow: 0 6px 16px rgba(7, 19, 38, 0.08);
}

body[data-theme='dark'] .SearchForm .ant-input {
  background-color: rgba(8, 16, 32, 0.9) !important;
  border-color: rgba(125, 153, 191, 0.4) !important;
  color: rgba(244, 248, 255, 0.92) !important;
  box-shadow: 0 10px 26px rgba(3, 10, 20, 0.55);
}

.SearchForm .ant-input::placeholder {
  color: rgba(13, 30, 54, 0.52);
}

body[data-theme='dark'] .SearchForm .ant-input::placeholder {
  color: rgba(244, 248, 255, 0.65);
}

.SearchForm .ant-input:focus {
  border-color: #0b7ad1 !important;
  box-shadow: 0 0 0 2px rgba(11, 122, 209, 0.28) !important;
}

body[data-theme='dark'] .SearchForm .ant-input:focus {
  box-shadow: 0 0 0 2px rgba(123, 220, 255, 0.35) !important;
}

/* ... and 100+ more lines of similar code */
```

**Problems:**
- ❌ Magic values scattered everywhere (`rgba(8, 16, 32, 0.9)`)
- ❌ Duplication of theme logic in every component
- ❌ Easy to forget dark mode styles
- ❌ Hard to maintain consistency
- ❌ Adding a third theme requires touching this file again

#### Design Token Approach

```css
/* theme-tokens.css - Define once */
:root {
  --input-bg: rgba(255, 255, 255, 0.92);
  --input-border: rgba(9, 28, 55, 0.25);
  --input-text: rgba(13, 30, 54, 0.9);
  --input-placeholder: rgba(13, 30, 54, 0.52);
  --input-shadow: 0 6px 16px rgba(7, 19, 38, 0.08);
  --input-focus-border: #0b7ad1;
  --input-focus-shadow: 0 0 0 2px rgba(11, 122, 209, 0.28);
}

body[data-theme='dark'] {
  --input-bg: rgba(8, 16, 32, 0.9);
  --input-border: rgba(125, 153, 191, 0.4);
  --input-text: rgba(244, 248, 255, 0.92);
  --input-placeholder: rgba(244, 248, 255, 0.65);
  --input-shadow: 0 10px 26px rgba(3, 10, 20, 0.55);
  --input-focus-shadow: 0 0 0 2px rgba(123, 220, 255, 0.35);
}

/* SearchForm.css - Use tokens */
.SearchForm .ant-input {
  background-color: var(--input-bg);
  border-color: var(--input-border);
  color: var(--input-text);
  box-shadow: var(--input-shadow);
}

.SearchForm .ant-input::placeholder {
  color: var(--input-placeholder);
}

.SearchForm .ant-input:focus {
  border-color: var(--input-focus-border);
  box-shadow: var(--input-focus-shadow);
}

/* No theme-specific selectors needed! */
```

**Benefits:**
- ✅ Semantic token names
- ✅ Single source of truth
- ✅ Component doesn't know about themes
- ✅ Adding a third theme only requires updating tokens
- ✅ Consistent values across all inputs

## Impact Analysis

### PR #3160 Statistics

From the actual PR:
- **73 files changed**
- **2,221 additions**
- **304 deletions**
- **Net: +1,917 lines of code**

Most additions are theme-specific CSS selectors like:
```css
body[data-theme='dark'] .Component { ... }
```

### Design Token Approach (Estimated)

- **~15 files changed**
  - 1 token definition file
  - 1 ThemeProvider component
  - 1 ThemeToggleButton component
  - ~10 core component migrations
  - 2 documentation files
- **~800 additions**
  - 400 lines for token definitions
  - 200 lines for React components
  - 200 lines for component updates
- **~100 deletions** (removing hardcoded colors)
- **Net: +700 lines of code**

**Savings: ~1,200 lines of code**

## Maintenance Scenarios

### Scenario 1: Adding a New Component

#### PR #3160 Approach
```css
/* NewComponent.css */
.NewComponent {
  background: #ffffff;
  color: #000000;
}

/* Developer must remember to add dark mode! */
body[data-theme='dark'] .NewComponent {
  background: #1a1a1a;
  color: #ffffff;
}
```

**Risk:** Developer forgets dark mode → component broken in dark theme

#### Design Token Approach
```css
/* NewComponent.css */
.NewComponent {
  background: var(--surface-primary);
  color: var(--text-primary);
}
```

**Risk:** None - automatically works in all themes

### Scenario 2: Adding a Third Theme (e.g., High Contrast)

#### PR #3160 Approach
- Touch all 73 component files
- Add `body[data-theme='high-contrast'] .Component { ... }` to each
- Estimated effort: **2-3 weeks**

#### Design Token Approach
- Add one new section to `theme-tokens.css`:
```css
body[data-theme='high-contrast'] {
  --surface-primary: #000000;
  --text-primary: #ffffff;
  /* ... other tokens */
}
```
- Estimated effort: **1-2 days**

### Scenario 3: Changing a Color Across the App

#### PR #3160 Approach
- Search for all instances of the color value
- Update in multiple files
- Risk of missing some instances
- Estimated effort: **Several hours, error-prone**

#### Design Token Approach
- Update one token value
- All components automatically update
- Estimated effort: **5 minutes**

## Migration Path

### From PR #3160 to Design Tokens

If PR #3160 is already merged, here's how to migrate:

1. **Create token definitions** from existing theme values
2. **Replace component selectors** one by one:
   ```css
   /* Before */
   body[data-theme='dark'] .Component {
     background: rgba(8, 16, 32, 0.9);
   }
   
   /* After */
   .Component {
     background: var(--surface-primary);
   }
   ```
3. **Remove theme-specific selectors** as components are migrated
4. **Estimated effort:** 4-6 weeks (can be done incrementally)

## Recommendation

**Use the Design Token approach** for these reasons:

1. **Scalability**: Easy to add unlimited themes
2. **Maintainability**: Single source of truth
3. **Developer Experience**: Components don't think about themes
4. **Code Quality**: Less duplication, more semantic
5. **Future-Proof**: Industry best practice

The initial investment is similar, but long-term benefits are substantial.

## References

- [ADR-0001: Design Token-Based Theming Architecture](../adr/0001-design-token-based-theming.md)
- [PR #3160: Dark mode for Jaeger UI](https://github.com/jaegertracing/jaeger-ui/pull/3160)
- [Design Tokens Community Group](https://design-tokens.github.io/community-group/)

