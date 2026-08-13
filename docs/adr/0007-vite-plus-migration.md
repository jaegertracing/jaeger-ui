# ADR-0007: Vite+ Toolchain

* **Status**: Implemented — graduated from [RFC 0005](../rfc/0005-vite-plus-migration.md)
* **Date**: 2026-04-02

## Context

The monorepo used to run a different tool for each concern: Vite for the dev server and production build of `jaeger-ui`, Webpack + Babel CLI for a `plexus` library build, ESLint + `@typescript-eslint` for linting, Prettier for formatting, and Jest + Babel for tests. Two costs came out of that spread. Lint and format ran in Node and took tens of seconds in CI. More importantly, `@typescript-eslint/parser` has to be updated for each new TypeScript release and lags it by weeks to months, so the linter dictated when the repo could upgrade TypeScript.

Jest was also a second transform pipeline with its own semantics, which meant maintaining workarounds — notably a custom Babel plugin for `import.meta.NODE_ENV` in ESM-only packages — that the production build did not need.

[RFC 0005](../rfc/0005-vite-plus-migration.md) proposed replacing all of it with Vite+ and carries the per-PR plan and the unknowns that had to be resolved. This ADR records the toolchain that resulted.

## Decision

Use **Vite+** (the `vp` CLI from [viteplus.dev](https://viteplus.dev)) as the single toolchain for the monorepo, with one tool per concern and no per-package variation:

| Concern | Tool | Invoked by |
| --- | --- | --- |
| Dev server and production build | Vite (Rolldown engine) | `pnpm start`, `pnpm run build` |
| Tests | Vitest, jsdom environment | `pnpm test` |
| Linting | Oxlint | `vp lint` via `pnpm run oxlint` |
| Formatting | Oxfmt | `vp fmt` via `pnpm run fmt` |
| Type checking | `tsc --noEmit`, one config per package | `pnpm run tsc-lint` |

Webpack, Babel, ESLint, `@typescript-eslint`, Prettier, and Jest are removed from the dependency tree, along with the Babel `import.meta` transform they required.

Four consequences of that choice are load-bearing and are the reason the setup looks the way it does:

**Linter and formatter configuration lives in the root `vite.config.ts`.** When `vp` invokes Oxfmt and Oxlint it reads their configuration from the `fmt` and `lint` named fields of the root config rather than from `.oxfmtrc.json` / `.oxlintrc.json`, so those files do not exist. One file is the single source of truth for build, format, and lint settings; to exclude a path from formatting, add it to `fmt.ignorePatterns`.

**`packages/plexus` has no build.** It is not published to npm and its only consumer is `jaeger-ui`, which resolves it through a `paths` alias to `../plexus/src`, so nothing ever read the built `lib/`. The whole Webpack + Babel CLI pipeline produced unused output and was deleted rather than ported; the package is marked `private: true` and its tsconfig is a pure type-check config.

**Type checking runs per package, not as a project graph.** `tsc-lint` invokes `tsc -p` once per package. TypeScript project references would require `composite: true`, which conflicts with both `noEmit: true` and the cross-package `paths` mapping that lets `jaeger-ui` type-check against plexus source.

**Vite ignores `isolatedModules`.** It transpiles with esbuild rather than `tsc`, so the setting has no effect on the build or the dev server. That is why `jaeger-ui` needs only one `tsconfig.json`; the separate `tsconfig.lint.json` that existed to hold a different value for it was unnecessary and is gone.

## Consequences

- Lint time dropped from tens of seconds to under a second, and roughly 25 packages left the dependency tree.
- TypeScript upgrades are no longer gated on a linter plugin. TypeScript 6 landed immediately after ESLint was removed, and `moduleResolution` moved from the deprecated `"node"` to `"bundler"`, which is what Vite actually does.
- Tests and the production build share one transform pipeline, so a test can no longer pass or fail because Babel and esbuild disagree.
- Test files containing JSX must use a `.jsx` / `.tsx` extension — esbuild does not parse JSX in `.js`. This is why the suite was renamed en masse and why new tests follow the same rule.
- The test suite kept its Jest-style call sites. `test/vitest-setup.ts` aliases `global.jest = vi`, so `jest.fn()` and friends still work; `vi.mock()` is the exception, because Vitest hoists that call pattern statically and cannot hoist `jest.mock()`.
- Oxlint is not rule-for-rule identical to the ESLint config it replaced. It reports more warnings, mostly Jest correctness rules the old config never enabled. The mapping table is in [RFC 0005](../rfc/0005-vite-plus-migration.md), under "Unknown 2: Oxlint rule coverage".
- Vite+ is a single dependency wrapping four tools, so the repo now takes their release cadence together rather than separately.

## References

- [RFC 0005: Migrate to Vite+](../rfc/0005-vite-plus-migration.md) - the migration plan, per-PR breakdown, alternatives, and resolved unknowns
- [Vite+ documentation](https://viteplus.dev)
- [`BUILD.md`](../../BUILD.md) - day-to-day commands
