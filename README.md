# Jaeger UI Archive Button Fix

This repository contains a fix for the issue with the Archive button being enabled by default for in-memory storage in Jaeger UI.

## The Issue

After upgrading Jaeger from 1.51 to 1.54 (which updated UI from 1.35 to 1.38), the Archive button is enabled by default for in-memory storage, which is problematic because:

1. In-memory storage is volatile - archived traces won't persist between Jaeger restarts
2. This contradicts the documentation which states Archive support is disabled by default
3. Users might be confused about the reliability of the archive feature with in-memory storage

## The Fix

The fix modifies how the UI determines whether to show the Archive button:

1. If `archiveEnabled` is explicitly set in the config (to either `true` or `false`), respect that setting
2. For in-memory storage, disable the Archive button by default, regardless of backend capability
3. For other storage types, respect the backend capability

## Implementation Details

### 1. Updated `getArchivedEnabled` function in `get-config.js`

```javascript
export function getArchivedEnabled(config, capabilities) {
  // Check if archive is explicitly set in config
  if (config && typeof config.archiveEnabled === "boolean") {
    return config.archiveEnabled;
  }
  
  // Check if the backend is using in-memory storage
  if (capabilities && capabilities.storage && capabilities.storage.type === "memory") {
    return false;
  }
  
  // For other storage types, respect backend capability
  return Boolean(capabilities && capabilities.archiveStorage && capabilities.archiveStorage.enabled);
}
```

### 2. Set `archiveEnabled` to `null` in default config

This allows the function to determine the appropriate behavior based on storage type:

```javascript
export default {
  // Setting archiveEnabled to null means:
  // 1. Respect backend capability for non-memory storage
  // 2. Disable for in-memory storage (handled in getArchivedEnabled function)
  archiveEnabled: null,
  // ... other config options
}
```

### 3. Updated `TracePageHeader.jsx` to use the function

The component now uses `getArchivedEnabled` to determine if the Archive button should be shown.

## How to Apply the Fix

1. Update `packages/jaeger-ui/src/utils/config/get-config.js`:
   - Add or update the `getArchivedEnabled` function as shown above

2. Update `packages/jaeger-ui/src/constants/default-config.js`:
   - Set `archiveEnabled` to `null` in the default configuration

3. Update `packages/jaeger-ui/src/components/TracePage/TracePageHeader/TracePageHeader.jsx`:
   - Ensure it's using the `getArchivedEnabled` function

4. Add tests in `packages/jaeger-ui/src/utils/config/get-config.test.js`:
   - Add comprehensive tests for the `getArchivedEnabled` function

## Testing

The tests verify:
- Explicit configuration settings are respected
- In-memory storage has the Archive button disabled by default
- Other storage types respect the backend capability
- Edge cases with missing or incomplete data are handled gracefully

## Documentation Update Needed

The Jaeger documentation at https://www.jaegertracing.io/docs/1.60/frontend-ui/#archive-support should be updated to clarify:

1. Archive support is disabled by default for in-memory storage
2. For other storage types, it respects the backend capability
3. The `archiveEnabled` config option can be used to explicitly enable or disable the feature