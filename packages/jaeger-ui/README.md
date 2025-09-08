# Jaeger UI

## Configuration

The UI supports customization via a `Config` object (see [src/types/config.tsx](./src/types/config.tsx) for the complete schema). This object is returned by the top-level function `getJaegerUiConfig` defined in [index.html](./index.html). By default this function just returns null, but its source is manipulated by the `query-service` such that the values are injected dynamically via search-replace. The returned value is then merged with [defaults](./src/utils/config/get-config.js) into the redux `state.config`.

`query-service` allows specifying custom configuration as either JSON or Javascript file.

### Configuration as JSON

When the config file has `.json` extension, `query-service` looks for the statement `JAEGER_CONFIG = DEFAULT_CONFIG` and replaces the right-hand side with the content of the loaded config file, which must contain a valid JSON.

### Configuration as Javascript

When the config file has `.js` extension, `query-service` looks for the comment `// JAEGER_CONFIG_JS` and replaces it with a function `UIConfig()` whose body is the content of the loaded file, which must contain a valid Javascript code that returns a Config object. This allows more complex integrations by actually executing some custom code. For example, `tracking.customWebAnalytics` allows to hook up a different implementation of the tracking component.
