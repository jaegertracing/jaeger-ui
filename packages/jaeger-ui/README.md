# Jaeger UI

## Entry point — index.html

[index.html](./index.html) is the single HTML page that bootstraps the application. It does three things before any JavaScript bundle loads:

1. **Base-path detection** — an inline `<script>` inspects `window.location.pathname` and injects a `<base href="…">` element so that relative asset URLs resolve correctly regardless of the URL prefix under which Jaeger is served. This makes the UI work behind a reverse proxy that exposes it at an arbitrary path (e.g. `/jaeger/`) without any backend configuration. See [ADR-009](https://github.com/jaegertracing/jaeger/blob/main/docs/adr/009-ui-base-path-auto-detection.md) for the design rationale.

2. **Runtime configuration** — three JavaScript functions (`getJaegerUiConfig`, `getJaegerStorageCapabilities`, `getJaegerVersion`) are defined with stub return values. The Jaeger backend replaces those stubs with real data via search-and-replace before serving the file, injecting deployment-specific configuration without a separate API round-trip.

3. **SPA mount fallback** — if the React application fails to mount (e.g. due to an unresolvable asset path or an invalid URL), a plain-text error message is shown in `#jaeger-ui-root` instead of a blank page.

## Configuration

The UI supports customization via custom configuration as either JSON or Javascript file. Refer to [documentation](https://www.jaegertracing.io/docs/latest/deployment/frontend-ui/) for the full syntax.

The configuration is loaded into a `Config` object (see [src/types/config.tsx](./src/types/config.tsx) for the complete schema). This object is returned by the top-level function `getJaegerUiConfig` defined in [index.html](./index.html). By default this function just returns null, but its source is manipulated by the Jaeger backend such that the values are injected dynamically via search-replace. The returned value is then merged with [defaults](./src/utils/config/get-config.tsx) into the redux `state.config`.

### Configuration as JSON

When the config file has `.json` extension, Jaeger looks for the statement `JAEGER_CONFIG = DEFAULT_CONFIG` and replaces the right-hand side with the content of the loaded config file, which must contain a valid JSON.

### Configuration as Javascript

When the config file has `.js` extension, the `jaeger` binary looks for the comment `// JAEGER_CONFIG_JS` and replaces it with the verbatim content of the loaded file. The file **must define a top-level `UIConfig()` function** that returns a `Config` object. This allows more complex integrations by actually executing some custom code. For example, `tracking.customWebAnalytics` allows to hook up a different implementation of the tracking component.

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

2. **`jaeger-ui.config.js`** - A JavaScript file that defines a `UIConfig()` function (supports more complex configurations):

   ```javascript
   function UIConfig() {
     return {
       dependencies: {
         menuEnabled: true,
       },
       tracking: {
         customWebAnalytics: function (config, versionShort, versionLong) {
           // Custom analytics implementation
           return {
             init: function () {},
             isEnabled: function () {
               return true;
             },
             context: null,
             trackPageView: function (pathname, search) {},
             trackError: function (description) {},
             trackEvent: function (category, action, labelOrValue, value) {},
           };
         },
       },
     };
   }
   ```

   A working example that logs all events to the browser console is provided at [jaeger-ui.config.console-analytics.js](./jaeger-ui.config.console-analytics.js).

**Note:** If both files exist, `jaeger-ui.config.js` takes priority (same behavior as `query-service`).

An example JSON config file is provided at [jaeger-ui.config.example.json](./jaeger-ui.config.example.json). You can copy it to `jaeger-ui.config.json` and modify it as needed.

These local config files are ignored by git (see `.gitignore`).

### Ask Jaeger assistant (`ai`)

AI features are **off by default** (`ai.enabled: false`). Enable in UI config for local dev or production:

```json
{
  "ai": {
    "enabled": true
  }
}
```

When disabled, the header shows **Lookup by Trace ID…** only (no sparkles / Ask Jaeger panel). When enabled, the UI uses `/api/ai/chat` by default, or `VITE_JAEGER_AG_UI_URL` at build time.
