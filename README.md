[![ReadTheDocs][doc-img]][doc] [![Build Status][ci-img]][ci] [![Coverage Status][cov-img]][cov]

# Jaeger UI 

Visualize distributed tracing with Jaeger.

## Development

The app was built with [create-react-app](https://github.com/facebookincubator/create-react-app).

### Running the application

Fork, then clone the `jaeger-ui` repo and change directory into it.
```
git clone https://github.com/uber/jaeger-ui.git
cd jaeger-ui
```

Install `npm` dependencies via npm or yarn:
```
npm install
```

Make sure you have the Jaeger Query service running on port 3001. If you don't have it running locally, then tunnel to the correct host and port.

```
ssh -fN -L 3001:localhost:$JAEGER_BACKEND_PORT $JAEGER_BACKEND_HOST
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

Running build will output all the static files to the `./build` directory:

```
npm install
npm run build
```

### Dockerfile

To generate a Docker image, run:

```bash
docker build -t yournamespace/jaeger-ui .
```

You can run it as:
```bash
docker run --rm -p 8080:8080 yournamespace/jaeger-ui
```

#### Enable Google Analytics

To enable Google Analytics tracking, set the `REACT_APP_GA_ANALYTICS_ID` env variable with your GA tracking ID before running the build:

```
export REACT_APP_GA_ANALYTICS_ID = UA-*******-**
npm run build
```

[![Build Status](https://travis-ci.org/uber/jaeger-ui.svg?branch=master)](https://travis-ci.org/uber/jaeger-ui)


[doc-img]: https://readthedocs.org/projects/jaeger/badge/?version=latest
[doc]: http://jaeger.readthedocs.org/en/latest/
[ci-img]: https://travis-ci.org/uber/jaeger-ui.svg?branch=master
[ci]: https://travis-ci.org/uber/jaeger-ui
[cov-img]: https://coveralls.io/repos/uber/jaeger-ui/badge.svg?branch=master
[cov]: https://coveralls.io/github/uber/jaeger-ui?branch=master
