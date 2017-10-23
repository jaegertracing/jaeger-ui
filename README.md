[![ReadTheDocs][doc-img]][doc] [![Build Status][ci-img]][ci] [![Coverage Status][cov-img]][cov]

# Jaeger UI

Visualize distributed tracing with Jaeger.

## Contributing

See [CONTRIBUTING](./CONTRIBUTING.md).

## Development

The app was built with [create-react-app](https://github.com/facebookincubator/create-react-app).

### Running the application

Fork, then clone the `jaeger-ui` repo and change directory into it.

```
git clone https://github.com/jaegertracing/jaeger-ui.git
cd jaeger-ui
```

Use the recommended npm and Node versions: (defined in [.nvmrc](./.nvmrc) file):

```
nvm use
```

Install dependencies via `npm` or `yarn`:

```
npm install
# or
yarn
```

Make sure you have the Jaeger Query service running on http://localhost:16686.
For example, you can run Jaeger all-in-one Docker image as descibed in the [documentation][aio-docs].

If you don't have it running locally, then tunnel to the correct host and port.

```
ssh -fN -L 16686:$BACKEND_HOST:$BACKEND_PORT $BACKEND_PORT
```

Start the development server with hot loading:

```
npm start
```

#### Commands

| Command | Description |
| ------- | ----------- |
| `npm start` | Starts development server with hot reloading and api proxy. |
| `npm test` | Runs all the test |
| `npm run lint` | Lint the project (eslint, prettier, flow) |
| `npm run build` | Runs production build. Outputs files to `/dist`. |


## Build

Running build will output all the static files to the `./dist` folder:

```
npm install
npm run build
```


#### Enable Google Analytics

To enable Google Analytics tracking, set the `REACT_APP_GA_ANALYTICS_ID` env variable with your GA tracking ID before running the build:

```
export REACT_APP_GA_ANALYTICS_ID = UA-*******-**
npm run build
```

[doc-img]: https://readthedocs.org/projects/jaeger/badge/?version=latest
[doc]: http://jaeger.readthedocs.org/en/latest/
[ci-img]: https://travis-ci.org/jaegertracing/jaeger-ui.svg?branch=master
[ci]: https://travis-ci.org/jaegertracing/jaeger-ui
[cov-img]: https://coveralls.io/repos/jaegertracing/jaeger-ui/badge.svg?branch=master
[cov]: https://coveralls.io/github/jaegertracing/jaeger-ui?branch=master
[aio-docs]: http://jaeger.readthedocs.io/en/latest/getting_started/
