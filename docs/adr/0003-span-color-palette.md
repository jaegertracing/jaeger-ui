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

1. **The palette lives in CSS, not TypeScript.** `packages/jaeger-ui/src/components/common/vars.css` defines `--span-color-1` … `--span-color-20` under `:root`, and overrides all 20 under the `[data-theme='dark']` selector. Each token is annotated with its Carbon swatch name. Cyan is first, so a single-service trace gets the brand-adjacent color.
2. **`ColorGenerator` returns token references.** `packages/jaeger-ui/src/utils/color-generator.ts` builds its palette as `var(--span-color-N)` strings; `getColorByKey` hands those to consumers unchanged. There are no hex literals in the file, and theme switching therefore costs no JavaScript and no re-render — the CSS variable changes and every consumer follows.
3. **Canvas consumers resolve tokens at runtime.** Consumers that need numeric RGB rather than a CSS value — `CanvasSpanGraph`, `TraceFlamegraph`, `TraceGraph/OpNode` — call `getRgbColorByKey`, which reads the computed custom property and parses it with `strToRgb`.

### Critical path visibility

A critical-path line drawn in a fixed color is illegible against some span colors in one theme or the other. Rather than choose per-span, the line gets a 1px outline of the opposite luminance via `box-shadow`, giving it a halo that separates it from any background. Both values are tokens — `--critical-path-color` and `--critical-path-outline` — and they swap between the light and dark blocks (black-on-white becomes white-on-black).

## Consequences

- Palette changes are a single-file CSS edit, reviewable as a diff of hex values.
- Contrast was chosen against WCAG guidance in both themes, and adjacent indices are from different hue groups, so neighbouring services in a trace stay distinguishable.
- Theme switching is instant, because it is pure CSS.
- Because the runtime lookup asks the DOM for a token's current value, it must query an element that inherits the active theme. `getThemedElement()` resolves against `<body>`, which is where `ThemeProvider` sets `data-theme` and which also inherits the attribute if it is ever moved to `<html>`. Resolving against `<html>` is wrong: custom properties inherit downward only, so `<html>` never sees the `[data-theme='dark']` overrides and reports the light values.
- **Known gap**: the RGB values are strings baked into canvas draws and inline styles, so a consumer that does not re-render on a theme change keeps the previous theme's colors until something else re-renders it. `CanvasSpanGraph` subscribes to the theme and is correct; `TraceFlamegraph` (search-dimmed frames) and `TraceGraph/OpNode` (service-mode backgrounds) do not.

## Alternatives Considered

**Move `data-theme` to `<html>`** instead of changing the lookup. That would also make an `<html>` lookup correct, and putting the theme attribute on the root element is the more common convention. It was not chosen because it changes the element every themed selector in the app resolves against, to fix a defect in one utility — a much wider blast radius than reading from the element that already carries the attribute.

## References

- [RFC 0003: Span Color Palette for Trace Visualization](../rfc/0003-span-color-palette.md) - the three candidate palettes and why Carbon was chosen
- [ADR-0001: Design Token-Based Theming Architecture](./0001-design-token-based-theming.md) - the token mechanism this builds on
- [IBM Carbon data visualization palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
