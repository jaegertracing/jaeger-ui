# ADR 0003: Span Color Palette for Trace Visualization

**Status**: Proposed
**Last Updated**: 2026-01-04
**Next Review**: [Date]

---

## TL;DR

We recommend replacing the legacy hardcoded 25-color span palette with a theme-aware, 20-color qualitative palette based on the **IBM Carbon Design System** (with **Grafana Classic** as a secondary option). This palette is optimized for accessibility and contrast across light and dark modes.

## Context & Problem

The legacy span coloring mechanism in Jaeger UI used a hardcoded set of 25 colors assigned sequentially to service names. This implementation suffered from:
- **Low Contrast**: Several colors were too similar, making it hard to distinguish services.
- **Theme Incompatibility**: The colors did not adapt for Dark Mode, leading to poor legibility and "neon" eye-strain.
- **Tightly Coupled Logic**: Colors were hardcoded in TypeScript, requiring logic changes to update the theme.

## Alternatives Considered

### 1. IBM Carbon Design System (Extended) - [RECOMMENDED]
Modern enterprise standard for accessible data visualization.
- **Pros**: Dedicated hex codes for Light and Dark modes; high contrast between adjacent groups.
- **Cons**: Official sequence defines 14 colors; requires extension to 20 using primary swatches.

### 2. Grafana Classic Palette
Derived from the Grafana source code for time-series visualization.
- **Pros**: Observability industry standard; familiar aesthetic; robust light/dark coverage.
- **Cons**: Less emphasis on index-based contrast compared to Carbon.

### 3. Tableau 20
Legacy data visualization standard.
- **Pros**: 20 industry-standard distinct colors.
- **Cons**: Lacks native dark mode variants; requires manual adjustment for accessibility.

## Proposed Palette Options

### 1. IBM Carbon (Extended)
*Recommended for cross-platform accessibility.*

| Order | Hue Group | Light Hex | Dark Hex |
| :--- | :--- | :--- | :--- |
| 1 | **Cyan** | `#0072c3` | `#1192e8` |
| 2 | **Orange** | `#eb6200` | `#ff832b` |
| 3 | **Purple** | `#8a3ffc` | `#a56eff` |
| 4 | **Yellow** | `#b28600` | `#f1c21b` |
| 5 | **Teal** | `#005d5d` | `#009d9a` |
| 6 | **Red**| `#fa4d56` | `#da1e28` |
| 7 | **Green** | `#198038` | `#24a148` |
| 8 | **Magenta** | `#9f1853` | `#ee538b` |
| 9 | **Blue** | `#002d9c` | `#00539c` |
| 10 | **Gray** | `#6f6f6f` | `#8d8d8d` |
| 11 | **Cyan-Alt** | `#00539c` | `#0072c3` |
| 12 | **Orange-D** | `#8a3800` | `#ba4e00` |
| 13 | **Purple-D** | `#6929c4` | `#8a3ffc` |
| 14 | **Yellow-D** | `#8e6a00` | `#b28600` |
| 15 | **Teal-D** | `#002d2d` | `#005d5d` |
| 16 | **Red-D** | `#570408` | `#a2191f` |
| 17 | **Green-D** | `#0e6027` | `#198038` |
| 18 | **Magenta-D**| `#510224` | `#9f1853` |
| 19 | **Blue-D** | `#001141` | `#002d9c` |
| 20 | **Purple-S** | `#491d8b` | `#6929c4` |

### 2. Grafana Classic
*Recommended for observability consistency.*

| Order | Name | Light Hex | Dark Hex |
| :--- | :--- | :--- | :--- |
| 1 | `green` | `#56A64B` | `#73BF69` |
| 2 | `semi-dark-yellow` | `#E0B400` | `#F2CC0C` |
| 3 | `blue` | `#3274D9` | `#5794F2` |
| 4 | `orange` | `#FF780A` | `#FF9830` |
| 5 | `red` | `#E02F44` | `#F2495C` |
| 6 | `purple` | `#A352CC` | `#B877D9` |
| 7 | `dark-green` | `#19730E` | `#37872D` |
| 8 | `dark-yellow` | `#CC9D00` | `#E0B400` |
| 9 | `dark-blue` | `#1250B0` | `#1F60C4` |
| 10 | `dark-orange` | `#E55400` | `#FA6400` |
| 11 | `dark-red` | `#AD0317` | `#C4162A` |
| 12 | `dark-purple` | `#7C2EA3` | `#8F3BB8` |
| 13 | `super-light-green` | `#96D98D` | `#C8F2C2` |
| 14 | `super-light-yellow` | `#FFEE52` | `#FFF899` |
| 15 | `super-light-blue` | `#8AB8FF` | `#C0D8FF` |
| 16 | `super-light-orange` | `#FFB357` | `#FFCB7D` |
| 17 | `super-light-red` | `#FF7383` | `#FFA6B0` |
| 18 | `super-light-purple` | `#CA95E5` | `#DEB6F2` |
| 19 | `blue-80` | `#447EBC` | `#447EBC` |
| 20 | `orange-80` | `#C15C17` | `#C15C17` |

### 3. Tableau 20
*General industry standard for categorical data.*

| Order | Name | Hex Code |
| :--- | :--- | :--- |
| 1 | Blue | `#1f77b4` |
| 2 | L-Blue | `#aec7e8` |
| 3 | Orange | `#ff7f0e` |
| 4 | L-Orange | `#ffbb78` |
| 5 | Green | `#2ca02c` |
| 6 | L-Green | `#98df8a` |
| 7 | Red | `#d62728` |
| 8 | L-Red | `#ff9896` |
| 9 | Purple | `#9467bd` |
| 10 | L-Purple | `#c5b0d5` |
| 11 | Brown | `#8c564b` |
| 12 | L-Brown | `#c49c94` |
| 13 | Pink | `#e377c2` |
| 14 | L-Pink | `#f7b6d2` |
| 15 | Gray | `#7f7f7f` |
| 16 | L-Gray | `#c7c7c7` |
| 17 | Olive | `#bcbd22` |
| 18 | L-Olive | `#dbdb8d` |
| 19 | Cyan | `#17becf` |
| 20 | L-Cyan | `#9edae5` |

---

## Decision

Adopt the **IBM Carbon-based** 20-color palette (Cyan prioritized first) implemented via the **Design Token Architecture** established in [ADR 0001](file:///Users/ysh/dev/jaegertracing/jaeger-ui/agent1/docs/adr/0001-design-token-based-theming.md).

### Implementation Principles

1.  **CSS Variable Orchestration**: All colors are defined in [`vars.css`](file:///Users/ysh/dev/jaegertracing/jaeger-ui/agent1/packages/jaeger-ui/src/components/common/vars.css) using `--span-color-N` tokens.
2.  **Theme-Agnostic Generation**: `ColorGenerator.ts` returns CSS `var()` references rather than hardcoded hex values.
3.  **Dynamic RGB Resolution**: Components requiring raw RGB values (e.g., Canvas rendering) resolve tokens at runtime via `getComputedStyle` and the `strToRgb` utility.

## Key Benefits

- **Accessibility**: WCAG-compliant contrast in both themes.
- **Performance**: Instant theme switching via CSS (no JS re-renders).
- **Maintainability**: Palette changes now happen in a single CSS file.

## Critical Path Visibility

To ensure the critical path line (traditionally black) remains visible against high-luminance and low-luminance span colors, we have implemented a **"Halo" effect**.
- **Tokens**: Added `--critical-path-color` and `--critical-path-outline` to `vars.css`.
- **Contrast**: The critical path now features a 1px white outline (via `box-shadow`) which provides a "halo" across both light and dark span backgrounds, ensuring constant legibility regardless of the service color.

## Success Metrics

- Improved visual differentiation between 20+ services.
- Pass consistency check between Trace Timeline and Span Graphs.
- Zero hardcoded hex values in `ColorGenerator.ts`.
