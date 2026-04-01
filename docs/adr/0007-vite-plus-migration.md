# ADR 0007: Migrate to Vite+ (Full Vite Toolchain)

**Status**: Proposed
**Last Updated**: 2026-04-01

---

## TL;DR

Replace the current hybrid build toolchain (Vite for `jaeger-ui`, Webpack + Babel for `plexus`, Jest + Babel
for testing in both packages) with a unified Vite-based toolchain across the entire monorepo. This eliminates
Webpack, the Babel CLI, all Babel presets/plugins, and migrates from Jest to Vitest — resulting in fewer
dependencies, faster builds and tests, and a single mental model for all tooling.

---

## Context & Problem

### Current State

The monorepo uses two distinct build toolchains that co-exist uneasily:

| Concern          | `packages/jaeger-ui`                    | `packages/plexus`                        |
| ---------------- | --------------------------------------- | ---------------------------------------- |
| Dev server       | Vite 8                                  | n/a                                      |
| Production build | Vite 8 (Rolldown engine)                | Babel CLI (`lib/`) + Webpack 5 (`dist/`) — unused |
| Testing          | Jest 30 + `babel-jest` transformer      | Jest 30 + `babel-jest` transformer       |
| TypeScript       | `tsc` (type-check only, two tsconfigs)  | `tsc` (declarations + type-check)        |
| ESLint           | Legacy `.eslintrc.js` + root flat config | Legacy `.eslintrc.js`                    |

This creates several pain points:

1. **Two transform pipelines for tests**: Babel is maintained purely for Jest. It diverges from Vite's
   esbuild/oxc pipeline, so code that works at runtime can subtly differ from what is tested.

2. **ESM workaround in tests**: `redux-actions` 3.x is ESM-only and uses `import.meta.NODE_ENV`. Jest runs
   in CommonJS mode, requiring a custom Babel plugin (`importMetaTransform` in
   `packages/jaeger-ui/test/babel-transform.js`) to rewrite `import.meta` to `process` at test time. This is
   a fragile hack that would not be needed under a native ESM test runner.

3. **Webpack in plexus**: `packages/plexus` builds a UMD bundle via Webpack 5 and its lib via Babel CLI.
   Both are separate tools from Vite, adding `webpack`, `webpack-cli`, `webpack-node-externals`,
   `clean-webpack-plugin`, `babel-loader`, `babel-plugin-transform-react-remove-prop-types`, and multiple
   `@babel/plugin-*` packages as dev dependencies.

4. **Two tsconfig files for jaeger-ui**: `tsconfig.json` (used by Vite, requires `isolatedModules: true`)
   and `tsconfig.lint.json` (used by `tsc --build`, requires `isolatedModules: false` and `composite: true`).
   The split exists because Vite and `tsc --build` have incompatible requirements (see the comment in
   `tsconfig.lint.json`). Vitest eliminates `isolatedModules` as a build-time constraint.

5. **Legacy ESLint config in plexus**: `packages/plexus/.eslintrc.js` uses the legacy eslintrc format, which
   is deprecated. The root `eslint.config.js` already uses the modern flat config format.

### Why "Vite+"?

"Vite+" refers to adopting Vite as the single tool for building, testing, and dev-serving across the entire
monorepo:

- The `plexus` **library build is dropped entirely**. `@jaegertracing/plexus` is no longer published to npm;
  the only consumer is `jaeger-ui` via a workspace source alias. There is nothing to build.
- **Vitest** replaces Jest + Babel for testing in both packages. Vitest shares Vite's transform pipeline, so
  the test environment matches the production build environment exactly.
- All Babel infrastructure is eliminated.

---

## Decision

Migrate both packages to a full Vite+ toolchain:

1. **Drop the `packages/plexus` library build entirely** — remove Webpack, Babel CLI, and all associated
   config. Type-checking is retained via the root `tsc --build` project reference.
2. Replace Jest + Babel in both packages with **Vitest**.
3. Delete all Babel configuration files and Babel-related dev dependencies.
4. Migrate `packages/plexus/.eslintrc.js` to the flat config format (consolidate into root `eslint.config.js`
   or a per-package `eslint.config.js`).
5. Simplify the `packages/jaeger-ui` tsconfig situation (potentially collapsing two files into one).

---

## Detailed Change Plan

### 1. `packages/plexus` — Drop the Library Build

`@jaegertracing/plexus` is no longer published to npm. The only consumer is `jaeger-ui`, which resolves
the package via a workspace source alias (`@jaegertracing/plexus` → `../plexus/src`) and never touches
the built `lib/` or `dist/` artifacts. The entire build pipeline — Babel CLI, Webpack, rimraf — exists
solely to produce output that no one uses.

**Recommendation**: delete the build entirely. Type-checking is already provided by the root `tsc --build`
project reference, so no new tooling is needed.

#### 1a. Update `packages/plexus/package.json`

- **Remove** from `devDependencies`:
  - `webpack`, `webpack-cli`, `webpack-node-externals`, `clean-webpack-plugin`, `babel-loader`
  - `babel-plugin-transform-react-remove-prop-types`
  - `@babel/plugin-syntax-dynamic-import`, `@babel/plugin-transform-class-properties`, `@babel/plugin-transform-private-methods`
  - `@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript`
  - `rimraf` (Vite clears output dirs automatically)
  - `npm-run-all2` (build becomes a single `vite build` command)

- **Remove `scripts`**: `build`, `prepublishOnly`, and all `_tasks/*` entries. The root
  `npm run build` uses `--workspaces`, so plexus needs either no `build` script (requires changing
  the root invocation to `--if-present`) or a no-op. The simplest approach: change the plexus
  `build` script to `tsc --noEmit` so the root build still exercises type-checking for plexus.

  ```json
  {
    "scripts": {
      "build": "tsc --noEmit"
    }
  }
  ```

- **Remove `files`, `main`, `prepublishOnly`** from `package.json` — dead weight for an unpublished
  package.

- **Delete files**:
  - `packages/plexus/babel.config.js`
  - `packages/plexus/webpack.umd.config.js`
  - `packages/plexus/webpack-factory.js`

- **Update `scripts/generateDepcheckrcPlexus.js`**: This script currently imports
  `packages/plexus/babel.config.js` and `packages/plexus/test/babel-transform.js` at lines 7–8 to
  introspect the Babel preset/plugin list and build the depcheck ignore list. Once Babel is removed from
  plexus, those imports will break. The script must be updated to either: (a) list the formerly-Babel
  packages statically in the `otherPackages` array for one release cycle then remove them, or (b) be
  deleted entirely if depcheck is reconfigured to not need the generated ignore list.

#### Prop-types removal

`packages/plexus/babel.config.js` applies `babel-plugin-transform-react-remove-prop-types` with
`removeImport: true`. Since the library build is dropped, this only matters for the production
`jaeger-ui` bundle. The `jaeger-ui` Vite config (`vite.config.mts`) does not currently apply this
plugin, which means plexus `propTypes` declarations — if any exist — are already reaching the
production bundle. Audit plexus source files for `propTypes` usage; if none are found the question is
moot. If they are found, the fix belongs in `jaeger-ui`'s `vite.config.mts`, not in plexus.

#### 1b. Update `packages/plexus/tsconfig.json`

With no build emitting declarations, the tsconfig no longer needs `emitDeclarationOnly`, `outDir`, or
`rootDir`. It becomes a pure type-check config. `composite: true` is still required by the root project
reference:

```json
{
  "compilerOptions": {
    "target": "es2016",
    "lib": ["es2017", "dom", "dom.iterable", "webworker"],
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "composite": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "./typings"]
}
```

---

### 2. Both Packages — Replace Jest + Babel with Vitest

#### 2a. Add Vitest configuration

Vitest is configured inside the package's `vite.config.ts`. A `vitest.config.ts` is an alternative if
keeping the Vite dev/build config separate is preferred (valid for `jaeger-ui`).

**`packages/jaeger-ui/vitest.config.ts`** (or merged into `vite.config.mts` under `test:`):

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true, // makes describe/it/expect available without import
    setupFiles: ['./test/vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/setup*.js',
        'src/utils/DraggableManager/demo/**',
        'src/utils/test/**',
        'src/demo/**',
        'src/types/**',
      ],
    },
  },
  define: {
    __REACT_APP_GA_DEBUG__: JSON.stringify(''),
    __REACT_APP_VSN_STATE__: JSON.stringify(''),
    __APP_ENVIRONMENT__: JSON.stringify('test'),
  },
});
```

#### 2b. Migrate test setup files

The existing `packages/jaeger-ui/test/jest-per-test-setup.js` mostly maps directly to Vitest. Key
differences:

- Replace `jest.fn()` with `vi.fn()` (or enable `globals: true` to keep `jest` as alias — Vitest supports
  this via `globals: true` + `@vitest/globals`).
- `@testing-library/jest-dom` is compatible with Vitest when imported via
  `'@testing-library/jest-dom/vitest'`.
- The `globalSetup` file (`test/jest.global-setup.js`) sets `process.env.TZ = 'UTC'`. This maps to Vitest's
  `globalSetup` option.
- The `importMetaTransform` Babel plugin in `test/babel-transform.js` is entirely eliminated — Vitest runs
  native ESM and `import.meta` is valid in the test environment.

Rename `test/jest-per-test-setup.js` → `test/vitest-setup.ts` and update it:

```typescript
import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { polyfill as rafPolyfill } from '../src/utils/test/requestAnimationFrame';

rafPolyfill();
// ... rest of setup unchanged, replacing jest.fn() with vi.fn()
```

#### 2c. Snapshot tests

Vitest uses `@vitest/snapshot` which is compatible with Jest's snapshot format (same `.snap` file syntax).
Existing snapshot files should be re-generated once to confirm they are identical. The root-level
`update-snapshots` script becomes:

```json
"update-snapshots": "cd packages/jaeger-ui && npx vitest run --update"
```

#### 2d. Update `packages/jaeger-ui/package.json`

- **Remove** from `devDependencies`:
  - `babel-jest`, `babel-plugin-react-remove-properties`
  - `@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript`
  - `jest`, `jest-environment-jsdom`, `jest-junit`
  - `@types/jest`

- **Add** to `devDependencies`:
  - `vitest`
  - `@vitest/coverage-v8`
  - `@vitest/ui` (optional, for interactive test UI)

- **Update `scripts`**:

  ```json
  {
    "scripts": {
      "test": "vitest run --reporter=verbose",
      "test-ci": "CI=1 vitest run --reporter=verbose",
      "coverage": "vitest run --coverage"
    }
  }
  ```

- **Remove** the `jest` config block from `package.json` entirely.

- **Delete files**:
  - `packages/jaeger-ui/test/babel-transform.js`
  - `packages/jaeger-ui/test/generic-file-transform.js` (replaced by Vite's built-in asset handling)
  - `packages/jaeger-ui/test/jest.global-setup.js` (merged into vitest config `globalSetup`)

#### 2e. Root-level `package.json` changes

- Remove from `devDependencies`:
  - `@babel/cli`, `@babel/core` (no longer needed anywhere)
  - `babel-jest` (not in root but verify no root-level usage)

- The root `test` script remains:
  ```json
  "test": "npm run --workspaces test --"
  ```

---

### 3. ESLint Config Consolidation

#### Current state

`packages/plexus/.eslintrc.js` uses legacy `eslintrc` format. The root `eslint.config.js` already uses flat
config. ESLint 10 still supports legacy configs via automatic config lookup, but the `.eslintrc.*` format is
deprecated and will be removed.

#### Change

Delete `packages/plexus/.eslintrc.js` and add a `packages/plexus/eslint.config.js` in flat config format,
or extend the root config to cover plexus explicitly. The minimal addition to the root `eslint.config.js` is
pointing the TypeScript parser at `packages/plexus/tsconfig.json` (already done via the glob pattern
`'./packages/*/tsconfig.json'` in `parserOptions.project`).

If plexus needs package-specific overrides (it currently only sets `@typescript-eslint/recommended` and
`prettier` for TS files, which the root config already provides), the `.eslintrc.js` can simply be deleted
with no replacement.

Similarly, `packages/jaeger-ui/.eslintrc.js` declares globals for Vite `define` constants — these are
already declared in the root `eslint.config.js` `commonGlobals`. The `packages/jaeger-ui/.eslintrc.js` can
be deleted.

---

### 4. TypeScript Config Simplification

#### Current dual-tsconfig in `jaeger-ui`

The reason `packages/jaeger-ui/tsconfig.lint.json` exists is that:

- Vite requires `isolatedModules: true` for correct behavior.
- `tsc --build` (project references) requires `composite: true` and `isolatedModules: false`.

With Vitest, the test runner uses Vite's transform pipeline. `isolatedModules` is no longer a Vite runtime
constraint for the testing workflow. However, the root `tsconfig.json` uses project references for `tsc
--build`, which still applies.

**Possible simplification**: Move `composite: true` and `outFile: "index.d.ts"` into the main
`packages/jaeger-ui/tsconfig.json` and remove `tsconfig.lint.json`. The root `tsconfig.json` reference would
point directly to `packages/jaeger-ui/tsconfig.json`.

This needs to be validated — see [Unknown 1](#unknown-1-tsconfig-consolidation----removing-tsconfiglintjson).

---

### 5. CI Workflow Changes

#### `.github/workflows/lint-build.yml`

No structural changes needed. The `npm run build` command continues to invoke Vite for both packages. The
`depcheck` step will need its configuration updated to remove references to Webpack/Babel packages that are
being deleted. Check `scripts/run-depcheck.sh` for any hardcoded Babel/Webpack allowlists.

#### `.github/workflows/unit-tests.yml`

`npm run coverage` invokes the per-workspace `coverage` scripts. Under Vitest this becomes `vitest run
--coverage`. The coverage output format (Codecov lcov) is specified in the Vitest config:

```typescript
coverage: {
  reporter: ['text', 'lcov'],
}
```

No changes to the workflow YAML itself are expected; the Codecov upload step consumes
`coverage/lcov.info` which Vitest produces in the same location as Jest.

#### `.github/workflows/check_bundle.yml`

No changes needed — this workflow runs `npm run build` and measures `du -sb packages/jaeger-ui/build`, both
of which are unaffected by switching the test runner.

---

### 6. Documentation Changes

- Update `CLAUDE.md`:
  - Replace references to `babel-transform.js` and `jest` configuration in the Testing section.
  - Replace `npm test -- --testPathPattern=<pattern>` with `npx vitest run <pattern>`.
  - Replace `npm run update-snapshots` guidance.

- Update `README.md` (if it mentions Jest or Babel in the dev setup section).

- Delete or archive `packages/jaeger-ui/test/babel-transform.js` (it has a detailed comment explaining the
  `import.meta` workaround — preserve this context in the ADR or a commit message for future reference).

---

## Unknowns and Experiments

### Unknown 1: tsconfig consolidation — removing `tsconfig.lint.json`

**Risk**: `composite: true` requires `declaration: true` (or `emitDeclarationOnly: true`) and a defined
`outDir`/`outFile`. Folding these into `tsconfig.json` may conflict with Vite's own tsconfig interpretation
(Vite reads `tsconfig.json` for path aliases and plugin resolution, and may warn on unexpected compiler
options).

**Experiment**:
1. In a branch, merge `tsconfig.lint.json` settings into `packages/jaeger-ui/tsconfig.json`.
2. Update the root `tsconfig.json` reference from `packages/jaeger-ui/tsconfig.lint.json` to
   `packages/jaeger-ui/tsconfig.json`.
3. Run `npm run tsc-lint` and `npm run build` in `jaeger-ui` and confirm both pass.
4. Run `npm start` and confirm the Vite dev server does not log tsconfig-related warnings.

**Success criteria**: `tsc --build` at the root succeeds with one tsconfig per package.

---

### Unknown 2: Vitest snapshot compatibility

**Risk**: Vitest's snapshot serializer may produce subtly different output for component snapshots compared to
Jest's `jest-snapshot`. Existing `.snap` files may need to be regenerated even if functionally equivalent.

**Experiment**:
1. Run `vitest run` and observe which snapshot tests fail with "1 snapshot obsolete" vs actual content
   mismatches.
2. Run `vitest run --update` to regenerate snapshots and diff against the originals.

**Success criteria**: Snapshot diffs are limited to whitespace or serializer formatting differences, not
semantic regressions. After update, all snapshot tests pass.

---

### Unknown 3: Vitest jsdom API coverage for existing test setup

**Risk**: The `packages/jaeger-ui/test/jest-per-test-setup.js` mocks several browser APIs (`ResizeObserver`,
`MessageChannel`, `matchMedia`, `requestAnimationFrame`) using `jest.fn()`. Under Vitest these need to be
replaced with `vi.fn()`. The `@testing-library/jest-dom` matchers need the Vitest-compatible import path.

Additionally, the `globalSetup` mechanism differs: Jest's `globalSetup` runs in the Node context before
workers; Vitest's `globalSetup` does the same but the process isolation model differs.

**Experiment**:
1. Port the setup file to `vi.*` APIs and run a representative subset of tests (e.g., Ant Design component
   tests, Redux-connected components) to confirm that mocks behave identically.
2. Verify `process.env.TZ = 'UTC'` propagates correctly under Vitest's globalSetup.

**Success criteria**: All previously-passing tests pass under Vitest without mock-related failures.

---

### Unknown 4: `transformIgnorePatterns` equivalents in Vitest

**Risk**: Jest required explicit `transformIgnorePatterns` to process ESM-only packages in `node_modules`
(`redux-actions`, `d3-zoom`, `d3-selection`, `@jaegertracing/plexus`). Vitest's Vite transform pipeline
handles ESM natively, so these patterns should be unnecessary. However, some packages may have non-standard
package exports or dual-mode CJS/ESM issues that surface differently under Vitest.

**Experiment**:
1. Run the full test suite without any `server.deps.inline` configuration in Vitest.
2. For any package that causes `SyntaxError` or import failures, add it to `server.deps.inline` in the Vitest
   config (this is the Vitest equivalent of `transformIgnorePatterns`).

**Success criteria**: No `SyntaxError: Cannot use import statement in a module` errors. The `import.meta`
Babel workaround for `redux-actions` is confirmed unnecessary.

---

### Unknown 5: `@vitejs/plugin-legacy` interaction with Vitest

**Risk**: `packages/jaeger-ui/vite.config.mts` currently uses `@vitejs/plugin-legacy` to emit a legacy
browser bundle. This plugin does not apply to library builds, and the Vitest environment ignores it. No change
is needed for plexus (library mode doesn't use `plugin-legacy`). However, it is worth verifying whether
`plugin-legacy` interacts with Vitest in unexpected ways during the migration (e.g., it hooks into
`transformIndexHtml` which has no equivalent in Vitest).

**Experiment**: Run `vitest run` with the existing `vite.config.mts` (which includes `plugin-legacy`) and
confirm no errors or unexpected HTML injection.

---

## Consequences

### Positive

- **Fewer dependencies**: Eliminates `webpack`, `webpack-cli`, `webpack-node-externals`, `clean-webpack-plugin`,
  `babel-loader`, `@babel/core`, `@babel/cli`, `@babel/preset-env`, `@babel/preset-react`,
  `@babel/preset-typescript`, `babel-jest`, `jest`, `jest-environment-jsdom`, `jest-junit`, and
  several Babel plugins. Estimated reduction: ~20–25 direct dev dependencies.

- **Single transform pipeline**: Tests run through the same esbuild/oxc pipeline as the production build,
  eliminating the class of bug where a Babel-specific transform masks a runtime error.

- **Faster test execution**: Vitest uses worker threads and Vite's fast transform (esbuild) instead of Jest's
  Babel pipeline. Initial benchmarks on comparable React projects show 2–5× faster cold starts.

- **ESM-native testing**: `import.meta`, top-level `await`, and ESM-only packages work without workarounds.
  The custom `importMetaTransform` Babel plugin is deleted.

- **Simpler plexus**: The entire plexus build pipeline (Babel CLI, Webpack, rimraf, npm-run-all) is
  deleted rather than replaced. Zero tools instead of three.

### Negative / Risks

- **Migration effort**: Vitest is not 100% API-compatible with Jest. While the surface API (`describe`, `it`,
  `expect`, `vi` vs `jest`) is very similar, some Jest-specific matchers, module mocking patterns, or timer
  APIs may require updates.

- **Snapshot churn**: All snapshot files will likely need regeneration, creating a large but mechanical diff.

- **Loss of `jest-junit` XML reports**: CI currently produces JUnit-format XML for test result reporting. The
  Vitest equivalent is `@vitest/reporters` with `junit` reporter. This must be configured before removing
  `jest-junit`.

---

## Migration Order

### Phases vs PRs

The Decision section lists 5 concern areas (phases). These map to more PRs because some phases split
naturally across packages (one PR per package is easier to review), and some have no unknowns and can
ship immediately while others must wait for investigation.

### PR → Unknown dependency table

Each PR is safe to merge into `main` on its own once its blocking unknowns are resolved. PRs with no
blocking unknowns can be opened and merged **right now**, independently of the rest of the migration.

| PR | Description | Blocking unknowns | Can ship |
|----|-------------|-------------------|----------|
| A  | Drop plexus library build (Webpack + Babel CLI + related scripts) | None | Immediately |
| B  | Delete legacy ESLint configs from both packages | None | Immediately |
| C  | Migrate plexus test runner to Vitest | Unknown 3, 4 | After investigation |
| D  | Migrate jaeger-ui test runner to Vitest; remove root-level Babel deps | Unknown 2, 3, 4, 5 | After investigation |
| E  | Consolidate `jaeger-ui` tsconfigs | Unknown 1 | After investigation |
| F  | Update docs and CI | None | After C + D land |

PRs A and B deliver standalone value regardless of whether the Vitest migration ever happens. They
remove dead weight (the plexus build nobody uses, the deprecated ESLint config format) with no
prerequisite work. The Vitest PRs (C, D) can be investigated and developed in parallel with A and B
landing on `main`.

**Root-level Babel cleanup caveat**: The root `package.json` `@babel/cli` and `@babel/core` entries
can only be removed once **both** C and D have landed. Fold that cleanup into PR D.

### Investigation strategy

Unknowns 2–5 all relate to the Vitest migration and can be validated together in a single throwaway
branch: port the test setup for one package, run the full suite, and observe failures. Unknown 1
(tsconfig) is independent and can be tested separately with a one-line `tsconfig.json` edit.

---

## Alternatives Considered

### Keep Jest, drop Webpack only

Migrating just the plexus build to Vite library mode while keeping Jest + Babel for testing would reduce
the number of Babel packages but would leave the most complex part of the Babel setup (the Jest transformer
and the `import.meta` workaround) in place. This is a half-measure that still requires maintaining two
transform pipelines. Rejected in favour of a complete migration.

### Use `@swc/jest` instead of Vitest

SWC-based Jest transformers (`@swc/jest`) are faster than Babel-based ones and would eliminate the Babel
dependency without switching test frameworks. However, they still run in Jest's CommonJS-by-default
environment, keeping the `import.meta` problem. SWC also adds its own configuration surface. Rejected because
Vitest's native ESM support and Vite integration are a cleaner solution.

### Use `jest-vite` / `vitest` for jaeger-ui only, keep webpack for plexus

Plexus is consumed only within this monorepo via a workspace source alias. There is no external consumer
of the built artifacts, making the Webpack + Babel CLI build purely overhead. This option would leave dead
weight in place. Rejected.

---

## References

- [Vitest documentation](https://vitest.dev/)
- [Vitest migration guide from Jest](https://vitest.dev/guide/migration.html)
- `packages/jaeger-ui/test/babel-transform.js` — documents the `import.meta` workaround that this migration
  eliminates
- `packages/plexus/webpack-factory.js` — the Webpack config that this migration replaces
