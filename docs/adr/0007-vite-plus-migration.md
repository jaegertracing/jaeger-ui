# ADR 0007: Migrate to Vite+ (Full Vite Toolchain)

**Status**: Partially Implemented
**Last Updated**: 2026-04-02

---

## TL;DR

Replace the current fragmented toolchain with **Vite+** (`vp` CLI, [viteplus.dev](https://viteplus.dev)) —
a unified, native-performance toolchain that covers building (Rolldown), linting (Oxlint), formatting
(Oxfmt), and testing (Vitest). Once fully rolled out, this migration will replace Webpack, Babel, ESLint,
Prettier, and Jest with a single dependency that has built-in TypeScript support and is not blocked by
`@typescript-eslint` release lag.

---

## Context & Problem

### Current State (after PRs A–H3; only PR G remains)

| Concern          | `packages/jaeger-ui`               | `packages/plexus`                  |
| ---------------- | ---------------------------------- | ---------------------------------- |
| Dev server       | Vite 8                             | n/a                                |
| Production build | Vite 8 (Rolldown engine)           | ✅ dropped                         |
| Testing          | ✅ Vitest 4 (226 files, 2603 tests) | ✅ Vitest 4                       |
| TypeScript       | `tsc` (type-check only, 1 config)  | `tsc` (noEmit, source only)        |
| Linting          | ✅ Oxlint (via `vp lint`)          | ✅ Oxlint (via `vp lint`)          |
| Formatting       | ✅ Oxfmt (via `vp fmt`)            | ✅ Oxfmt (via `vp fmt`)            |

### Pain Points

1. **Node-based linting/formatting is slow**: ESLint + Prettier on a codebase this size takes tens of
   seconds in CI. Oxlint (Rust-based, part of Vite+) is 50–100× faster, reducing lint time to under
   a second.

2. **TypeScript upgrade blocked by `@typescript-eslint`**: `@typescript-eslint/parser` must be updated
   to support each new TypeScript release and typically lags by weeks to months. Oxlint has built-in
   TypeScript support via oxc — no separate parser, no peer-dependency lag. This directly unblocks
   upgrading to TypeScript 6 / TypeScript 7 (Project Corsa).

3. ✅ **Two tsconfig files for jaeger-ui** (resolved in PR E): `tsconfig.json` was used by Vite
   (required `isolatedModules: true`) and a separate `tsconfig.lint.json` was used by `tsc -p` for
   type-checking (`isolatedModules: false`, `noEmit: true`). The split turned out to be unnecessary —
   Vite uses esbuild for transpilation and ignores `isolatedModules` in tsconfig entirely. The files
   have been merged into a single `tsconfig.json`.

4. **Jest + Babel test runner diverges from the build pipeline**: Jest uses `babel-jest` + a custom Babel
   plugin to work around `import.meta.NODE_ENV` in ESM-only packages (see
   `packages/jaeger-ui/test/babel-transform.js`). Vitest runs through the same Vite transform pipeline
   as the production build, eliminating this class of workaround.

### Why "Vite+"?

"Vite+" refers specifically to the `vp` CLI from [viteplus.dev](https://viteplus.dev) — a batteries-included
toolchain that wraps:

- **Vite / Rolldown** — dev server and production builds (already in use)
- **Oxlint** — replaces ESLint; native TypeScript rules, plus React hooks via `eslint-plugin-react-x` (jsPlugin)
- **Oxfmt** — replaces Prettier; native formatting
- **Vitest** — replaces Jest; shares the Vite transform pipeline

The key advantage over assembling these tools individually is that Vite+ internalises plugin compatibility,
so TypeScript upgrades do not require waiting for `@typescript-eslint` to catch up.

---

## Decision

Migrate the monorepo to Vite+ in phases:

1. ✅ **Drop the `packages/plexus` library build** — Webpack, Babel CLI, and all associated config removed.
2. ✅ **Consolidate legacy ESLint configs** — delete per-package `.eslintrc.*` files; root `eslint.config.js`
   now covers both packages. This is preparatory cleanup before replacing ESLint with Oxlint.
3. ✅ **Replace ESLint with Oxlint** — `@typescript-eslint` removed; TypeScript 6/7 upgrade now unblocked.
4. ✅ **Replace Prettier with Oxfmt** — `prettier` removed; `oxfmt --migrate=prettier` migrated the config.
5. ✅ **Upgrade TypeScript** — upgraded to 6.0.2; `moduleResolution` switched to `"bundler"`.
6. ✅ **Consolidate jaeger-ui tsconfigs** — `tsconfig.lint.json` deleted; `tsconfig.json` is the single config.
7. ✅ **Replace Jest + Babel with Vitest** — plexus done ([#3690](https://github.com/jaegertracing/jaeger-ui/pull/3690)); jaeger-ui done ([#3695](https://github.com/jaegertracing/jaeger-ui/pull/3695): H1 rename, H2 prep, H3 switch: 226 test files, 2603 tests passing).

---

## Detailed Change Plan

### ✅ 1. `packages/plexus` — Drop the Library Build ([#3677](https://github.com/jaegertracing/jaeger-ui/pull/3677), [#3680](https://github.com/jaegertracing/jaeger-ui/pull/3680))

`@jaegertracing/plexus` is no longer published to npm. The only consumer is `jaeger-ui`, which resolves
the package via a workspace source alias (`@jaegertracing/plexus` → `../plexus/src`) and never touches
the built `lib/` or `dist/` artifacts. The entire build pipeline — Babel CLI, Webpack, rimraf — existed
solely to produce output that no one uses.

**Implemented in full.** Webpack and Babel CLI are deleted; the `plexus` tsconfig is a pure type-check
config; `tsc-lint` resolves plexus types directly from source via `paths`.

#### ✅ 1a. Update `packages/plexus/package.json`

- ✅ **Removed** from `devDependencies` (build-only packages):
  - `webpack`, `webpack-cli`, `webpack-node-externals`, `clean-webpack-plugin`, `babel-loader`
  - `babel-plugin-transform-react-remove-prop-types`
  - `@babel/plugin-syntax-dynamic-import`, `@babel/plugin-transform-class-properties`
  - `rimraf`, `npm-run-all2`

- **Remaining Babel deps** (`@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript`,
  `@babel/plugin-transform-private-methods`, `babel-jest`) are used solely by the Jest test runner
  via `packages/plexus/test/babel-transform.js`. They will be removed in PR F when the plexus test
  runner is migrated to Vitest.

- ✅ **Replaced `build` script** (5-step Babel+Webpack pipeline) with `tsc --noEmit`. Removed
  `prepublishOnly` and all `_tasks/*` scripts.

- ✅ **Removed `files`** array — dead weight for an unpublished package.

- ✅ **Added `private: true`** — prevents accidental publish to npm.

- ✅ **Deleted files**:
  - `packages/plexus/babel.config.js`
  - `packages/plexus/webpack.umd.config.js`
  - `packages/plexus/webpack-factory.js`

- ✅ **Updated `scripts/generateDepcheckrcPlexus.js`**: removed the `babel.config.js` import and
  the code that processed it.

- ✅ **Updated root `package.json` `prepare` script**: removed the `prepublishOnly` invocation.

#### ✅ Prop-types removal (non-issue)

`packages/plexus/babel.config.js` applied `babel-plugin-transform-react-remove-prop-types`. Audit
found **no `propTypes` declarations** anywhere in `packages/plexus/src/`. The plugin was a no-op.
No action needed.

#### ✅ 1b. Update `packages/plexus/tsconfig.json`

The tsconfig is now a pure type-check config — `emitDeclarationOnly`, `outDir`, `rootDir`, `composite`,
and `declaration` are all removed. `noEmit: true` replaces them.

The prerequisite for this change was eliminating jaeger-ui's dependency on `lib/*.d.ts` for module
resolution. This is done via `paths` in `packages/jaeger-ui/tsconfig.json`:

```json
"paths": {
  "@jaegertracing/plexus": ["../plexus/src/index.ts"],
  "@jaegertracing/plexus/lib/*": ["../plexus/src/*"]
}
```

With this mapping, `@jaegertracing/plexus/lib/types` → `packages/plexus/src/types/index.ts` at
type-check time, and `lib/` never needs to exist. The Jest `moduleNameMapper` in
`packages/jaeger-ui/package.json` applies the equivalent mapping at test time.

`tsc-lint` is updated to run `tsc -p` for each package directly instead of `tsc --build` (project
references required `composite: true` which conflicts with `noEmit: true` and cross-package `paths`):

```json
"tsc-lint": "tsc -p packages/jaeger-ui/tsconfig.json && tsc -p packages/plexus/tsconfig.json"
```

`packages/jaeger-ui/tsconfig.json` is also simplified — `composite`, `outFile`, and the plexus
`references` entry are all removed. `noEmit: true` and `isolatedModules: false` are set directly
(see PR E — Vite ignores these options; it uses esbuild for transpilation).

`"main": "lib/index.js"` in `packages/plexus/package.json` was dead weight and was removed in PR E.

---

### ✅ 2. ESLint Config Consolidation — preparatory cleanup ([#3681](https://github.com/jaegertracing/jaeger-ui/pull/3681))

**Implemented in full.** All three legacy ESLint config files are deleted; the root `eslint.config.js`
now covers both packages. This is a preparatory step — the consolidated flat config will be the thing
replaced by Oxlint in PR C.

#### ✅ Changes made

- Deleted `packages/plexus/.eslintrc.js` — it only set `@typescript-eslint/recommended` and `prettier`
  for TS files, both already provided by the root flat config via the `'./packages/*/tsconfig.json'` glob.
- Deleted `packages/jaeger-ui/.eslintrc.js` — it declared globals for Vite `define` constants already
  present in `commonGlobals` in the root flat config.
- Deleted `packages/jaeger-ui/src/demo/.eslintrc` — obsolete demo override with no active effect.
- Extended the root `eslint.config.js` TypeScript pattern from `**/*.{ts,tsx}` to `**/*.{ts,tsx,mts}` so
  `vite.config.mts` is linted under the same TypeScript rules.
- Added a `project: false` override for `packages/*/vite.config.mts` (not included in any tsconfig project).
- Removed stale `/* eslint-disable import/no-extraneous-dependencies */` from `vite.config.mts` (plugin is
  now named `import-x/`, and the rule is already `'off'` globally).
- Removed `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier` from
  `packages/plexus/package.json` — these were only referenced by the deleted `.eslintrc.js`.

Result: 0 ESLint errors (250 pre-existing warnings, all `@typescript-eslint/no-explicit-any` or similar).

---

### ✅ 3. Replace ESLint with Oxlint (PRs C1)

Oxlint is the linting component of the Vite+ toolchain. It is Rust-based and has no dependency on
`@typescript-eslint`, directly unblocking TypeScript 6/7 upgrades.

#### ✅ Approach: run Oxlint in parallel before replacing ESLint

Rather than replacing ESLint in a single step, PR C1 is split into two phases:

**✅ Phase 1 — parallel run ([#3682](https://github.com/jaegertracing/jaeger-ui/pull/3682)):**
- Add `vite-plus` to root devDependencies (which brings Oxlint transitively).
- Add an `oxlint` config (`.oxlintrc.json`) that mirrors the currently active ESLint rules.
- Add an `npm run oxlint` script that runs non-blocking alongside `npm run eslint` in CI.
- Compare Oxlint and ESLint output side by side.

**✅ Phase 2 — cutover ([#3684](https://github.com/jaegertracing/jaeger-ui/pull/3684), once Phase 1 validates parity):**
- Remove `eslint`, `eslint-plugin-*`, `@typescript-eslint/*` from devDependencies.
- Remove `eslint.config.js`.
- Update CI `lint` script, `lint-staged`, and `husky` hooks to use Oxlint only.
- Update TypeScript to 6.x (PR D).

#### ✅ Success criteria for Phase 1

1. **Rule coverage**: every rule currently set to `error` or `warn` in `eslint.config.js` has a
   documented Oxlint equivalent — or a deliberate decision to drop it with written justification.
2. **Warning count parity**: Oxlint warning count is within the same order of magnitude as ESLint's
   current ~250 warnings. A significantly lower count is a signal that rules are missing, not that
   the code improved. The bulk of current warnings are `@typescript-eslint/no-explicit-any`;
   the Oxlint equivalent `typescript/no-explicit-any` must fire on the same sites.
3. **Error parity**: the rules currently set to `error` — `react-x/rules-of-hooks`,
   `react-x/exhaustive-deps`, `jest/no-focused-tests`, `jest/no-identical-title`,
   `@typescript-eslint/no-empty-object-type` — must all be caught by Oxlint equivalents.
4. **No significant false positives**: Oxlint should not flag substantially more than ESLint;
   a much higher count signals the config needs tuning before cutover.
5. **Performance**: Oxlint completes in under 1 second (verify the claimed 50–100× speedup).

See [Unknown 2](#unknown-2-oxlint-rule-coverage) for the rule mapping table.

---

### ✅ 4. Replace Prettier with Oxfmt (PR C2 — [#3686](https://github.com/jaegertracing/jaeger-ui/pull/3686))

**Implemented in full.**

- Ran `oxfmt --migrate=prettier` to generate `.oxfmtrc.json` from the existing `prettier` config in `package.json`. All options mapped 1:1 (`arrowParens`, `printWidth`, `proseWrap`, `singleQuote`, `trailingComma`). Ignore patterns migrated from `.prettierignore` → `ignorePatterns` in `.oxfmtrc.json`.
- Removed `prettier` from `devDependencies`.
- Removed `prettier` config block from `package.json`.
- Deleted `.prettierignore` (replaced by `ignorePatterns` in `.oxfmtrc.json`).
- Updated scripts: `prettier` → `vp fmt`, `prettier-lint` → `fmt-lint` (using `vp fmt --check`).
- Updated `lint-staged` to use `vp fmt` instead of `prettier --write`.
- Output parity: only 1 file had a difference (trailing space in a comment line in `TraceDiff.test.js`) — fixed.

---

### ✅ 5. Upgrade TypeScript (PR D — [#3688](https://github.com/jaegertracing/jaeger-ui/pull/3688))

Once `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` are removed from the dependency
tree (after PR C), TypeScript can be upgraded freely without waiting for plugin compatibility.

Upgraded TypeScript from 5.9.3 to 6.0.2. Two fixes required:

- Root `tsconfig.json`: changed `"moduleResolution": "node"` → `"moduleResolution": "bundler"`.
  TypeScript 6.0 deprecates `"node"` (alias `"node10"`) as it does not support the modern
  `"exports"` field in `package.json`. `"bundler"` accurately reflects how Vite resolves modules.
- `packages/plexus/tsconfig.json`: added `"types": ["jest"]` because TypeScript 6.0 tightened
  `@types` auto-discovery under `moduleResolution: "bundler"` — Jest globals were no longer found
  automatically. (Later changed to `"types": ["vitest/globals"]` in PR F when plexus migrated to Vitest.)

---

### ✅ 6. TypeScript Config Simplification (PR E — [#3689](https://github.com/jaegertracing/jaeger-ui/pull/3689))

**Implemented.** `packages/jaeger-ui/tsconfig.lint.json` is deleted. Its settings (`isolatedModules: false`,
`noEmit: true`, `files` list) are merged directly into `packages/jaeger-ui/tsconfig.json`. The `tsc-lint`
script now points at `tsconfig.json` for both packages.

Key finding: Vite does not enforce or care about `isolatedModules` in tsconfig at build time — it uses
esbuild for transpilation, not tsc. Setting `isolatedModules: false` in `tsconfig.json` has no effect on
the build or dev server. The concern in Unknown 1 was unfounded.

Also removed the stale `"main": "lib/index.js"` field from `packages/plexus/package.json` (dead weight
since the library build was dropped in PR A).

---

### 7. CI Workflow Changes

#### `.github/workflows/lint-build.yml`

The `lint` script will change from `eslint` + `prettier` to `vp check` (or separate `oxlint` + `oxfmt`
invocations). The `depcheck` step will need its configuration updated to remove references to ESLint/Prettier
packages being deleted.

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

No changes needed — this workflow runs `npm run build` and measures `du -sb packages/jaeger-ui/build`,
both of which are unaffected by switching the lint/test tooling.

---

### ✅ 8. Both Packages — Replace Jest + Babel with Vitest (PR F)

**Done.** `packages/plexus` migrated in [#3690](https://github.com/jaegertracing/jaeger-ui/pull/3690); `packages/jaeger-ui` migrated in [#3695](https://github.com/jaegertracing/jaeger-ui/pull/3695) (226 test files, 2603 tests).

#### plexus migration (✅ complete in [#3690](https://github.com/jaegertracing/jaeger-ui/pull/3690))

- Added `vitest`, `@vitest/coverage-v8`, `jsdom` to devDependencies; removed `jest`, `babel-jest`,
  `jest-environment-jsdom`, all `@babel/*` packages, `@types/jest`.
- Added `packages/plexus/vitest.config.ts` with `environment: 'jsdom'`, `globals: true`,
  `moduleNameMapper` for CSS, and coverage settings.
- Replaced `packages/plexus/test/jest-per-test-setup.js` with `test/vitest-setup.ts`:
  - Imports `@testing-library/jest-dom/vitest` for matcher compatibility.
  - Sets `(global as any).jest = vi` so existing `jest.fn()` / `jest.clearAllMocks()` calls in test
    files continue to work **without rewriting them**.
- `jest.mock(` calls (4 test files + demo) renamed to `vi.mock(` — the one API that cannot be aliased
  because Vitest's transform hoists `vi.mock(` patterns statically before imports, whereas `jest.mock(`
  is left in place and never hoisted.
- Six test files renamed `.test.js` → `.test.jsx` so Vite/esbuild parses their JSX syntax correctly.
- Mock factory functions updated for Vitest ESM:
  - All default-exported modules must be returned as `{ default: MockComponent }` inside factory bodies.
  - `jest.requireActual()` replaced with `async vi.importActual()` (async in Vitest).
  - Constructor mocks passed to `vi.fn()` must use regular `function` expressions, not arrow functions
    (Vitest 4.x rejects arrow functions called with `new`).
  - `vi.fn()` (not the `jest` alias) must be used inside `vi.mock()` factory bodies — the alias is not
    available in hoisted factory scope.
- Deleted `test/babel-transform.js` and `test/generic-file-transform.js` (no longer needed).

#### ✅ Lessons learned (applicable to jaeger-ui migration)

| Situation | Vitest behaviour | Action required |
|-----------|-----------------|-----------------|
| `jest.fn()`, `jest.clearAllMocks()`, etc. | Not available by default | Alias: `global.jest = vi` in setup file |
| `jest.mock()` / `jest.unmock()` | Not hoisted by transform | Rename to `vi.mock()` / `vi.unmock()` |
| `jest.requireActual(mod)` | Synchronous, CommonJS | Replace with `await vi.importActual(mod)` (async factory) |
| Default-export mocks | Factory can return component directly | Must return `{ default: MockComponent }` |
| Constructor mocks via `mockImplementation` | Arrow functions fail with `new` | Use regular `function() { return {...}; }` |
| `vi.fn()` inside `vi.mock()` factory | `jest` alias not in scope | Use `vi.fn()` explicitly |
| JSX in `.js` test files | Vite/esbuild skips JSX transform for `.js` | Rename to `.jsx` |
| `require()` inside test scope | Unavailable in ESM | Use top-level ES `import` |

#### ✅ jaeger-ui migration (complete in [#3695](https://github.com/jaegertracing/jaeger-ui/pull/3695))

226 test files, 2603 tests — all passing. All four unknowns (3–6) were non-issues in practice.
`packages/jaeger-ui/test/jest-per-test-setup.js` was replaced by `test/vitest-setup.ts` and subsequently
deleted.

---

### ✅ 9. `packages/jaeger-ui` — Migrate Jest → Vitest (PRs H1–H3)

The jaeger-ui package has 207 test files (~2600 tests). Migration is split into three incremental PRs
so each is reviewable in isolation and CI catches regressions early.

#### ✅ PR H1 — Rename `.test.js` → `.test.jsx` ([#3691](https://github.com/jaegertracing/jaeger-ui/pull/3691))

121 of the 207 test files contained JSX but had a `.js` extension. Vite/esbuild does not parse JSX in
`.js` files, so these must be renamed before the Vitest switch. Pure `git mv` with zero logic changes.

#### ✅ PR H2a — Replace `require()` in test bodies with static `import` ([#3692](https://github.com/jaegertracing/jaeger-ui/pull/3692))

`require()` is unavailable in Vitest's native ESM test scope. Converted 9 files.

Three files were **excluded** — they use `require()` after `jest.resetModules()` or inside runtime
`jest.mock()` calls within `it` blocks (not hoisted). These use a module re-isolation pattern that
requires `vi.resetModules()` + `await import()` and will be handled in H3:
- `utils/prefix-url.test.js`
- `utils/tracking/ga-coverage.test.js`
- `prefix-url-coverage.test.js`

#### ✅ PR H2b — Replace arrow function constructors with regular functions ([#3693](https://github.com/jaegertracing/jaeger-ui/pull/3693))

`mockImplementation(() => ({...}))` fails when the mock is called with `new` in Vitest 4.x.
Replaced with `mockImplementation(function() { return {...}; })` — safe under Jest too.

Six files had constructor mocks (identified by checking which `mockImplementation` targets are
called with `new` in production code): `readJsonFile.test.js` (FileReader ×3),
`Monitor/ServicesView/index.test.jsx` (ResizeObserver), `TraceDiff/TraceDiff.test.jsx` (ResizeObserver),
`DeepDependencies/Graph/index.test.jsx` (LayoutManager), `TracePage/index.test.jsx` (ScrollManager ×3),
`TracePage/TraceGraph/TraceGraph.test.jsx` (MockLayoutManager).

#### ✅ PR H2c — Introduce `mockDefault` helper in affected mock factories ([#3694](https://github.com/jaegertracing/jaeger-ui/pull/3694))

In Vitest ESM, `vi.mock()` factories must return `{ default: MockComponent }` for default-exported
modules; Jest CJS interop does not require this. A helper is introduced so the flip in H3 is a
single-line change rather than touching every factory:

```js
// test/jest-per-test-setup.js (now deleted; replaced by test/vitest-setup.ts in H3)
global.mockDefault = mod => mod;  // H3: changed to mod => ({ default: mod })
```

All ~33 `jest.mock()` factories that return a function/component directly have been wrapped:

```js
jest.mock('./Foo', () => mockDefault(function MockFoo() { return <JSX/>; }));
jest.mock('./Bar', () => mockDefault(() => <JSX/>));
jest.mock('./Baz', () => mockDefault(jest.fn(() => <JSX/>)));
```

In H3, `mockDefault` body flipped to `mod => ({ default: mod })` inside `test/vitest-setup.ts`.

#### ✅ PR H3 — The actual switch ([#3695](https://github.com/jaegertracing/jaeger-ui/pull/3695))

Changes that can only land together with the Vitest infrastructure switch:

| Change | Scope | Why it can't be pre-done |
|--------|-------|--------------------------|
| `jest.mock(` → `vi.mock(` | ~99 files | Jest's Babel transform only hoists `jest.mock(`; renaming early breaks tests |
| `mockDefault` body: `mod => mod` → `mod => ({ default: mod })` in `test/vitest-setup.ts` | 1 line in setup | Prepared in H2; only the implementation flips here |
| `jest.requireActual()` → `async vi.importActual()` | ~23 files | Async factory semantics only work reliably in Vitest |
| Add `vitest.config.ts` + `test/vitest-setup.ts` (with `global.jest = vi` alias); delete `jest-per-test-setup.js` | infrastructure | — |
| Update `packages/jaeger-ui/package.json` scripts + deps | infrastructure | — |
| Update `scripts/generateDepcheckrcJaegerUI.js` | infrastructure | — |

---

### 10. Documentation Changes (PR G)

- Update `CLAUDE.md`:
  - Replace ESLint/Prettier commands with `vp check` equivalents.
  - Replace Jest/`npm test` references with Vitest commands.
  - Replace `npm test -- --testPathPattern=<pattern>` with `npx vitest run <pattern>`.
  - Replace `npm run update-snapshots` guidance.

- Update `README.md` (if it mentions Jest or Babel in the dev setup section).

- Delete or archive `packages/jaeger-ui/test/babel-transform.js` (it has a detailed comment explaining the
  `import.meta` workaround — preserve context in the ADR or a commit message).

---

## Unknowns and Experiments

### ✅ Unknown 1: tsconfig consolidation — removing `tsconfig.lint.json`

**Resolved.** `isolatedModules: false` and `noEmit: true` merged into `tsconfig.json`. Vite build and
`tsc-lint` both pass. Vite does not enforce or interpret `isolatedModules` — it uses esbuild for
transpilation, so the tsconfig value has no effect on builds or the dev server.

---

### ✅ Unknown 2: Oxlint rule coverage

**Risk**: Oxlint may not have direct equivalents for all currently active ESLint rules.

**Active ESLint rules to map** (from `eslint.config.js`, excluding `'off'` entries):

| ESLint rule | Severity | Oxlint equivalent | Status |
|-------------|----------|-------------------|--------|
| `react-x/rules-of-hooks` | error | `react-x/rules-of-hooks` (via jsPlugin) | ✅ |
| `react-x/exhaustive-deps` | error | `react-x/exhaustive-deps` (via jsPlugin) | ✅ |
| `jest/no-focused-tests` | error | `jest/no-focused-tests` | ✅ |
| `jest/no-identical-title` | error | `jest/no-identical-title` | ✅ |
| `jest/no-disabled-tests` | warn | `jest/no-disabled-tests` | ✅ |
| `@typescript-eslint/no-explicit-any` | warn | `typescript/no-explicit-any` | ✅ ~211 hits (vs ~250 in ESLint) |
| `@typescript-eslint/no-unused-vars` | warn | `no-unused-vars` | ✅ |
| `@typescript-eslint/no-use-before-define` | warn | `no-use-before-define` | ✅ |
| `@typescript-eslint/no-redeclare` | warn | `no-redeclare` | ✅ |
| `@typescript-eslint/no-shadow` | warn | `no-shadow` | ✅ |
| `@typescript-eslint/no-require-imports` | warn | `typescript/no-require-imports` | ✅ |
| `@typescript-eslint/no-restricted-types` | warn | `typescript/no-restricted-types` | ✅ |
| `@typescript-eslint/no-unsafe-function-type` | warn | `typescript/no-unsafe-function-type` | ✅ |
| `@typescript-eslint/no-wrapper-object-types` | warn | `typescript/no-wrapper-object-types` | ✅ |
| `@typescript-eslint/ban-ts-comment` | warn | `typescript/ban-ts-comment` | ✅ |
| `@typescript-eslint/no-useless-constructor` | warn | `no-useless-constructor` | ✅ |
| `@typescript-eslint/no-empty-object-type` | error | `typescript/no-empty-object-type` | ✅ |
| `prettier/prettier` | error | dropped — Oxfmt handles formatting (PR C2) | — |

**Parallel run results** (Phase 1 complete):
- ESLint: 0 errors, 250 warnings
- Oxlint: 0 errors, 394 warnings (144 extra from `correctness: warn` — mostly jest correctness
  rules like `no-conditional-expect`, `expect-expect`, `valid-title` that ESLint wasn't checking)
- One `no-control-regex` false positive in `vite.config.mts` suppressed with an inline disable comment
  (`\0` is intentional — strips Rolldown's null-byte module prefix)
- `.cjs` files added to ignore patterns (were never linted by ESLint either)

**Success criteria**: All met. Ready to proceed to Phase 2 (cutover) in a follow-up PR.

---

### ✅ Unknown 3: Vitest snapshot compatibility

**Status**: Resolved. One snapshot file (`PathElem.test.js.snap`) had a minor format difference and was
regenerated. All other snapshot tests passed without update. No semantic regressions.

---

### ✅ Unknown 4: Vitest jsdom API coverage for existing test setup

**Status**: Resolved. The `global.jest = vi` alias in `test/vitest-setup.ts` covers all `jest.fn()` /
`jest.clearAllMocks()` call sites. Browser API mocks (`ResizeObserver`, `MessageChannel`, `matchMedia`,
`requestAnimationFrame`) work as expected. `@testing-library/jest-dom/vitest` import confirmed correct.
All 226 test files pass.

---

### ✅ Unknown 5: `transformIgnorePatterns` equivalents in Vitest

**Status**: Resolved. No `server.deps.inline` configuration was needed. `redux-actions`, `d3-zoom`,
`d3-selection`, and `@jaegertracing/plexus` all work without special handling under Vitest's native ESM
pipeline. The `import.meta` Babel workaround is confirmed eliminated.

---

### ✅ Unknown 6: `@vitejs/plugin-legacy` interaction with Vitest

**Status**: Resolved. `@vitejs/plugin-legacy` is harmless under Vitest — it only affects
`transformIndexHtml` which Vitest never invokes. No errors or unexpected behaviour observed.

---

## Consequences

### Positive (full migration)

- **Single dependency**: Replace `eslint`, `prettier`, `typescript-eslint`, `babel`, `jest` and ~25 related
  packages with `vite-plus`.
- **Native performance**: Oxlint reduces lint time from ~30–60 s to under 1 s. Rolldown build times drop
  significantly vs Webpack.
- **No TypeScript upgrade lag**: Oxlint has built-in TypeScript support via oxc; TypeScript 6/7 upgrades
  are no longer blocked by `@typescript-eslint` release schedule.
- **Unified transform pipeline**: Vitest runs tests through the same Vite/Rolldown pipeline as the
  production build, eliminating the `importMetaTransform` Babel hack.
- **Already mostly done**: The plexus build pipeline is gone (PR A), legacy ESLint configs are gone (PR B).

### Negative / Risks

- **Migration effort**: Vitest migration requires updating the test suite API, potentially regenerating
  snapshots, and validating Unknowns 3–6.
- **Oxlint rule parity**: Some ESLint rules may not have direct Oxlint equivalents — needs investigation
  (Unknown 2).

---

## Migration Order

### PR → Unknown dependency table

| PR | Description | Blocking unknowns | Can ship |
|----|-------------|-------------------|----------|
| ✅ A | Drop plexus library build; simplify plexus tsconfig; paths-based type resolution ([#3677](https://github.com/jaegertracing/jaeger-ui/pull/3677), [#3680](https://github.com/jaegertracing/jaeger-ui/pull/3680)) | None | Done |
| ✅ B | Delete legacy ESLint configs from both packages — prep for Oxlint ([#3681](https://github.com/jaegertracing/jaeger-ui/pull/3681)) | None | Done |
| ✅ C1 | Replace ESLint with Oxlint ([#3682](https://github.com/jaegertracing/jaeger-ui/pull/3682), [#3684](https://github.com/jaegertracing/jaeger-ui/pull/3684)) | Unknown 2 | Done |
| ✅ C2 | Replace Prettier with Oxfmt ([#3686](https://github.com/jaegertracing/jaeger-ui/pull/3686)) | None | Done |
| ✅ D  | Upgrade TypeScript to 6.0.2 ([#3688](https://github.com/jaegertracing/jaeger-ui/pull/3688)) | None | Done |
| ✅ E  | Consolidate `jaeger-ui` tsconfigs; remove `main` from plexus package.json ([#3689](https://github.com/jaegertracing/jaeger-ui/pull/3689)) | Unknown 1 | Done |
| ✅ F | Migrate Jest → Vitest in both packages; remove Babel test deps ([#3690](https://github.com/jaegertracing/jaeger-ui/pull/3690) plexus, [#3695](https://github.com/jaegertracing/jaeger-ui/pull/3695) jaeger-ui) | Unknowns 3, 4, 5, 6 | Done |
| ✅ H1 | Rename `.test.js` → `.test.jsx` in jaeger-ui (121 files, pure rename) ([#3691](https://github.com/jaegertracing/jaeger-ui/pull/3691)) | None | Done |
| ✅ H2a | Replace `require()` in test bodies with static `import` ([#3692](https://github.com/jaegertracing/jaeger-ui/pull/3692)) | None | Done |
| ✅ H2b | Replace arrow function constructors with regular functions (6 files) ([#3693](https://github.com/jaegertracing/jaeger-ui/pull/3693)) | None | Done |
| ✅ H2c | Introduce `mockDefault` helper in affected mock factories ([#3694](https://github.com/jaegertracing/jaeger-ui/pull/3694)) | None | Done |
| ✅ H3 | Vitest switch for jaeger-ui ([#3695](https://github.com/jaegertracing/jaeger-ui/pull/3695)) | Unknowns 3, 4, 5, 6 | Done |
| G  | Update CLAUDE.md, README, CI workflows | None | After H3 |
| ✅ I1 | Remove `__esModule: true` from mock factories; drop redundant `mockDefault(jest.fn())` factories ([#3699](https://github.com/jaegertracing/jaeger-ui/pull/3699)) | None | Done |

### Investigation strategy

- **Unknown 2** (Oxlint rules): ✅ Resolved — parallel run completed; rule coverage confirmed; ESLint removed.
- **Unknown 1** (tsconfig): ✅ Resolved — tsconfig files merged; `tsc-lint` and Vite build both pass.
- **Unknowns 3–6** (Vitest): ✅ Fully resolved via plexus (#3690) and jaeger-ui (#3695) migrations. All four unknowns were non-issues in practice.

---

## Alternatives Considered

### Keep ESLint + Prettier permanently

Rejected. `@typescript-eslint` creates a recurring TypeScript upgrade blocker. Oxlint removes this
entirely while providing faster feedback.

### Use `@swc/jest` instead of Vitest

SWC-based Jest transformers are faster than Babel-based ones and would eliminate the separate Babel
test config. However, they still run in Jest's CommonJS-by-default environment, keeping the `import.meta`
problem. Not pursued as a stepping stone — Vitest is the right destination.

### Use Vite library mode for plexus instead of dropping the build

Plexus is consumed only within this monorepo via a workspace source alias. There is no external consumer
of the built artifacts, making any build pipeline purely overhead. Dropping the build entirely (PR A) is
simpler than replacing Webpack with Vite library mode.

---

## References

- [Vite+ documentation](https://viteplus.dev)
- `packages/jaeger-ui/test/babel-transform.js` — documents the `import.meta` workaround that Vitest
  eliminates
- `packages/plexus/webpack-factory.js` — the Webpack config that this migration replaced (now deleted)
