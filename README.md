## WARNING: This is Alpha software and not intended for use until a stable release.

# Jaeger UI


Visualize distributed tracing with Jaeger. [See the demo](https://uber.github.io/jaeger-ui/).

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
