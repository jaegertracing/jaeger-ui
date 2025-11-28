# ADR 0001: Design Token-Based Theming Architecture

**Status**: Proposed
**Last Updated**: [Date]
**Next Review**: [Date]

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

## Implementation Plan

See [IMPLEMENTATION-PLAN.md](./0001/IMPLEMENTATION-PLAN.md).

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

## References

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Design Tokens (W3C Community Group)](https://design-tokens.github.io/community-group/format/)
- [Ant Design Theming](https://ant.design/docs/react/customize-theme)
- [Material Design Color System](https://m3.material.io/styles/color/system/overview)

---
