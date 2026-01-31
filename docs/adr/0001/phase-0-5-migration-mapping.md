# Phase 0.5: Migration Mapping

**Purpose:** This document provides a lookup table for developers to map existing hardcoded colors and CSS variables to the new design tokens during Phase 1 (Centralize Colors).

> **⚠️ NOTE:** This mapping is derived from the Phase 0.1 Color Audit and Phase 0.4 Color Consolidation Analysis.

## 1. Grayscale & Surfaces

| Old Value (Hex/RGB/Named) | New Token | Context |
|---------------------------|-----------|---------|
| `#ffffff`, `#fff`, `white` | `var(--surface-primary)` | Main background, Cards, Modals |
| `#fafafa` | `var(--surface-secondary)` | Secondary backgrounds, Table headers |
| `#f5f5f5`, `#f8f8f8`, `#f6f6f6` | `var(--surface-tertiary)` | Tertiary backgrounds, Hover states |
| `#e8e8e8`, `#e6e6e6`, `#e4e4e4` | `var(--border-default)` | Default borders |
| `#f0f0f0` | `var(--border-subtle)` | Subtle dividers |
| `#cccccc` | `var(--border-emphasis)` | Emphasized borders, Input borders |

## 2. Text & Content

| Old Value | New Token | Context |
|-----------|-----------|---------|
| `#000000`, `black` | `var(--text-primary)` | Primary text |
| `rgba(0, 0, 0, 0.85)` | `var(--text-primary)` | Primary text (Ant Design default) |
| `#444444`, `#555555`, `#666666` | `var(--text-secondary)` | Secondary text |
| `rgba(0, 0, 0, 0.65)` | `var(--text-secondary)` | Secondary text (Ant Design default) |
| `#999999`, `#aaaaaa` | `var(--text-muted)` | Muted text, Placeholders |
| `#bbbbbb` | `var(--text-disabled)` | Disabled text |

## 3. Brand & Interactive

| Old Value | New Token | Context |
|-----------|-----------|---------|
| `#119999`, `#11939a`, `teal` | `var(--color-primary)` | Primary brand color, Links, Buttons |
| `#0d7a7a` | `var(--color-primary-hover)` | Primary color hover state |
| `rgba(17, 153, 153, 0.1)` | `var(--color-primary-alpha)` | Subtle primary backgrounds |

## 4. Semantic Colors

| Old Value | New Token | Context |
|-----------|-----------|---------|
| `#cc0000` | `var(--color-error)` | Error text, Error borders |
| `#fff1f0` | `var(--color-error-bg)` | Error backgrounds |
| `#fff3d7`, `#fff566` | `var(--color-highlight)` | Selection, Warning backgrounds |
| `#fffb8f` | `var(--color-highlight-strong)` | Strong emphasis |

## 5. Shadows

| Old Value | New Token | Context |
|-----------|-----------|---------|
| `rgba(0, 0, 0, 0.1)` | `var(--shadow-sm)` | Small shadow, Cards |
| `rgba(0, 0, 0, 0.15)` | `var(--shadow-md)` | Medium shadow, Dropdowns |
| `rgba(0, 0, 0, 0.2)`, `rgba(0, 0, 0, 0.3)` | `var(--shadow-lg)` | Large shadow, Modals |

## 6. Existing CSS Variables Migration

| Old Variable | New Token | Action |
|--------------|-----------|--------|
| `--tx-color-title` | `var(--text-primary)` | Replace and remove old var |
| `--tx-color-body` | `var(--text-secondary)` | Replace and remove old var |
| `--tx-color-muted` | `var(--text-muted)` | Replace and remove old var |
| `--nav-height` | N/A | Keep as is (Layout token) |

## Migration Checklist for Developers

When migrating a component:

1.  **Identify** the hardcoded color or old variable.
2.  **Lookup** the corresponding token in the tables above.
3.  **Replace** the value with `var(--token-name)`.
4.  **Verify** visually that the appearance hasn't changed.
5.  **Commit** with message: `refactor(Component): migrate colors to design tokens`
