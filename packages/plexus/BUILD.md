# Build Considerations: `./packages/plexus`

The package is implemented in TypeScript and must be compiled to JavaScript. The build output goes into `./build` as one main file, `./build/index.js`.

**Note:** File references are relative to `./packages/plexus`. E.g. `./` is actually referring to `./packages/plexus`, relative to the project root.

## Neutrino

[Neutrino](https://master.neutrinojs.org/) is used to build `plexus`. The [release candidate for `v9`](https://github.com/neutrinojs/neutrino/milestone/6) is used.

While Neutrino intends to allow for "zero initial configuration", that turned out not to be the case for `plexus`.

`.neutrinorc.js` has a fair bit of configuration. It's well commented, so it won't be rehashed, here.

### `webpack.config.js`

**Configures the webpack entry point.** Neutrino is used to generate the webpack config, but there were challenges in using it to set a non-Neutrino default entry point.

### `worker-alias`

`worker-alias` is set up as a webpack alias in `.neutrinorc.js`. This alias matches a declaration in the project root: `../../typings/custom.d.ts`. See `../../BUILD.md` for details.

## `package.json`

### Script `prepublishOnly`

Executed after `yarn install` is run in the project root.

### Dependencies (dev and otherwise)

#### `viz.js@1.8.1`

This specific version of [viz.js](https://github.com/mdaines/viz.js) is used to avoid a regression. Meanwhile, [looks like `2.x.x`](https://github.com/mdaines/viz.js/issues/120#issuecomment-389281407) has recovered a lot of ground.

#### `worker-loader`

[`worker-loader`](https://github.com/webpack-contrib/worker-loader) is a webpack plugin that allows a file to be imported as a class which, when instantiated, creates a WebWorker from the underlying source.

#### `@babel/preset-typescript`

TypeScript is compiled through Babel via [`@babel/preset-typescript`](https://babeljs.io/docs/en/babel-preset-typescript). **The TypeScript compiler is not used to compile TS files.** Note: `tsc` is used to compliment the use of ESLint to lint TypeScript, though.

#### `jest@23.6.0`

Jest is not actually be used, yet. Present as a placeholder.

## `.eslintrc.js`

Configures ESLint for TypeScript. ESLint is executed from the project root, but this file is merged with the project root `.eslintrc.js` and overrides where there is overlap.

Uses [`@typescript-eslint/parser`](https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/parser) as the parser.

It's worth noting that the `tsconfig.json` is in the project root and `tsconfigRootDir: '.'` refers to the project root.

`prettier/@typescript-eslint` needs to be last in the `extends` so it overrides the formatting rules from `plugin:@typescript-eslint/recommended`.
