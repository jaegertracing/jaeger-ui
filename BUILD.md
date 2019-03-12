# Build Considerations: Project Root

`yarn` is used instead of `npm`.

## `package.json`

### Dependencies (dev and otherwise)

#### `@typescript-eslint/eslint-plugin`

ESLint is being used to lint the repo, as a whole. Within `./packages/plexus` (for now), [`@typescript-eslint/eslint-plugin`](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin) is used to apply ESLint to TypeScript. This application is localized to plexus via configuring `./packages/plexus/.eslintrc.js` for TypeScript, which means the change in settings is only applied to subdirectories of `./packages/plexus`. This package works really well, but there are quite a few issues it doesn't catch. For that, we use the TypeScript compiler.

#### `typescript`

The TypeScript package (e.g. `typescript`) is **not for compiling** TypeScript source but is included for the purpose of bolstering the linting of TypeScript files. `tsc` catches quite a few issues that ESLint does not pick up on.

### Workspaces

[Create React App](https://facebook.github.io/create-react-app/) (CRA) is used as the build-tooling for the Jaeger UI website. In 2.1.2+ CRA introduced a guard for the `start`, `build` and `test` scripts which checks the version of NPM packages available to make sure they're consistent with CRA's expectations ([reference](https://github.com/facebook/create-react-app/blob/dea19fdb30c2e896ed8ac75b68a612b0b92b2406/packages/react-scripts/scripts/utils/verifyPackageTree.js#L23-L29)). This process checks `node_modules` in parent directories and errors if an unexpected package version is encountered.

To avoid a world of pain, the [`nohoist`](https://yarnpkg.com/blog/2018/02/15/nohoist/#scope-private) feature of `yarn` workspaces is leveraged. CRA and it's dependencies are local to `./packages/jaeger-ui/node_modules` instead of `./node_modules`, i.e. they're not hoisted. This ensures CRA is using the packages it expects to use.

Unfortunately, the CRA check is not savvy to `yarn` workspaces and errors even though the _`yarn` workspace-magic_ ensures the right packages are actually used by the CRA scripts. So, the escape hatch provided by CRA is used to skip the check: the envvar `SKIP_PREFLIGHT_CHECK=true`, set in `./packages/jaeger-ui/.env`.

### Scripts

#### `build`

`lerna run build` executes the build in each of `./packages/*` sub-packages.

#### `eslint`

This applies ESLint to the repo, as a whole. The TypeScript linting has a distinct configuration, which is a descendent of `./.eslintrc.js`. See [TypeScript](#typescript), above.

#### `lint`

This is an amalgamation of linting scripts that run to make sure things are all-good. It's run in CI (travis) and as part of a pre-commit hook.

- `prettier-lint`
- `tsc-lint`
- `eslint`
- `flow`
- `check-license`

#### `prepare`

Runs after the top-level `yarn install`. This ensures `./packages/plexus` builds and is available to `./packages/jaeger-ui`.

#### `prettier-comment`, `prettier`, `prettier-lint`

`prettier-comment` is just an explanation for why the `./node_module/.bin/bin-prettier.js` path is used instead of just `yarn prettier etc`; it's due to an [issue with `yarn`](https://github.com/yarnpkg/yarn/issues/6300).

`prettier` formats the code.

`prettier-lint` runs `bin-prettier` in the `--list-different` mode, which only outputs filenames if they would be changed by prettier formatting. If any such files are encountered, the program exits with a non-zero code. This is handy for blocking CI and pre-commits.

#### `tsc-lint`, `tsc-lint-debug`

`tsc` is run with the [`--noEmit`](https://www.typescriptlang.org/docs/handbook/compiler-options.html) option to bolster linting of TypeScript files. See [TypeScript](#typescript), above.

`tsc-lint-debug` is for diagnosing problems with linking, resolving files, or aliases in TypeScript code. It lists the files involved in the compilation.

### `husky` . `hooks` . `pre-commit`

Runs the `lint` and `test` scripts.

## `.eslintrc.js`

Pretty basic. Needs to be cleaned up. The `airbnb` configuration needs to be updated.

Note: This configuration is extended by `./packages/plexus/.eslintrc.js`.

## `.flowconfig`

Being phased out.

## `.travis.yml`

Currently `./packages/plexus` doesn't have any tests... But, when it does, `.travis.yml` needs to be updated to send coverage info for all `./packages/*` to codecov.io. ([Ticket](https://github.com/jaegertracing/jaeger-ui/issues/340))

[`yarn install --frozen-lockfile`](https://yarnpkg.com/lang/en/docs/cli/install/#toc-yarn-install-frozen-lockfile) ensures installs in CI fail if they would typically mutate the lockfile.

## `lerna.json`

We should probably audit our use of `lerna` to make sure a) it's necessary and b) it's idiomatic if it is necessary. We have ended up relying quite a bit on `yarn` workspaces, which has reduced the relevance of `lerna`. ([Ticket](https://github.com/jaegertracing/jaeger-ui/issues/341))

## `tsconfig.json`

Used to configure the `tsc-lint` script and, in theory, the IDE (such as VS Code).

A few notable [compiler settings](http://www.typescriptlang.org/docs/handbook/compiler-options.html):

- `lib`
  - [es2017](https://github.com/Microsoft/TypeScript/blob/master/lib/lib.es2017.d.ts)
  - [dom](https://github.com/Microsoft/TypeScript/blob/master/lib/lib.dom.d.ts)
  - [dom.iterable](https://github.com/Microsoft/TypeScript/blob/master/lib/lib.dom.iterable.d.ts)
  - [webworker](https://github.com/Microsoft/TypeScript/blob/master/lib/lib.webworker.d.ts)
- `skipLibCheck` - Maybe worth reevaluating in the future
- `strict` - Very important
- `noEmit` - We're using this for linting, after all
- `include` - We've included `./typgings` here because it turned out to be a lot simpler than configuring `types`, `typeRoots` and `paths`

## `typings/{custom.d.ts, index.d.ts}`

This is relevant for `./packages/plexus/src/LayoutManager/layout.worker.js` and the `viz.js` package.

I wasn't able to get much in the line of error messaging, so I'm pretty vague on this.

The version of `viz.js` in use (1.8.1) ships with an `index.d.ts` file, but it has some issues. I was able to define alternate type declarations for `viz.js` in `./typings/custom.d.ts` and referring `./typings/index.d.ts` to `./typings/custom.d.ts`. I also changed the import for `viz.js` to `viz.js/viz.js`, which is importing it's main file, directly, instead of implicitly.

For `./packages/plexus/src/LayoutManager/layout.worker.js`, webpack (in `./packages/plexus`) is set up to use the [`worker-loader`](https://github.com/webpack-contrib/worker-loader) to load the file. This converts it to a `WebWorker` by instantiating the `WebWorker` with the source as a `Blob`. Consequently, `layout.worker.js` is implemented in the context of a `WorkerGlobalScope` but consumed as if it's a regular class that extends `Worker`. To deal with this mismatch, a **webpack alias** was created mapping `worker-alias/` to `./packages/plexus/src`. This allowed a type declaration to be defined for `worker-alias/*` as a subclass of `Worker`.
