# ADR 0001: Design Token-Based Theming Architecture

**Status**: Implemented
**Last Updated**: 2026-04-01

---

## TL;DR

Dark mode and future theme support are implemented using a design token-based architecture (CSS custom properties) rather than component-level theme selectors. This centralizes theme values, eliminates duplication, and makes adding new themes fast and low-risk.

## Context & Problem

Jaeger UI had no centralized theming support. Users requested dark mode and the ability to customize the UI appearance. An earlier proposal (PR #3160) implemented dark mode via component-level selectors, but that approach:

- Required modifying ~73 files
- Added ~1,917 lines of code
- Created high ongoing maintenance burden and duplication

A pre-implementation audit of the codebase found:
- 528 hardcoded colors across 85 CSS files (150 unique values)
- Only 4 CSS variables in use (`--tx-color-title`, `--tx-color-body`, `--tx-color-muted`, `--nav-height`)
- Significant gray fragmentation: 20+ similar gray values that could consolidate to ~8 tokens

## Alternatives Considered

1. **Component-level theme selectors (PR #3160)** — `body[data-theme='light']` selectors in every component. Duplicates CSS per theme per component; easy to miss; high maintenance cost.

2. **CSS-in-JS theme objects** — Large refactor of existing CSS/Modules; runtime performance implications; harder to apply consistently.

3. **Design token-based approach (chosen)** — Single source of truth for theme values. Components use semantic tokens (CSS variables). Switching themes updates token values only. Scales to unlimited themes.

## Decision

Adopt a design token-based theming system implemented with CSS custom properties and a lightweight React theme provider. This minimizes migration surface area while offering a future-proof theming model.

### Core Principles

1. **Semantic tokens over hardcoded values**: Colors, spacing, shadows, etc. are accessed via tokens.
2. **Single source of truth**: Token definitions live centrally in `components/common/vars.css`.
3. **Component/theme decoupling**: Components read tokens and do not include theme logic.
4. **Ant Design integration**: Tokens are derived from Ant Design's CSS custom properties, so Ant Design's theme algorithm automatically drives theming for both custom and library components.
5. **Progressive enhancement**: Migrate incrementally; no large breaking change.

## Architecture

- **Ant Design ConfigProvider** (`ThemeProvider.tsx`)
  - Configures antd with light/dark algorithm
  - Ant Design emits `--ant-color-*` CSS custom properties
  - Manages theme state and persists preference to localStorage
- **Semantic Token Layer** (`vars.css`)
  - Maps `--ant-color-*` to semantic tokens (`--surface-primary`, `--text-primary`, `--border-default`, etc.)
  - Defines additional tokens not covered by antd (shadows, span colors, syntax highlighting, etc.)
  - Dark mode overrides for tokens that need explicit adjustment
- **Component Layer** (`*.css`)
  - Uses `var(--token-name)` exclusively
  - No theme-specific selectors
  - No hardcoded colors

## Implementation

### Token System (`packages/jaeger-ui/src/components/common/vars.css`)

Tokens are organized into semantic categories. Most wrap Ant Design's CSS custom properties so they automatically respond to theme changes. A `[data-theme='dark']` block overrides the small set of tokens that need explicit dark values (shadows, span palette, syntax highlighting, etc.).

```css
:root {
  /* Most tokens wrap Ant Design properties — theme changes are automatic */
  --surface-primary: var(--ant-color-bg-container);
  --text-primary: var(--ant-color-text);
  --border-default: var(--ant-color-border-secondary);
  --interactive-primary: var(--ant-color-primary);
  --feedback-error: var(--ant-color-error);

  /* Tokens without an antd equivalent are defined directly */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --span-color-1: #0072c3; /* IBM Carbon categorical palette, 20 colors total */
  --syntax-string: #22863a;
}

[data-theme='dark'] {
  /* Only tokens that need explicit dark values are overridden here */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --span-color-1: #1192e8;
  --syntax-string: #79c0ff;
}
```

### Theme Provider (`packages/jaeger-ui/src/components/App/ThemeProvider.tsx`)

- React context exposing `{ mode, setMode, toggleMode }`
- Initializes from localStorage, falls back to system preference
- Configures Ant Design `ConfigProvider` with light/dark algorithm
- Sets `document.body.dataset.theme` for CSS cascade
- Persists preference to localStorage

Related modules:
- `ThemeStorage.ts` — localStorage read/write helpers
- `ThemeTokenSync.ts` — syncs CSS custom properties after antd renders

### Theme Toggle (`packages/jaeger-ui/src/components/App/ThemeToggleButton.tsx`)

Button in the top navigation bar. Uses `useThemeMode()` hook to toggle between light and dark.

### Token Usage Pattern

```css
/* DO: use semantic tokens */
.MyComponent {
  background: var(--surface-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

/* DON'T: hardcode colors or use theme selectors in components */
.MyComponent { background: #ffffff; }
body[data-theme='dark'] .MyComponent { background: #1a1a1a; }
```

When no existing token fits, add a new semantic token to `vars.css` with both light and dark values.

## Component Migration Status

Migration replaces hardcoded colors with design tokens. A pre-migration audit found 528 hardcoded colors across 85 files. All major user-facing screens now support dark mode.

### Substantially Migrated

All the following areas are primarily using design tokens. Any remaining hardcoded colors are isolated remnants (typically 1–4 per file), often functional/data-visualization colors that intentionally do not change with theme.

- **App shell:** `App/index.css`, `App/TopNav.css`, `App/Page.css`
- **Trace Search:** all `SearchTracePage/**` CSS files
- **TracePage:** `index.css`, all `TracePageHeader/**`, `TraceFlamegraph/index.css`, `TraceGraph/TraceGraph.css`, `TraceStatistics/**`, `ArchiveNotifier/index.css`
- **TraceTimelineViewer:** all files including `SpanBarRow.css` (35 tokens, 2 hardcoded remnants), `SpanDetail/**`
- **TraceDiff:** `TraceDiff.css`, `TraceDiffGraph/TraceDiffGraph.css`, `TraceDiffHeader/**`
- **DependencyGraph:** `dag.css`, `DAGOptions.css`, `index.css`
- **DeepDependencies:** all CSS files
- **Common components:** all `common/**` CSS files

### Not Yet Migrated

**Monitor** — the only area with no token usage:
- `Monitor/ServicesView/serviceGraph.css`
- `Monitor/ServicesView/operationDetailsTable/index.css`
- `Monitor/EmptyState/index.css`

### Known Remaining Issues

A small number of files still have meaningful hardcoded color counts alongside token usage, indicating incomplete migration:

- `TraceDiff/TraceDiffGraph/renderNode.css` — 4 tokens, 13 hardcoded colors
- `TracePage/TraceGraph/OpNode.css` — 1 token, 7 hardcoded colors

## Key Benefits Realized

- **Adding a new theme**: modify 1 file (`vars.css`) instead of 73+ component files
- **Component authors**: use tokens by default; themes "just work"
- **Ant Design sync**: antd components and custom components share the same theme state

## Risks & Mitigation

- **Breaking existing styles**: Mitigate via incremental migration and visual testing
- **Browser compatibility**: CSS variables are supported in all modern browsers; IE11 is EOL
- **Incomplete migration**: Unmigrated components still function in light mode but may have visual issues in dark mode
