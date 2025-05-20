# Jaeger UI

## Archive Support

The Jaeger UI now handles the Archive button based on the following rules:

1. If `archiveEnabled` is explicitly set to `true` or `false` in the UI configuration, that setting is respected.
2. For in-memory storage backends, the Archive button is disabled by default.
3. For other storage types, the Archive button is enabled if the backend reports archive capability.

### Configuration Options

The archive feature can be configured in the UI config:

```json
{
  "archiveEnabled": true | false
}
```

- When set to `true`: Archive button is always enabled
- When set to `false`: Archive button is always disabled
- When not specified: 
  - For in-memory storage: Archive button is disabled
  - For other storage types: Archive button is enabled if the backend supports it

### Warning for In-Memory Storage

When using the Archive feature with in-memory storage, users will see a warning toast message indicating that archived traces will be lost when Jaeger restarts.

### Operator Configuration

When using the Jaeger Operator, you can configure the archive settings as follows:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
spec:
  strategy: allInOne
  allInOne:
    options:
      query:
        ui:
          archive:
            enabled: false  # Disable archive button regardless of backend capability
  # ...
```