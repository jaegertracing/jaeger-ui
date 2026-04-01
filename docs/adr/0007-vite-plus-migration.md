# ADR 0007: Migrate from Vite/Webpack Combo to Vite+

**Status**: Proposed
**Last Updated**: 2026-04-01
**Reviewed**: Pending

---

## TL;DR

Jaeger UI currently uses two separate bundlers: **Vite** (for the main `jaeger-ui` app) and **Webpack 5 + Babel CLI** (for the `plexus` library package). This ADR proposes unifying the entire monorepo build under **Vite** (library mode for plexus), eliminating webpack and aligning both packages on a single, modern toolchain.

**Recommendation**: Replace plexus's `webpack.umd.config.js` + `webpack-factory.js` + Babel CLI transpilation with a single `vite.lib.config.ts` using Vite's built-in library mode. Type declarations (`tsc --build`) continue as-is.

---

## Context & Problem

### Current Build Architecture

The monorepo contains two packages with different build stacks:

#### `packages/jaeger-ui` (app)

| Concern | Tool |
|---------|------|
| Dev server | `vite` (Vite 8.0.1) |
| Production bundle | `vite build` |
| React transforms | `@vitejs/plugin-react` |
| Legacy browser support | `@vitejs/plugin-legacy` |
| Unit tests | Jest 30 + Babel (separate from build) |

#### `packages/plexus` (library)

| Concern | Tool |
|---------|------|
| ESM lib output (`lib/`) | Babel CLI (`babel src --out-dir lib`) |
| Type declarations (`lib/`) | `tsc --build --force` |
| UMD bundle (`dist/`) | Webpack 5 (`webpack --config webpack.umd.config.js`) |
| Unit tests | Jest 30 + Babel (separate from build) |
| Directory cleanup | `rimraf lib dist` |

The Babel CLI + Webpack combo in plexus was the standard approach before Vite existed. Vite's library mode now covers both use cases in a single configuration file with superior tree-shaking, faster builds, and native TypeScript support. The `plexus` package has no CSS or Less files in `src/`, making the migration straightforward in that regard.

### Pain Points of the Current Setup

1. **Two bundlers to maintain**: Contributors must understand both Webpack config idioms and Vite config idioms.
2. **Webpack-specific devDependencies in plexus**: `webpack`, `webpack-cli`, `webpack-node-externals`, `clean-webpack-plugin`, `babel-loader` — none of these are needed once Vite handles the build.
3. **Separate Babel config for the build**: `packages/plexus/babel.config.js` doubles as both the build transform and the Jest transform, coupling them. This makes it risky to change one without affecting the other.
4. **`npm run depcheck`**: `scripts/generateDepcheckrcPlexus.js` imports `babel.config.js` to enumerate the Babel packages that depcheck should ignore. This script must be updated whenever the Babel config changes.
5. **Slow parallel builds**: The plexus `build` script runs `_tasks/build/lib/js`, `_tasks/build/lib/types`, and `_tasks/build/umd` in parallel via `npm-run-all`. Vite's library mode can replace the first and third tasks, reducing total build time.

---

## Decision

Migrate `packages/plexus` from Webpack + Babel CLI to **Vite library mode**, producing equivalent ES module (replacing `lib/`) and UMD (replacing `dist/`) outputs. TypeScript declaration emission (`tsc --build`) is retained unchanged.

The `packages/jaeger-ui` Vite configuration is **unchanged** by this ADR — it already uses Vite and will not be modified.

---

## Detailed Change Inventory

### 1. New file: `packages/plexus/vite.lib.config.ts`

A new Vite library-mode config replaces both `webpack-factory.js` and the Babel CLI JS output task. The config:

- Sets `build.lib.entry` to `src/index.ts`
- Produces `formats: ['es', 'umd']` to replace both `lib/` (ESM) and `dist/` (UMD) outputs
- Externalizes all direct and peer dependencies (`react`, `react-dom`, `@viz-js/viz`, `d3-selection`, `d3-zoom`, `memoize-one`, `react-icons`) so they are never bundled
- Uses `@vitejs/plugin-react` with the Babel configuration required to strip React prop types in production (replacing `babel-plugin-transform-react-remove-prop-types`)
- Keeps `build.outDir` per-format or targets `dist/` for UMD and `lib/` for ESM (see **Unknown 3** for file layout considerations)

Outline of the config:

```ts
// packages/plexus/vite.lib.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-transform-react-remove-prop-types', { removeImport: true }],
        ],
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'plexus',
      formats: ['es', 'umd'],
      fileName: format => (format === 'es' ? 'index.mjs' : 'index.js'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@viz-js/viz', 'd3-selection', 'd3-zoom', 'memoize-one', 'react-icons'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

> **Note**: The exact `fileName` and `outDir` structure must be validated against **Unknown 3** before finalizing. The UMD output must remain backward-compatible with consumers that reference `dist/index.js`.

### 2. Modified: `packages/plexus/package.json`

#### Scripts

**Remove**:

```json
"_tasks/build/lib/js": "babel src --extensions '.tsx,.js,.ts' --out-dir lib",
"_tasks/build/umd": "webpack --mode $NODE_ENV --config webpack.umd.config.js",
```

**Add**:

```json
"_tasks/build/lib/js": "vite build --config vite.lib.config.ts --outDir lib",
"_tasks/build/umd": "vite build --config vite.lib.config.ts --outDir dist",
```

Or, if a single Vite invocation can write both output directories (via two sequential Vite builds), consolidate into:

```json
"_tasks/build/dist": "vite build --config vite.lib.config.ts",
```

and adjust `files` and `main`/`module` fields accordingly.

#### devDependencies — Remove

```
babel-loader
clean-webpack-plugin
webpack
webpack-cli
webpack-node-externals
```

#### devDependencies — Add

```
vite  (pin to same version as packages/jaeger-ui: 8.0.1)
@vitejs/plugin-react  (pin to same version as packages/jaeger-ui: 6.0.1)
```

> Using the same pinned versions as `jaeger-ui` ensures consistent Rollup/Rolldown behavior and avoids duplicate installations.

#### `files` field

If the output layout changes (e.g., `lib/` removed and everything under `dist/`), update `"files"` accordingly. The current value is:

```json
"files": ["lib", "dist"]
```

#### `main` / `module` / `exports`

The current `"main": "lib/index.js"` was written for the Babel CLI ESM output. After migration, update to reflect the new file names. Consider adding a proper `exports` map:

```json
"main": "dist/index.js",
"module": "dist/index.mjs",
"exports": {
  ".": {
    "import": "./dist/index.mjs",
    "require": "./dist/index.js"
  }
}
```

Note that **in development** `packages/jaeger-ui` bypasses these fields entirely via the Vite alias:

```ts
// packages/jaeger-ui/vite.config.mts
'@jaegertracing/plexus': path.resolve(__dirname, '../plexus/src'),
```

So the `main`/`exports` fields only matter for production consumers of the published package.

### 3. Remove files

```
packages/plexus/webpack-factory.js
packages/plexus/webpack.umd.config.js
```

`packages/plexus/babel.config.js` **must be retained** for Jest. The `test/babel-transform.js` in plexus delegates to this file, and `scripts/generateDepcheckrcPlexus.js` also imports it. See §7 below for how the depcheck script is updated.

### 4. TypeScript configuration — No changes required

The existing `packages/plexus/tsconfig.json` already uses:

```json
"moduleResolution": "bundler",
"composite": true,
"emitDeclarationOnly": true,
"outDir": "lib"
```

This is compatible with Vite and project references. The `_tasks/build/lib/types` task (`tsc --build --force`) is unchanged.

The root `tsconfig.json` (used by `npm run tsc-lint`) references `packages/plexus/tsconfig.json` and requires no modification.

### 5. ESLint — No changes required

`eslint.config.js` operates on source files (`packages/*/src/**/*.{ts,tsx}`) and references `packages/*/tsconfig.json` for TypeScript parsing. Neither the webpack removal nor the Vite addition affects ESLint.

The `eslint.config.js` `ignores` list already excludes `packages/*/dist/**` and `packages/*/lib/**`, so build outputs are never linted.

### 6. Prettier — No changes required

Prettier runs across the whole repo root (`prettier --write .`) and is excluded for the `docs/` directory via `.prettierignore`. The new `vite.lib.config.ts` file will be auto-formatted by the existing Prettier setup.

### 7. `scripts/generateDepcheckrcPlexus.js`

This script imports `packages/plexus/babel.config.js` to extract the list of Babel plugin/preset package names and adds them to depcheck's `ignores`. After the migration:

- `babel-loader`, `webpack`, `webpack-cli`, `webpack-node-externals`, `clean-webpack-plugin` are removed from devDependencies, so they no longer need to be in `ignores`.
- The `otherPackages` array currently contains `'webpack-cli'`; remove it.
- Add `'vite'` and `'@vitejs/plugin-react'` to `otherPackages` since they are used in `vite.lib.config.ts` (a config file outside `src/`), which depcheck might not scan.

### 8. CI Workflows — Minimal or no changes required

| Workflow | Impact |
|----------|--------|
| `.github/workflows/lint-build.yml` | Runs `npm run build` — no change needed; the new plexus scripts are invoked transparently. |
| `.github/workflows/unit-tests.yml` | Runs `npm run coverage` (Jest) — Jest continues to use Babel transforms; no change. |
| `.github/workflows/check_bundle.yml` | Measures `packages/jaeger-ui/build` bundle size — not affected by plexus changes. |
| `.github/workflows/codeql.yml` | Static analysis on source files — unaffected. |
| All other workflows | Unrelated to build tooling — no changes. |

There are no CI steps that reference webpack directly (e.g., no `webpack --profile` or webpack-specific artifact uploads), so the removal is transparent to CI.

### 9. Documentation

- Update `README.md` if it documents the plexus build process (currently it does not describe internal build tooling).
- Update `packages/plexus/README.md` (if it exists) to remove references to webpack.
- Add an entry to `docs/adr/README.md` linking to this ADR.

---

## Unknowns and Experiments

### Unknown 1 — Web Worker bundling in Vite library mode 🔴 High Risk

**Description**: `packages/plexus/src/LayoutManager/Coordinator.ts` creates a Web Worker using:

```ts
new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' })
```

Vite handles `import.meta.url`-based workers natively in **app mode** but library mode support is limited. In Rollup (Vite 7) and Rolldown (Vite 8), `new URL('...', import.meta.url)` in a library build may:

- Emit the worker file as a separate chunk (ideal)
- Leave the `new URL(...)` expression unresolved (broken for consumers)
- Require a plugin (e.g., `@rollup/plugin-url`, `rollup-plugin-web-worker-loader`, or a custom inline-worker plugin)

**Experiment**:

1. Create a minimal Vite library config for plexus and run `vite build`.
2. Inspect the output for `layout.worker.ts`:
   - Does Rollup/Rolldown emit it as a separate `.js` file in `dist/`?
   - Does the `new URL(...)` expression in the output reference the correct relative path?
3. Write a consumer test: create a minimal HTML page that loads the built plexus UMD bundle and instantiates `LayoutManager`. Verify that the worker loads and responds.
4. If the worker URL is broken, evaluate:
   - **Option A**: Use `vite-plugin-web-worker-loader` (inlines the worker as a Blob URL) — removes the separate file requirement but increases the main bundle size.
   - **Option B**: Build `layout.worker.ts` as a separate Vite library entry and reference it from the main bundle via a relative path convention.
   - **Option C**: Keep `layout.worker.ts` outside Vite's scope — compile it separately with `tsc` and reference the output JS file in Coordinator.ts (replacing the `import.meta.url` pattern with a static path that consumers must host alongside the bundle).

**Acceptance criteria**: The `LayoutManager` creates a worker successfully in both the `jaeger-ui` dev server and a production build of `jaeger-ui`.

---

### Unknown 2 — `babel-plugin-transform-react-remove-prop-types` equivalence 🟡 Medium Risk

**Description**: `packages/plexus/babel.config.js` includes `babel-plugin-transform-react-remove-prop-types` with `{ removeImport: true }`. This removes React `.propTypes` assignments from production bundles. With `@vitejs/plugin-react`, it is possible to pass Babel plugins, but the interaction with Vite's esbuild/SWC fast path (used for non-plugin transforms) is not always predictable.

**Experiment**:

1. Build plexus with the Babel plugin configured via `@vitejs/plugin-react`.
2. Search the built `dist/index.mjs` output for `.propTypes` assignments. They should be absent in a production build.
3. If not stripped: measure the size contribution of prop-type code using `BUNDLE_STATS=1 npm run build` on the `jaeger-ui` package and decide whether the overhead is acceptable.
4. Alternatively, since plexus uses TypeScript (not plain JSX with runtime `PropTypes`), confirm that `propTypes` objects are not actually emitted in the TypeScript source — if so, the Babel plugin may already be a no-op and can be removed entirely from `babel.config.js`.

**Acceptance criteria**: No `propTypes` assignments appear in the production build output, or it is confirmed that no `propTypes` exist in the TypeScript source and the plugin is unnecessary.

---

### Unknown 3 — Output directory layout and `package.json` `exports` field 🟡 Medium Risk

**Description**: The current plexus package exposes two build outputs:

- `lib/` — ESM JS output (from Babel CLI) + `.d.ts` type declarations (from `tsc`)
- `dist/` — UMD bundle (from Webpack)

After migration, Vite library mode will produce output files whose names and locations depend on `build.lib.fileName` and `build.outDir`. There are two viable approaches:

**Option A — Preserve current layout**: Run Vite twice (once for `lib/`, once for `dist/`), keeping the same directory structure. The `lib/` Vite output coexists with the `tsc`-emitted `.d.ts` files there.

**Option B — Consolidate under `dist/`**: Use a single `dist/` directory for all Vite-produced artifacts, and keep `lib/` for `tsc`-only declaration files. Update `package.json` `exports` to reflect this.

**Experiment**:

1. Run Option B locally and verify:
   - `tsc --build` still emits `.d.ts` to `lib/`
   - `vite build` emits `dist/index.mjs` (ESM) and `dist/index.js` (UMD)
   - The `jaeger-ui` production build (`vite build` in `packages/jaeger-ui`) resolves plexus correctly via the alias and produces a working application
2. Check whether any existing CI job, renovate config, or release script references specific plexus output paths.
3. Decide on the final layout and update `"main"`, `"module"`, and `"exports"` fields in `packages/plexus/package.json`.

**Acceptance criteria**: `npm pack` on plexus produces a tarball whose `exports` map resolves correctly in a consuming Node.js ESM and CJS project, and `jaeger-ui`'s production build works end-to-end.

---

### Unknown 4 — Vite 8 Rolldown compatibility with plexus source 🟢 Low Risk

**Description**: The `packages/jaeger-ui` vite config already includes a comment noting compatibility with "both Vite 7 (Rollup) and Vite 8 (Rolldown)". Using Vite 8 for the plexus library build will use Rolldown as the bundler. Rolldown is not fully API-stable and may produce different behavior for:

- Dynamic `import()` expressions in library mode
- `import.meta.url` resolution (see Unknown 1)
- Minification of class fields and decorators used in plexus TypeScript

**Experiment**:

1. Run the plexus Vite library build with Vite 8 and inspect the output for any Rolldown-specific artifacts or warnings.
2. If issues arise, add `"vite": "^7.x"` to plexus devDependencies to pin to the Rollup-backed version while Rolldown matures.

**Acceptance criteria**: No build warnings or runtime errors that don't exist in the current webpack build.

---

### Unknown 5 — `depcheck` configuration after webpack removal 🟢 Low Risk

**Description**: `scripts/generateDepcheckrcPlexus.js` imports `packages/plexus/babel.config.js` to build the `ignores` list. After the webpack devDependencies are removed, they must also be removed from the `ignores` list or depcheck will fail with "ignored package not found."

**Experiment**: Run `npm run depcheck` after removing the webpack devDependencies and observe output. Adjust `otherPackages` in `generateDepcheckrcPlexus.js` as needed.

**Acceptance criteria**: `npm run depcheck` passes cleanly.

---

## Implementation Plan

The migration should be done in a single focused PR to minimize the time the build system is in a mixed state. The suggested sequence within that PR:

1. **Experiment (prerequisite)**: Resolve Unknowns 1–3 in a local spike branch before opening the main migration PR. Document findings in this ADR (update status to "Accepted" or "Amended").

2. **Step 1 — Add Vite config**: Create `packages/plexus/vite.lib.config.ts`.

3. **Step 2 — Update scripts**: Modify `packages/plexus/package.json` scripts to call Vite instead of Babel CLI and Webpack.

4. **Step 3 — Update dependencies**: Remove webpack-related devDependencies; add/pin `vite` and `@vitejs/plugin-react`.

5. **Step 4 — Remove old config files**: Delete `webpack-factory.js` and `webpack.umd.config.js`.

6. **Step 5 — Update depcheck script**: Modify `scripts/generateDepcheckrcPlexus.js` to remove webpack entries from `otherPackages`.

7. **Step 6 — Update `package.json` exports**: Adjust `"main"`, `"module"`, `"exports"`, and `"files"` in plexus `package.json` to match the new output layout.

8. **Step 7 — Validate CI locally**: Run the full `npm run lint && npm test && npm run build` suite and confirm green.

9. **Step 8 — Update documentation**: Add entry to `docs/adr/README.md`; update this ADR's status to "Accepted".

---

## Consequences

### Positive

- **Single bundler**: Contributors only need to understand Vite configuration; Webpack knowledge is no longer required for library builds.
- **Faster builds**: Vite's Rolldown backend (Vite 8) is significantly faster than Webpack 5 for library builds.
- **Fewer devDependencies**: Five webpack-specific packages removed from plexus, reducing `npm ci` time and the attack surface for supply-chain vulnerabilities.
- **Consistent toolchain**: Both packages in the monorepo use the same Vite version and plugin ecosystem.
- **Dual ESM + CJS output**: Vite library mode makes it straightforward to emit both `es` and `cjs` (or `umd`) formats in a single build invocation, simplifying the `package.json` exports map.

### Negative / Trade-offs

- **Worker bundling complexity**: If Unknown 1 requires a workaround (Blob inlining or a separate tsc step for the worker), the build configuration becomes more complex than a straight webpack-to-Vite swap.
- **Babel plugin compatibility**: `@vitejs/plugin-react` with Babel plugins has a non-trivial performance cost compared to the default esbuild-only path; this mainly affects library build time, not the dev server.
- **`babel.config.js` stays**: The file cannot be removed because Jest still relies on it. This means plexus still has a Babel config, which could be confusing. A follow-up ADR could address migrating plexus tests from Jest+Babel to Vitest, eliminating `babel.config.js` entirely.

### Neutral

- **CI workflows**: No changes required. The existing `npm run build` call transparently invokes the new Vite-based scripts.
- **Type declarations**: `tsc --build` continues unchanged.
- **`jaeger-ui` dev alias**: The `vite.config.mts` alias `'@jaegertracing/plexus': path.resolve(__dirname, '../plexus/src')` continues to work; no changes to the app package.
