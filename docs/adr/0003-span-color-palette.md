# ADR-0003: Span Color Palette for Trace Visualization

* **Status**: Implemented — graduated from [RFC 0003](../rfc/0003-span-color-palette.md)
* **Date**: 2026-01-04
* **Delivered by**: [#3306](https://github.com/jaegertracing/jaeger-ui/pull/3306)

## Context

Span colors are assigned per service name and appear in the timeline, the span graph, the flamegraph, the trace graph, the statistics table, and the search-result service pills. The original palette was 25 hex values hardcoded in `ColorGenerator`, which had three problems: several colors were close enough to be indistinguishable, none of them adapted to dark mode (producing a neon, low-legibility result), and changing the palette meant editing TypeScript.

[RFC 0003](../rfc/0003-span-color-palette.md) weighed three candidate palettes — IBM Carbon (extended to 20), Grafana Classic, and Tableau 20 — and recommended Carbon. This ADR records what was built.

## Decision

Adopt a **20-color IBM Carbon palette with separate light and dark values**, delivered through the design token architecture from [ADR-0001](./0001-design-token-based-theming.md).

Three rules follow from that, and together they are the whole mechanism:

1. **The palette lives in CSS, not TypeScript.** `packages/jaeger-ui/src/components/common/vars.css` defines `--span-color-1` … `--span-color-20` under `:root`, and overrides all 20 under the `[data-theme='dark']` selector. Each token is annotated with its Carbon swatch name. [RFC 0003](../rfc/0003-span-color-palette.md) puts Cyan first without stating a reason, and the order has no significance beyond being the order colors are handed out.
2. **`ColorGenerator` returns token references.** `packages/jaeger-ui/src/utils/color-generator.ts` builds its palette as `var(--span-color-N)` strings; `getColorByKey` hands those to consumers unchanged. There are no hex literals in the file, and theme switching therefore costs no JavaScript and no re-render — the CSS variable changes and every consumer follows.
3. **Canvas consumers resolve tokens at runtime.** Consumers that need numeric RGB rather than a CSS value — `CanvasSpanGraph`, `TraceFlamegraph`, `TraceGraph/OpNode` — call `getRgbColorByKey`, which reads the computed custom property and parses it with `strToRgb`.

### Critical path visibility

A critical-path line drawn in a fixed color is illegible against some span colors in one theme or the other. Rather than choose per-span, the line gets a 1px outline of the opposite luminance via `box-shadow`, giving it a halo that separates it from any background. Both values are tokens — `--critical-path-color` and `--critical-path-outline` — and they swap between the light and dark blocks (black-on-white becomes white-on-black).

## Consequences

- Palette changes are a single-file CSS edit, reviewable as a diff of hex values.
- **Colors are handed out in first-seen order, not derived from the service name.** `ColorGenerator` keeps a counter and a name→index cache, and `clear()` is never called outside tests, so the cache lives for the whole browser session across every trace visited. Two consequences follow: a service keeps its color while navigating between traces, and the assignment depends on the order services were first encountered since page load — so the same trace can render with different colors for different viewers. Deterministic assignment is tracked separately.
- Because assignment is sequential, the root span's service takes `--span-color-1` on a freshly loaded page. In dark mode that token is 11° in hue from `--surface-secondary`, which is why the collapsed-box tint needs a larger share there than in light mode.
- Contrast was chosen against WCAG guidance in both themes, and adjacent indices are from different hue groups, so neighbouring services in a trace stay distinguishable.
- Theme switching is instant, because it is pure CSS.
- Because the runtime lookup asks the DOM for a token's current value, it must query an element that inherits the active theme. `getThemedElement()` resolves against `<body>`, which is where `ThemeProvider` sets `data-theme` and which also inherits the attribute if it is ever moved to `<html>`. Resolving against `<html>` is wrong: custom properties inherit downward only, so `<html>` never sees the `[data-theme='dark']` overrides and reports the light values.
- **Two theming mechanisms coexist, and they are carried by different elements.** Tokens derived from Ant Design (`--surface-primary` → `--ant-color-bg-container`, and the rest of the `var(--ant-*)` references in `vars.css`) get their theme-dependence from `ThemeTokenSync`, which writes antd's generated tokens onto `<html>` as inline styles. Tokens defined directly in `vars.css` — the span palette and the critical-path pair — get theirs from the `[data-theme='dark']` block on `<body>`. `<body>` is the only element that resolves both correctly, since it inherits the `<html>` inline styles as well. This is also why the defect was easy to miss: `CanvasSpanGraph` reads `--surface-primary` off `document.documentElement` a few lines from its span-color lookup, and that read is correct, because its value comes from the inline-style mechanism rather than from `[data-theme]`.
- **A DOM read of a theme-dependent token is only correct if the attribute is already written**, which constrains `ThemeProvider`: it sets `data-theme` in a **layout** effect. React runs a parent's *passive* effects after its descendants', so a passive write there would let a consumer reading the token from its own `useEffect` observe the previous theme for one commit — every layout effect runs before any passive effect, which orders it correctly. Before this was fixed, toggling to light left `#da1e28` (dark-6) on the span-graph canvas and toggling to dark left `#fa4d56` (light-6). Page loads happened to look right only because trace data arrives asynchronously, so the canvas redrew after the attribute was set.
- **Known gap**: the resolved RGB is baked into a canvas draw or an inline style, so it is only as current as the last render. `CanvasSpanGraph` subscribes to the theme through `useThemeMode` and redraws. `TraceFlamegraph` (search-dimmed frames) and `TraceGraph/OpNode` (service-mode backgrounds) do not subscribe at all, so they keep the previous theme's colors on a toggle until something else re-renders them. Both are correct on load.

## Alternatives Considered

**Move `data-theme` to `<html>`** instead of changing the lookup. That would also make an `<html>` lookup correct, and putting the theme attribute on the root element is the more common convention.

It was rejected because `<html>` is already claimed by Ant Design. `ThemeTokenSync` writes antd's design tokens onto `<html>` as **inline styles**, and an inline style outranks any stylesheet rule on the same element. With `data-theme` on `<html>`, a rule in the `[data-theme='dark']` block could therefore never override an `--ant-*` token — it would lose to the inline value. Keeping the attribute on `<body>` leaves that ability intact: there the inline value is merely inherited, and a `[data-theme='dark']` rule beats inheritance. Given that `vars.css` is built on top of the antd tokens, forfeiting the power to override them in dark mode is a real constraint, not a hypothetical one.

Moving the attribute would also change the element every themed selector in the app resolves against, to fix a defect in one utility — a much wider blast radius than reading from the element that already carries the attribute.

## References

- [RFC 0003: Span Color Palette for Trace Visualization](../rfc/0003-span-color-palette.md) - the three candidate palettes and why Carbon was chosen
- [ADR-0001: Design Token-Based Theming Architecture](./0001-design-token-based-theming.md) - the token mechanism this builds on
- [IBM Carbon data visualization palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
