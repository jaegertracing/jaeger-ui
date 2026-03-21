# Build Considerations: `./packages/plexus`

**Note:** File references are relative to `./packages/plexus`; `./` refers to `./packages/plexus`.

The package is implemented in TypeScript and must be compiled to JavaScript.

There are three build scenarios:

- Production ES modules
  - **This is the project's default export as `./lib/index.js`.** This build is not bundled and therefore does not use Webpack.
- Production UMD module
- Webpack dev server
  - Runs `./demo/src/index.tsx` which has a few example graphs.

The layout worker (`./src/LayoutManager/layout.worker.ts`) is loaded as a Web Worker using the native `new Worker(new URL('./layout.worker.ts', import.meta.url))` pattern in `Coordinator.ts`. Both Vite and Webpack 5 recognize this pattern at build time, automatically bundling the worker and its dependencies (e.g. `@viz-js/viz`) into a separate chunk. No additional loaders are required.

In jaeger-ui, the Vite config aliases `@jaegertracing/plexus` to the source directory, so Vite processes the `.ts` worker file directly. In the compiled ES module output (`./lib`), the worker file is emitted as `./lib/LayoutManager/layout.worker.js` and consumers' build tools are expected to handle the worker bundling.

## Babel

Babel is used to transpile the TypeScript for all scenarios. See `babel.config.js` for specifics.

The production ES module build is not bundled and therefore does not use Webpack.

## Webpack

Webpack is used to:

- Bundle the production UMD module
- Run the Webpack dev server during development

`./webpack-factory.js` is used to generate the Webpack configurations for each scenario.

## TypeScript `--emitDeclarationOnly`

Compiling TypeScript via Babel does not allow for type declarations to be generated. So, `tsc` is used with `./tsconfig.json` to generate the type defs.

This only applies to the ES module production build, output to `./lib`.

Note: `./tsconfig.json` does not extend `../../tsconfig.json`.

## `package.json`

### Scripts

- `build` — Generates the UMD bundle and ES module production builds
- `prepublishOnly` — Executed after `npm install` is run in the project root; runs the `build` script
- `start` — Starts the Webpack dev server and watches all files, including `layout.worker`

The `_tasks/*` scripts are not intended to be run, directly.

- `_tasks/clean/*`
  - Remove generated files
- `_tasks/build/*`
  - Generates the production ES and UMD builds
- `_tasks/dev-server`
  - Starts the Webpack dev server

### Dependencies (dev and otherwise)

#### `viz.js@1.8.1`

This specific version of [viz.js](https://github.com/mdaines/viz.js) is used to avoid a regression. Meanwhile, [looks like `2.x.x`](https://github.com/mdaines/viz.js/issues/120#issuecomment-389281407) has recovered a lot of ground; [GitHub ticket](https://github.com/jaegertracing/jaeger-ui/issues/339) to upgrade.

#### `jest@23.6.0`

Jest is not actually be used, yet. Present as a placeholder. ([Ticket](https://github.com/jaegertracing/jaeger-ui/issues/340))

## `.eslintrc.js`

Configures ESLint for TypeScript. ESLint is executed from the project root, but this file is merged with the project root `.eslintrc.js` and overrides where there is overlap.

`prettier/@typescript-eslint` needs to be last in the `extends` so it overrides the formatting rules from `plugin:@typescript-eslint/recommended`.

Uses [`@typescript-eslint/parser`](https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/parser) as the parser.

The `tsconfigRootDir: '.'` refers to the project root because that is where ESLint is executed, from. And, the `tsconfig.json` referred to by `./.eslintrc.js` is that in the project root.
