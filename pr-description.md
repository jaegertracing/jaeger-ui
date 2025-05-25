# Add Redux State Factory for Unit Tests

## What changes were proposed in this pull request?

This PR adds a factory for generating Redux state data to be used in unit tests. This addresses issue #712 which requested the ability to create more relevant and reliable unit tests by ensuring they use consistent state data that matches the actual Redux state shape.

## Changes include:

1. Created a state factory utility (`state-factory.tsx`) that provides functions to generate Redux state objects
2. Added functions for creating each slice of the Redux state (config, trace, services, dependencies, etc.)
3. Added unit tests to ensure the factory functions work correctly
4. Added documentation to help developers understand how to use the factory

## How was this patch tested?

- Added unit tests for all factory functions
- Manually verified the generated state objects match the actual Redux state shape

## Screenshots

N/A

## Related issues

- Fixes jaegertracing/jaeger-ui#712