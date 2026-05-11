# Span Decorations

Span decorations allow visual icons to be displayed next to spans in the trace timeline view based on span attributes (tags). This helps users quickly identify different types of operations, such as database calls, messaging, or AI-related spans.

## Configuration

Span decorations are configured via the `spanDecorations` property in the Jaeger UI configuration.

```json
{
  "spanDecorations": [
    {
      "entries": [
        { "key": "db.system", "value": ".*" }
      ],
      "icon": "io.Database",
      "tooltip": "Database Call"
    },
    {
      "entries": [
        { "key": "http.method", "value": "GET|POST" }
      ],
      "icon": "https://example.com/icons/http.svg",
      "tooltip": "HTTP Request"
    }
  ]
}
```

### Rule Evaluation

The span decoration engine follows these rules:

1.  **Order of Evaluation:** Rules are evaluated in the order they appear in the `spanDecorations` array.
2.  **First Match Wins:** The first rule that matches a span is used, and subsequent rules are ignored.
3.  **All Criteria Must Match (AND):** A rule matches a span only if **all** of its `entries` match.
4.  **Regex Matching:** Both the `key` and `value` in an entry are treated as regular expressions.
5.  **Attribute Search:** The engine searches for matches in both span attributes and resource attributes.

### Icons

The `icon` property can be one of:

1.  **Built-in Tokens:** Pre-defined icons bundled with Jaeger UI (e.g., `io.Database`, `io.Server`, `io.Cloud`).
2.  **External URLs:** A full URL starting with `http://` or `https://` pointing to an image (SVG, PNG, etc.).
3.  **Local Paths:** A path starting with `/` pointing to an asset served by the Jaeger UI server.

#### Supported Built-in Tokens

- `io.Server`: General server operation.
- `io.Database`: Database operations.
- `io.Cloud`: Cloud/External services.
- `io.Globe`: Web/HTTP requests.
- `io.PaperPlane`: Messaging/PubSub.
- `io.Swap`: RPC/Inter-service communication.
- `io.HardwareChip`: AI/Compute intensive tasks.
- `io.Shield`: Security/Auth operations.
- `io.Terminal`: CLI/System commands.
- `io.Settings`: Configuration/Internal tasks.

## Extensibility

Users can extend the span decorations purely via configuration by:
- Adding new rules to match custom attribute patterns.
- Using external URLs for custom icons not included in the built-in set.

For more complex heuristics, the Jaeger UI can be built with custom icons added to the internal registry in `IconProvider.tsx`.
