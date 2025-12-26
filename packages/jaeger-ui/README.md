# Jaeger UI

## Configuration

The UI supports customization via custom configuration as either JSON or Javascript file. Refer to [documentation](https://www.jaegertracing.io/docs/latest/deployment/frontend-ui/) for the full syntax.

The configuration is loaded into a `Config` object (see [src/types/config.tsx](./src/types/config.tsx) for the complete schema). This object is returned by the top-level function `getJaegerUiConfig` defined in [index.html](./index.html). By default this function just returns null, but its source is manipulated by the Jaeger backend such that the values are injected dynamically via search-replace. The returned value is then merged with [defaults](./src/utils/config/get-config.tsx) into the redux `state.config`.


### Configuration as JSON

When the config file has `.json` extension, Jaeger looks for the statement `JAEGER_CONFIG = DEFAULT_CONFIG` and replaces the right-hand side with the content of the loaded config file, which must contain a valid JSON.

### Configuration as Javascript

When the config file has `.js` extension, the Jaeger backend looks for the comment `// JAEGER_CONFIG_JS` and replaces it with a function `UIConfig()` whose body is the content of the loaded file, which must contain a valid Javascript code that returns a Config object. This allows more complex integrations by actually executing some custom code. For example, `tracking.customWebAnalytics` allows to hook up a different implementation of the tracking component.

### Configuration for Local Development

When running the UI in development mode via `npm start`, you can provide custom configuration without running the Jaeger backend. Create one of the following files in the `packages/jaeger-ui` directory:

1. **`jaeger-ui.config.json`** - A JSON file containing your config object:

   ```json
   {
     "dependencies": {
       "menuEnabled": true
     },
     "monitor": {
       "menuEnabled": false
     }
   }
   ```

2. **`jaeger-ui.config.js`** - A JavaScript file that returns a config object (supports more complex configurations):

   ```javascript
   return {
     dependencies: {
       menuEnabled: true,
     },
     tracking: {
       customWebAnalytics: function (config) {
         // Custom analytics implementation
         return {
           init: function () {},
           trackPageView: function (pathname, search) {},
           trackError: function (description) {},
           trackEvent: function (category, action, labelOrValue, value) {},
         };
       },
     },
   };
   ```

**Note:** If both files exist, `jaeger-ui.config.js` takes priority (same behavior as `query-service`).

An example JSON config file is provided at [jaeger-ui.config.example.json](./jaeger-ui.config.example.json). You can copy it to `jaeger-ui.config.json` and modify it as needed.

These local config files are ignored by git (see `.gitignore`).
