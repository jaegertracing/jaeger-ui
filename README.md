# History Package Upgrade

This PR upgrades the history package from v4.6.3 to v5.3.0 in the Jaeger UI project.

## Changes Made

1. Updated `history` dependency from v4.6.3 to v5.3.0 in package.json
2. Created a polyfill (`history-polyfill.ts`) to bridge API differences between history v4 and v5
3. Updated `configure-store.js` to use the polyfill
4. Fixed test cases that were failing due to API changes in history v5

## Implementation Details

The main issue was that history v5 has API changes that are incompatible with react-router-dom v5, which the project currently uses. The key difference is that history v5 doesn't have a `length` property, which was used in tests and possibly in the application code.

The polyfill adds the missing `length` property to the history object, making it compatible with code that expects the v4 API while using the v5 package.

## Future Considerations

This is a temporary solution until the project can be migrated to use react-router-dom v6+ with functional components and the useNavigate hook. The polyfill should be removed during that migration.

## Testing

All tests are now passing with the history v5 package.