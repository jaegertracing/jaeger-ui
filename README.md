[![Build Status][ci-img]][ci] [![Coverage Status][cov-img]][cov] [![FOSSA Status][fossa-img]][fossa]

# Jaeger UI

Visualize distributed tracing with Jaeger.

|              Trace Search              |             Trace Details              |
| :------------------------------------: | :------------------------------------: |
| ![Trace Search](./media/ss_search.png) | ![Trace Details](./media/ss_trace.png) |

## Contributing

See [CONTRIBUTING](./CONTRIBUTING.md).

Stuck somewhere or found a bug? See [Getting in Touch](https://www.jaegertracing.io/get-in-touch/) on how to ask for help.

## Development

- [Prerequisites](#prerequisites)
- [Running the application](#running-the-application)
- [Running on Windows OS](#running-on-windows-os)

### Prerequisites
- [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm)
- [Node.JS](https://nodejs.org/en)
- npm package manager
- [yarn package manager](https://yarnpkg.com/)

The app was built with [create-react-app](https://github.com/facebookincubator/create-react-app).

### Running the application

Fork and/or clone the `jaeger-ui` repo and change directory into it.

```
git clone https://github.com/jaegertracing/jaeger-ui.git
cd jaeger-ui
```

Use the recommended Node versions: (defined in [.nvmrc](./.nvmrc) file):

```
nvm use
```

Install dependencies via `yarn`:

```
yarn install --frozen-lockfile
```

Make sure you have the Jaeger Query service running on http://localhost:16686. For example, you can run Jaeger all-in-one Docker image as described in the [documentation][aio-docs].

If you don't have it running locally, then tunnel to the correct host and port:

```
ssh -fN -L 16686:$BACKEND_HOST:$BACKEND_PORT $BACKEND_HOST
```

If you are using the [UI Base Path](https://www.jaegertracing.io/docs/1.7/deployment/#ui-base-path) feature, you need to append the base path into `jaeger-ui/jaeger-ui/vite.config.js` in `proxyConfig` object. For example, if the base path is `"/jaeger"`, then the `target` should be `"http://localhost:16686/jaeger"` and your `proxyConfig` object would be:

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

```
yarn start
```

The above command will run a web server on `http://localhost:5173` that will serve the UI assets, with hot reloading support, and it will proxy all API requests to `http://localhost:16686` where Jaeger query should be running.

#### Commands

| Command      | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `yarn start` | Starts development server with hot reloading and api proxy.         |
| `yarn test`  | Run all the tests                                                   |
| `yarn lint`  | Lint the project (eslint, prettier, typescript)                     |
| `yarn fmt`   | Apply Prettier source code formatting                               |
| `yarn build` | Runs production build. Outputs files to `packages/jaeger-ui/build`. |

### Running on Windows OS

While we don't natively support Windows OS for running the Jaeger UI Dev Environment, you can use Windows Subsystem for Linux (WSL) to run it.

Here are some steps to follow:
1. Install WSL: https://learn.microsoft.com/en-us/windows/wsl/install
2. Install Node.JS: https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl
3. Install Yarn: https://dev.to/bonstine/installing-yarn-on-wsl-38p2
4. Connect WSL Environment with VSCode: https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl#install-visual-studio-code
5. Use the WSL Terminal inside VSCode and [follow the Jaeger UI installation steps](#running-the-application)

## UI Configuration

See the [configuration guide](https://www.jaegertracing.io/docs/latest/frontend-ui/) for details on configuring Google Analytics tracking, menu customizations, and other aspects of UI behavior.

## License

[Apache 2.0 License](./LICENSE).

[ci-img]: https://github.com/jaegertracing/jaeger-ui/workflows/Unit%20Tests/badge.svg?branch=main
[ci]: https://github.com/jaegertracing/jaeger-ui/actions
[cov-img]: https://codecov.io/gh/jaegertracing/jaeger-ui/branch/main/graph/badge.svg
[cov]: https://codecov.io/gh/jaegertracing/jaeger-ui
[aio-docs]: https://www.jaegertracing.io/docs/latest/getting-started/
[fossa-img]: https://app.fossa.io/api/projects/git%2Bgithub.com%2Fjaegertracing%2Fjaeger-ui.svg?type=shield
[fossa]: https://app.fossa.io/projects/git%2Bgithub.com%2Fjaegertracing%2Fjaeger-ui?ref=badge_shield
