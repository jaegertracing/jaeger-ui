# History Package Migration Guide

## Overview

This document describes the migration from history v4 to v5 in the Jaeger UI project.

## Changes Made

1. Upgraded `history` package from v4.6.3 to v5.3.0
2. Created a polyfill to maintain compatibility with react-router-dom v5
3. Updated test files to use the new polyfill
4. Ensured compatibility with redux-first-history

## Polyfill Details

The polyfill (`src/utils/history-polyfill.ts`) provides:
- The `length` property (removed in v5)
- Compatible `push` and `replace` methods
- V4-compatible location shape
- Support for both browser and memory history

## Future Steps

1. Convert class components to functional components
2. Replace direct history usage with useNavigate hook
3. Upgrade to react-router-dom v6
4. Remove history polyfill
5. Eventually upgrade to react-router-dom v7

## Testing

After applying these changes:
1. Run `npm install` to update dependencies
2. Run `npm run test` to verify changes
3. Run `npm run lint` to check for any style issues

## Known Issues

1. The polyfill is a temporary solution until we can upgrade to react-router-dom v6/v7
2. Some components still use direct history access which should be migrated to hooks
3. Snapshot tests may need updating due to changes in history object structure

## References

- [History Package Documentation](https://github.com/remix-run/history/tree/main/docs)
- [React Router Migration Guide](https://reactrouter.com/docs/en/v6/upgrading/v5)
- [Redux First History](https://github.com/salvoravida/redux-first-history)