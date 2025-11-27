# Theming System

Jaeger UI uses a **design token-based theming system** built on CSS custom properties (variables).

## Documentation Index

- **[Approach Clarification](./APPROACH-CLARIFICATION.md)** - ⭐ START HERE - Theory vs. Reality
- **[Executive Summary](./EXECUTIVE-SUMMARY.md)** - High-level overview for decision makers
- **[ADR-0001: Design Token-Based Theming](../0001-design-token-based-theming.md)** - Full architectural decision record
- **[Comparison with PR #3160](./comparison-with-pr-3160.md)** - Detailed comparison of approaches
- **[Implementation Checklist](./implementation-checklist.md)** - Step-by-step implementation tracking
- **[Phase 0.1 Audit Findings](./phase-0-audit-findings.md)** - ✅ Color audit results (528 colors found)
- **[Color Consolidation Analysis](./color-consolidation-analysis.md)** - ✅ Data-driven token taxonomy
- **[Phase 0.2 CSS Variables Findings](./phase-0-2-css-variables-findings.md)** - ✅ CSS variables analysis (4 variables found)
- **This document** - Developer quick reference guide

## ⚠️ IMPORTANT: Reality-First Approach

This theming system is **NOT** based on generic best practices or made-up examples.

**The correct implementation process is:**

1. **Phase 0:** Audit the ACTUAL codebase (✅ 0.1 & 0.2 COMPLETE)
   - ✅ Run `docs/adr/0001/phase-0-audit-colors.cjs` to find all hardcoded colors
   - ✅ Run `docs/adr/0001/phase-0-2-audit-css-variables.cjs` to analyze existing CSS variables
   - ⏳ Categorize components by complexity
   - ✅ **Derive token taxonomy from REAL usage patterns**
   - ⏳ Create migration mapping from audit data

2. **Phase 1:** Centralize colors using audit findings
   - Create `color-variables.css` with ACTUAL values from audit
   - Migrate components incrementally
   - No visual changes - pure refactoring

3. **Phase 2:** Add dark theme
   - Design dark palette based on light theme
   - Add `body[data-theme='dark']` overrides
   - Build ThemeProvider component

**DO NOT skip Phase 0!** See [Approach Clarification](./APPROACH-CLARIFICATION.md) for why this matters.

## Quick Start

### For Users

Toggle between light and dark mode using the theme switcher button in the top navigation bar. Your preference is automatically saved.

### For Developers

**Always use design tokens, never hardcoded colors:**

```css
/* ✅ GOOD */
.MyComponent {
  background: var(--surface-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-md);
}

/* ❌ BAD */
.MyComponent {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cccccc;
}

/* ❌ NEVER use theme-specific selectors in components */
body[data-theme='dark'] .MyComponent {
  background: #1a1a1a;
}
```

## Architecture

Our theming system follows these principles:

1. **Single Source of Truth**: All theme values defined in `packages/jaeger-ui/src/styles/theme-tokens.css`
2. **Semantic Tokens**: Variables describe purpose (`--text-primary`), not appearance (`--color-black`)
3. **Component Ignorance**: Components reference tokens, never know about themes
4. **Automatic Switching**: CSS cascade handles theme changes via `body[data-theme]` attribute

### How It Works

```
User clicks toggle
       ↓
React updates state
       ↓
document.body.dataset.theme = 'dark'
       ↓
CSS variables update automatically
       ↓
All components re-render with new colors
```

## Available Tokens

### Surfaces (Backgrounds)

- `--surface-primary` - Main background (white/dark)
- `--surface-secondary` - Secondary background (light gray/darker)
- `--surface-tertiary` - Tertiary background
- `--surface-overlay` - Modal/overlay backgrounds

### Text

- `--text-primary` - Main content text
- `--text-secondary` - Supporting text
- `--text-tertiary` - Hints, placeholders
- `--text-disabled` - Disabled state text
- `--text-inverse` - Text on dark backgrounds (light mode) or light backgrounds (dark mode)

### Borders

- `--border-default` - Standard borders
- `--border-subtle` - Subtle dividers
- `--border-strong` - Emphasized borders

### Interactive Elements

- `--interactive-primary` - Primary actions (buttons, links)
- `--interactive-primary-hover` - Primary hover state
- `--interactive-primary-active` - Primary active state
- `--interactive-secondary` - Secondary actions
- `--interactive-secondary-hover` - Secondary hover state

### Feedback

- `--feedback-error` - Error states
- `--feedback-warning` - Warning states
- `--feedback-success` - Success states
- `--feedback-info` - Info states

### Shadows

- `--shadow-xs` through `--shadow-2xl` - Elevation shadows

### Gradients

- `--gradient-nav` - Navigation bar gradient
- `--gradient-page` - Page background gradient
- `--gradient-card` - Card background gradient

### Spacing & Borders

- `--spacing-{xs|sm|md|lg|xl}` - Consistent spacing
- `--radius-{sm|md|lg|xl|full}` - Border radius values

## Common Patterns

### Decision Tree for Choosing Tokens

1. **Background?** → Use `--surface-*`
2. **Text?** → Use `--text-*`
3. **Border?** → Use `--border-*`
4. **Interactive?** → Use `--interactive-*`
5. **Feedback?** → Use `--feedback-*`
6. **Shadow?** → Use `--shadow-*`

### Example Migrations

**Before:**
```css
.Card {
  background: #fff;
  border: 1px solid #e0e0e0;
  color: rgba(0, 0, 0, 0.87);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

body[data-theme='dark'] .Card {
  background: #1e1e1e;
  border-color: #333;
  color: rgba(255, 255, 255, 0.9);
}
```

**After:**
```css
.Card {
  background: var(--surface-primary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}
```

## Adding New Tokens

If you need a color/value that doesn't exist:

1. **Check if existing token can be reused** - Don't create duplicates
2. **Choose a semantic name** - Describe purpose, not appearance
3. **Add to `theme-tokens.css`** - Define for both light and dark themes
4. **Document here** - Update this README
5. **Test in both themes** - Ensure it looks good in light and dark

## Testing

```bash
# Start dev server
npm start

# Toggle theme using UI button
# Verify your changes in both modes

# Run visual regression tests
npm run test:visual
```

## Resources

- [ADR-0001: Design Token-Based Theming Architecture](../0001-design-token-based-theming.md) - Full architectural decision
- [Phase 0.1 Audit Findings](./phase-0-audit-findings.md) - Color audit results
- [Color Consolidation Analysis](./color-consolidation-analysis.md) - Data-driven token taxonomy
- [Phase 0.2 CSS Variables Findings](./phase-0-2-css-variables-findings.md) - CSS variables analysis
- [Migration Mapping](./migration-mapping.md) - Mapping old colors to new tokens (⏳ Phase 0.5 - pending)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

## Questions?

See the [full ADR](../0001-design-token-based-theming.md) for detailed implementation plan and rationale.

