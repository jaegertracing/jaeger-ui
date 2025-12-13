# ADR 0001: Design Token-Based Theming Architecture

**Status**: Proposed
**Last Updated**: 2025-11-28
**Next Review**: [Date]

---

## TL;DR

We recommend implementing dark mode and future theme support using a design token-based architecture (CSS custom properties) instead of the component-level selector approach (PR #3160). This approach centralizes theme values, reduces duplication, and makes adding new themes fast and low-risk.

## Context & Problem

Jaeger UI currently has no centralized theming support. Users have requested dark mode and the ability to customize the UI appearance. An earlier proposal (PR #3160) implements dark mode via component-level selectors, but that approach:

- Requires modifying ~73 files
- Adds ~1,917 lines of code
- Creates ongoing maintenance burden and duplication

We need a theming system that:

- Supports light and dark modes (and additional themes)
- Is maintainable and scalable
- Minimizes code duplication
- Makes it easy to add new themes in the future
- Works with our existing Ant Design component library
- Avoids touching every component when adding a new theme

### Current State

- Hardcoded colors throughout the codebase (e.g., `#11939a`, `rgba(0, 0, 0, 0.85)`)
- No centralized color management
- Mix of inline styles, CSS files, and Ant Design theme configuration
- ~73+ component CSS files that would need theme-aware styles under the component-selector approach

## Alternatives Considered

1. Component-level theme selectors (PR #3160)
   - Uses `body[data-theme='light']` selectors in many components
   - Requires duplicating CSS per theme for each component
   - Easy to omit theme styles for new components
   - High maintenance cost

2. CSS-in-JS theme objects
   - Would need large refactor of existing CSS/Modules
   - Potential runtime performance implications
   - Harder to apply consistently across existing CSS

3. Design token-based approach (RECOMMENDED)
   - Single source of truth for theme values
   - Components use semantic tokens (CSS variables)
   - Switching themes updates token values only
   - Scales to unlimited themes

## Decision

Adopt a design token-based theming system implemented with CSS custom properties and a lightweight React theme provider. This minimizes migration surface area while offering a future-proof theming model.

### Core Principles

1. Semantic tokens over hardcoded values: Colors, spacing, shadows, etc. are accessed via tokens.
2. Single source of truth: Token definitions live centrally (e.g., `vars.css` / token JSON files).
3. Component/theme decoupling: Components read tokens and do not include theme logic.
4. Progressive enhancement: Migrate incrementally; no large breaking change.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Theme Definition Layer (vars.css)                           │
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

## Solution (example)

Define tokens once and override them for alternate themes:

```css
:root {
  --surface-primary: #ffffff;
  --text-primary: rgba(13, 30, 54, 0.9);
}

body[data-theme='dark'] {
  --surface-primary: rgba(12, 20, 36, 0.95);
  --text-primary: rgba(244, 248, 255, 0.92);
}

.SearchForm {
  background: var(--surface-primary);
  color: var(--text-primary);
}
```

## Key Benefits & Metrics

- Files to modify for new theme: 73 (component-selectors) → 1 (tokens)
- Estimated code delta: PR #3160 (~+1,917 LOC) → token approach (~+700 LOC)
- Time to add 3rd theme: 2-3 weeks → 1-2 days
- Maintenance burden: High → Low

These estimates imply large reductions in duplication, faster delivery, and lower long-term cost.

## Risks & Mitigation

- Breaking existing styles: Mitigate via incremental migration and visual regression tests
- Team learning curve: Provide documentation, a developer guide, and training
- Timeline slippage: Prioritize high-traffic pages first
- Browser compatibility: CSS variables are supported in modern browsers; IE11 is EOL

## Comparison with PR #3160

If PR #3160 is not merged: implement tokens from scratch — similar initial effort, better long-term outcome.

If PR #3160 is already merged: migrate incrementally to tokens; expect ~4-6 weeks additional work to refactor.

## Implementation Plan

See [IMPLEMENTATION-PLAN.md](./0001/IMPLEMENTATION-PLAN.md).

## Success Metrics

- 100% of components use design tokens
- 0 hardcoded colors in codebase
- Theme switching works without visual regressions
- Positive user feedback (>80% satisfaction)
- Team adoption for new components

## Decision Points

### Go/No-Go
Recommend: GO with design token approach.

### Alternative: Hybrid
If timeline is critical, consider merging PR #3160 for immediate dark mode and refactor to tokens next quarter. Trade-off: faster delivery vs technical debt.

## Next Steps

1. Review proposal with engineering leadership
2. Get stakeholder buy-in on timeline/resources
3. Assign team members and kick off Phase 1 (foundation)
4. Weekly check-ins to track progress

## Questions / References

- Technical details: `docs/adr/0001-design-token-based-theming.md`
- Developer guide: `docs/adr/0001/IMPLEMENTATION-PLAN.md`
- Comparison: `docs/adr/0001/comparison-with-pr-3160.md`

---
