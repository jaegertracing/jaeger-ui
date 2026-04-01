# ADR 0007: Migrate to Vite+ (Full Vite Toolchain)

**Status**: Partially Implemented
**Last Updated**: 2026-04-01

---

## TL;DR

Replace the current fragmented toolchain with **Vite+** (`vp` CLI, [viteplus.dev](https://viteplus.dev)) —
a unified, native-performance toolchain that covers building (Rolldown), linting (Oxlint), formatting
(Oxfmt), and testing (Vitest). This eliminates Webpack, Babel, ESLint, Prettier, and Jest in favour of a
single dependency with built-in TypeScript support that is not blocked by `@typescript-eslint` release lag.

---

## Context & Problem

### Current State (after PRs A and B)

| Concern          | `packages/jaeger-ui`               | `packages/plexus`                  |
| ---------------- | ---------------------------------- | ---------------------------------- |
| Dev server       | Vite 8                             | n/a                                |
| Production build | Vite 8 (Rolldown engine)           | ✅ dropped                         |
| Testing          | Jest 30 + `babel-jest`             | Jest 30 + `babel-jest`             |
| TypeScript       | `tsc` (type-check only, 2 configs) | `tsc` (noEmit, source only)        |
| Linting          | ESLint 10 (flat config)            | ESLint 10 (flat config)            |
| Formatting       | Prettier                           | Prettier                           |

### Pain Points

1. **Node-based linting/formatting is slow**: ESLint + Prettier on a codebase this size takes tens of
   seconds in CI. Oxlint (Rust-based, part of Vite+) is 50–100× faster, reducing lint time to under
   a second.

2. **TypeScript upgrade blocked by `@typescript-eslint`**: `@typescript-eslint/parser` must be updated
   to support each new TypeScript release and typically lags by weeks to months. Oxlint has built-in
   TypeScript support via oxc — no separate parser, no peer-dependency lag. This directly unblocks
   upgrading to TypeScript 6 / TypeScript 7 (Project Corsa).

3. **Two tsconfig files for jaeger-ui**: `tsconfig.json` (used by Vite, requires `isolatedModules: true`)
   and `tsconfig.lint.json` (used by `tsc -p` for type-checking, uses `isolatedModules: false` and
   `noEmit: true`). The split exists because Vite requires `isolatedModules: true` but full cross-file
   type checking requires `false`. Vitest eliminates `isolatedModules` as a constraint.

4. **Jest + Babel test runner diverges from the build pipeline**: Jest uses `babel-jest` + a custom Babel
   plugin to work around `import.meta.NODE_ENV` in ESM-only packages (see
   `packages/jaeger-ui/test/babel-transform.js`). Vitest runs through the same Vite transform pipeline
   as the production build, eliminating this class of workaround.

### Why "Vite+"?

"Vite+" refers specifically to the `vp` CLI from [viteplus.dev](https://viteplus.dev) — a batteries-included
toolchain that wraps:

- **Vite / Rolldown** — dev server and production builds (already in use)
- **Oxlint** — replaces ESLint; built-in rules for TypeScript, React hooks, and more
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
3. **Replace ESLint with Oxlint** — unblocks TypeScript 6/7 upgrade.
4. **Replace Prettier with Oxfmt** — independent of 3; no urgency.
5. **Upgrade TypeScript** — once `@typescript-eslint` is no longer in the dependency tree.
6. **Consolidate jaeger-ui tsconfigs** — collapse `tsconfig.lint.json` into `tsconfig.json` (easier after
   Vitest removes the `isolatedModules` constraint).
7. **Replace Jest + Babel with Vitest** — deferred; significant migration effort, but the correct
   long-term direction.

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
"tsc-lint": "tsc -p packages/jaeger-ui/tsconfig.lint.json && tsc -p packages/plexus/tsconfig.json"
```

`packages/jaeger-ui/tsconfig.lint.json` is also simplified — `composite`, `outFile`, and the plexus
`references` entry are all removed. `noEmit: true` is added. The file now only overrides
`isolatedModules: false` (Vite requires `true`; full cross-file type checking requires `false`).

`"main": "lib/index.js"` in `packages/plexus/package.json` is now dead weight (nothing reads it) and
will be cleaned up in PR E along with tsconfig housekeeping.

---

### ✅ 2. ESLint Config Consolidation — preparatory cleanup ([#3681](https://github.com/jaegertracing/jaeger-ui/pull/3681))

**Implemented in full.** All three legacy ESLint config files are deleted; the root `eslint.config.js`
now covers both packages. This is a preparatory step — the consolidated flat config will be the thing
replaced by Oxlint in PR C.

#### Changes made

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

### 3. Replace ESLint with Oxlint (PR C1)

Oxlint is the linting component of the Vite+ toolchain. It is Rust-based and has no dependency on
`@typescript-eslint`, directly unblocking TypeScript 6/7 upgrades.

Key considerations:

- Oxlint supports 600+ ESLint-compatible rules including React hooks rules (`rules-of-hooks`,
  `exhaustive-deps`). Rule-by-rule audit needed to confirm parity with the current active ruleset.
- `eslint-disable` inline comments in source files will need to be migrated or removed.
- CI `lint` script and `lint-staged` hooks will need updating.

See [Unknown 2](#unknown-2-oxlint-rule-coverage) for the rule coverage investigation.

---

### 4. Replace Prettier with Oxfmt (PR C2)

Oxfmt is the formatting component of the Vite+ toolchain. It is Prettier-compatible (same output for
most cases). This PR is independent of C1 and D — Prettier has no version-lag problem, so there is no
urgency. Can be done any time.

Key considerations:

- Existing `prettier` config in root `package.json` maps to Oxfmt config; verify output parity.
- `husky` pre-commit hooks and `lint-staged` config will need updating.
- CI `prettier-lint` script will need updating.

---

### 5. Upgrade TypeScript (PR D)

Once `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` are removed from the dependency
tree (after PR C), TypeScript can be upgraded freely without waiting for plugin compatibility.

Target: TypeScript 6.x (current blocking dependency is `@typescript-eslint`).
Stretch: TypeScript 7 (Project Corsa) — native Go-based type checker; Vite+ is designed for this.

---

### 6. TypeScript Config Simplification (PR E)

#### Current dual-tsconfig in `jaeger-ui`

The reason `packages/jaeger-ui/tsconfig.lint.json` exists is that:

- Vite requires `isolatedModules: true` for correct behavior.
- Full cross-file type checking (e.g. const enums, exhaustive narrowing) requires `isolatedModules: false`.

`tsc-lint` runs `tsc -p packages/jaeger-ui/tsconfig.lint.json` (with `noEmit: true`) rather than using
project references (`tsc --build`). Project references were dropped because `composite: true` conflicts with
`noEmit: true` and cross-package `paths` mappings.

With Vitest, `isolatedModules` is no longer a Vite runtime constraint for the testing workflow. This opens
the door to collapsing the two tsconfig files into one.

**Possible simplification**: Remove `tsconfig.lint.json` entirely and run `tsc -p tsconfig.json --noEmit`
for type-checking, after adding `isolatedModules: false` (or removing it) from the main tsconfig.

This needs to be validated — see [Unknown 1](#unknown-1-tsconfig-consolidation----removing-tsconfiglintjson).

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

### 8. Both Packages — Replace Jest + Babel with Vitest (PR F)

**Deferred.** The migration is the correct long-term direction but carries significant effort:

- `jest.fn()` → `vi.fn()` across the test suite
- `@testing-library/jest-dom` import path changes
- `importMetaTransform` Babel plugin in `test/babel-transform.js` is eliminated (Vitest runs native ESM)
- Snapshot files may need regeneration
- See Unknowns 3–6 for the investigation plan

Both packages continue to use Jest 30 + `babel-jest` until PR F is ready.

---

### 9. Documentation Changes (PR G)

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

### Unknown 1: tsconfig consolidation — removing `tsconfig.lint.json`

**Risk**: Folding `isolatedModules: false` into `tsconfig.json` may conflict with Vite's own tsconfig
interpretation (Vite reads `tsconfig.json` for path aliases and plugin resolution, and may warn on
unexpected compiler options).

**Experiment**:
1. In a branch, merge `tsconfig.lint.json` settings into `packages/jaeger-ui/tsconfig.json`.
2. Update `tsc-lint` in root `package.json` to point directly at `packages/jaeger-ui/tsconfig.json`.
3. Run `npm run tsc-lint` and `npm run build` in `jaeger-ui` and confirm both pass.
4. Run `npm start` and confirm the Vite dev server does not log tsconfig-related warnings.

**Success criteria**: `tsc -p packages/jaeger-ui/tsconfig.json --noEmit` succeeds with one tsconfig per
package; Vite build is unaffected.

---

### Unknown 2: Oxlint rule coverage

**Risk**: Oxlint may not have direct equivalents for all currently active ESLint rules. The most critical
rules to verify are `react-x/rules-of-hooks` and `react-x/exhaustive-deps`.

**Experiment**:
1. Audit the active rules in root `eslint.config.js` (those set to `error` or `warn`, not `off`).
2. For each active rule, confirm the Oxlint equivalent rule name and that it is available in the Vite+
   version in use.
3. Run `oxlint` on the codebase and compare findings against current ESLint warnings.

**Success criteria**: All currently-enforced rules have Oxlint equivalents, or a deliberate decision is
made to drop each one that does not.

---

### Unknown 3: Vitest snapshot compatibility

**Risk**: Vitest's snapshot serializer may produce subtly different output for component snapshots compared
to Jest's `jest-snapshot`. Existing `.snap` files may need to be regenerated even if functionally equivalent.

**Experiment**:
1. Run `vitest run` and observe which snapshot tests fail with "1 snapshot obsolete" vs actual content
   mismatches.
2. Run `vitest run --update` to regenerate snapshots and diff against the originals.

**Success criteria**: Snapshot diffs are limited to whitespace or serializer formatting differences, not
semantic regressions. After update, all snapshot tests pass.

---

### Unknown 4: Vitest jsdom API coverage for existing test setup

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

### Unknown 5: `transformIgnorePatterns` equivalents in Vitest

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

### Unknown 6: `@vitejs/plugin-legacy` interaction with Vitest

**Risk**: `packages/jaeger-ui/vite.config.mts` currently uses `@vitejs/plugin-legacy` to emit a legacy
browser bundle. Vitest ignores `transformIndexHtml` hooks so the plugin should be harmless, but this needs
confirming.

**Experiment**: Run `vitest run` with the existing `vite.config.mts` (which includes `plugin-legacy`) and
confirm no errors or unexpected HTML injection.

---

## Consequences

### Positive (full migration)

- **Single dependency**: Replace `eslint`, `prettier`, `typescript-eslint`, `babel`, `jest` and ~25 related
  packages with `viteplus`.
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
| C1 | Replace ESLint with Oxlint | Unknown 2 | After investigation |
| C2 | Replace Prettier with Oxfmt | None | Independently, any time |
| D  | Upgrade TypeScript (6 / 7) | None | After C1 |
| E  | Consolidate `jaeger-ui` tsconfigs | Unknown 1 | After investigation (easier after F) |
| F  | Migrate Jest → Vitest in both packages; remove Babel test deps | Unknowns 3, 4, 5, 6 | Deferred |
| G  | Update CLAUDE.md, README, CI workflows | None | After F |

PR C1 is the next concrete step — it unblocks D (TypeScript upgrade) and delivers the biggest CI speedup.
PR C2 (Oxfmt) can be done any time independently. PRs C1 and D deliver substantial value independently
of the Vitest migration.

### Investigation strategy

- **Unknown 2** (Oxlint rules): Can be validated in a branch by running `oxlint` alongside ESLint and
  comparing output. C2 (Oxfmt) has no unknowns and can proceed independently at any time.
- **Unknown 1** (tsconfig): A single branch experiment — merge the two tsconfig files and run `tsc-lint`
  + Vite build.
- **Unknowns 3–6** (Vitest): Validate together in a single throwaway branch by porting the test setup for
  one package and running the full suite.

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
