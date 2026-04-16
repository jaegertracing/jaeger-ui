# How to Contribute to Jaeger UI

We'd love your help!

General contributing guidelines are described in [Contributing Guidelines](https://github.com/jaegertracing/jaeger/blob/main/CONTRIBUTING_GUIDELINES.md).

This document provides Jaeger UI-specific guidance to complement the general guidelines.

## Setup

### Prerequisites

- [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm)
- [Node.JS](https://nodejs.org/en)
- npm package manager

### Installation

Fork and/or clone the `jaeger-ui` repo and change directory into it.

```bash
git clone https://github.com/jaegertracing/jaeger-ui.git
cd jaeger-ui
```

Use the recommended Node versions: (defined in [.nvmrc](./.nvmrc) file):

```bash
nvm use
```

Install dependencies via `npm`:

```bash
npm ci
```

## Running the application

Make sure you have Jaeger running on http://localhost:16686. For example, you can run Jaeger all-in-one Docker image as described in [getting started documentation](https://www.jaegertracing.io/docs/latest/getting-started/).

If you don't have it running locally, then tunnel to the correct host and port:

```bash
ssh -fN -L 16686:$BACKEND_HOST:$BACKEND_PORT $BACKEND_HOST
```

If you are using the [UI Base Path](https://www.jaegertracing.io/docs/latest/deployment/configuration/#ui-base-path) feature, you need to append the base path into `jaeger-ui/jaeger-ui/vite.config.js` in `proxyConfig` object. For example, if the base path is `"/jaeger"`, then the `target` should be `"http://localhost:16686/jaeger"` and your `proxyConfig` object would be:

```js
const proxyConfig = {
  target: 'http://localhost:16686/jaeger',
  secure: false,
  changeOrigin: true,
  ws: true,
  xfwd: true,
};
```

Start the development server with hot loading:

```bash
npm start
```

The above command will run a web server on `http://localhost:5173` that will serve the UI assets, with hot reloading support, and it will proxy all API requests to `http://localhost:16686` where Jaeger query should be running.

## Development Commands

| Command | Description |
| --- | --- |
| `npm start` | Starts development server with hot reloading and api proxy. |
| `npm test` | Run all the tests |
| `npm test -w packages/jaeger-ui -- $file` | Run tests for a specific file, e.g. `npm test -w packages/jaeger-ui -- src/api/jaeger.test.js` |
| `npm run lint` | Lint the project (oxlint, oxfmt, typescript, knip) |
| `npm run fmt` | Format source code with Oxfmt |
| `npm run build` | Runs production build. Outputs files to `packages/jaeger-ui/build`. |
| `make bundle-stats` | Runs production build and outputs `packages/jaeger-ui/build/bundle-stats.csv` with per-package size breakdown (estimated post-minification bytes). |

## Code Coverage

This project uses Vitest for testing with Codecov integration for tracking.

| Command | Description |
| --- | --- |
| `npm test -- --coverage` | Run all tests with full coverage report |
| `npm test -w packages/jaeger-ui -- src/path/to/file.test.tsx` | Run a single test file |
| `npm test -w packages/jaeger-ui -- src/path/to/file.test.tsx --coverage --coverage.include="src/path/to/file.tsx"` | Run a single test file with coverage scoped to its source file |

Note: `-w packages/jaeger-ui` is required when passing a file pattern — without it, the root `npm test` also runs Vitest in `packages/plexus`, which finds no matching file and exits with an error. `--coverage.include` scopes which source files appear in the coverage report; it does **not** filter which tests run.

**Example**: `npm test -w packages/jaeger-ui -- src/components/DeepDependencies/Graph/DdgNodeContent/index.test.tsx --coverage --coverage.include="src/components/DeepDependencies/Graph/DdgNodeContent/index.tsx"`

## Running on Windows OS

While we don't natively support Windows OS for running the Jaeger UI Dev Environment, you can use Windows Subsystem for Linux (WSL) to run it.

Here are some steps to follow:

1. Install WSL: https://learn.microsoft.com/en-us/windows/wsl/install
2. Install Node.JS: https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl
3. Connect WSL Environment with VSCode: https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl#install-visual-studio-code
4. Use the WSL Terminal inside VSCode and [follow the Jaeger UI installation steps](#installation)

## Debugging

### Debug unit tests from VSCode

Use the following `launch.json` configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Vitest: current file",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run", "${file}"],
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}/packages/jaeger-ui"
    }
  ]
}
```

## Style Guide

Use [typescript](https://www.typescriptlang.org/) for new code. Check types via `npm run tsc-lint`.

We use [Oxfmt](https://viteplus.dev) for code formatting (part of the Vite+ toolchain). It can be applied via `npm run fmt`.

Most issues will be caught by the linter, which can be applied via `npm run oxlint`.

Finally, we generally adhere to the [Airbnb Style Guide](https://github.com/airbnb/javascript), with exceptions as noted in our `.oxlintrc.json` (Oxlint configuration).

## File Headers

If you are adding a new file it should have a header like below.

```
// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
```

## Cutting a Jaeger UI release

Please see [RELEASE.md](./RELEASE.md).
