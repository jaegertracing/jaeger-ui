# Span Decorations

Span decorations allow visual icons to be displayed next to spans in the trace timeline view based on span attributes (tags). This helps users quickly identify different types of operations, such as database calls, messaging, or AI-related spans.

## Configuration

Span decorations are configured via the `spanDecorations` property in the Jaeger UI configuration.

### Where to define the configuration

The exact location of your configuration depends on how you are running the Jaeger UI:

- **Production (Jaeger Backend):** When running the Jaeger Query or Jaeger All-in-One binaries, you can provide a UI configuration file using the `--query.ui-config` command-line flag. This file must be valid JSON.
  ```bash
  jaeger-all-in-one --query.ui-config=/path/to/jaeger-ui.config.json
  ```

- **Local Development (Vite):** If you are running the UI standalone for frontend development (e.g., using `npm start`), the Vite dev server automatically reads from a `jaeger-ui.config.json` file located in the `packages/jaeger-ui/` directory. You can copy the provided `jaeger-ui.config.example.json` to create your own configuration.

### Configuration Schema

Once you have located or created your configuration file, you can add or modify the `spanDecorations` array at the top level:

```json
{
  "spanDecorations": [
    {
      "attributes": [
        { "key": "^(?:db\\.system)$", "value": ".*" }
      ],
      "icon": "io.Database",
      "tooltip": "Database Call"
    },
    {
      "attributes": [
        { "key": "^(?:http\\.method)$", "value": "GET|POST" }
      ],
      "icon": "https://example.com/icons/http.png",
      "tooltip": "HTTP Request"
    }
  ]
}
```

### Rule Evaluation

The span decoration engine follows these rules:

1.  **Order of Evaluation:** Rules are evaluated in the order they appear in the `spanDecorations` array. User-defined config rules are evaluated *before* the built-in default rules.
2.  **First Match Wins:** The first rule that matches a span is used, and subsequent rules are ignored. This allows you to easily override a built-in default icon.
3.  **All Criteria Must Match (AND):** A rule matches a span only if **all** of its `attributes` match.
4.  **Regex Matching:** Both the `key` and `value` in an attribute definition are treated as regular expressions.
5.  **Attribute Search:** The engine searches for matches in both span attributes and resource attributes.

### Icons

The `icon` property can be one of:

1.  **Built-in Tokens:** Pre-defined icons bundled with Jaeger UI (e.g., `io.Database`, `io.Server`, `di.Redis`).
2.  **External URLs:** A full URL starting with `http://` or `https://` pointing to an image (e.g., SVG, PNG).
3.  **Local Paths:** A path starting with `/` pointing to an asset served by the Jaeger UI server.

#### Supported Built-in Tokens

The complete list of built-in tokens is available in the [`IconProvider` source code](https://github.com/jaegertracing/jaeger-ui/blob/main/packages/jaeger-ui/src/components/common/IconProvider.tsx) under the `ICON_MAP` dictionary.

## Extensibility

Users can extend the span decorations purely via configuration by:
- Adding new rules to match custom attribute patterns.
- Using external URLs for custom icons not included in the built-in set.

For more complex heuristics, the Jaeger UI can be built with custom icons added to the internal registry in `IconProvider.tsx`.
