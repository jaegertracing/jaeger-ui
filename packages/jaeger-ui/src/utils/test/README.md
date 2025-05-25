# Redux State Factory for Testing

This directory contains utilities for generating Redux state data to be used in unit tests.

## Overview

The `state-factory.tsx` file provides a set of functions to create consistent Redux state objects that match the actual state shape used in the application. This helps make unit tests more reliable by ensuring they use consistent state data.

## Usage

### Basic Usage

```js
import { createState } from '../utils/test';

// Create a default state
const state = createState();

// Create a state with overrides
const stateWithOverrides = createState({
  config: { archiveEnabled: true },
  trace: { /* trace state overrides */ },
});
```

### Creating Specific State Slices

```js
import { 
  createTrace, 
  createTraceState, 
  createServicesState,
  createDependenciesState,
  createDdgState,
  createMetricsState,
  createPathAgnosticDecorationsState,
  createTraceSearchState
} from '../utils/test';

// Create a trace
const trace = createTrace('trace-id');

// Create a trace state entry
const traceState = createTraceState('trace-id', fetchedState.DONE, trace);

// Create a services state
const servicesState = createServicesState(['service1', 'service2'], {
  service1: ['operation1', 'operation2'],
  service2: ['operation3']
});

// Create a dependencies state
const dependenciesState = createDependenciesState([
  { parent: 'service1', child: 'service2', callCount: 10 }
]);

// Create a DDG state
const ddgState = createDdgState('key', fetchedState.DONE, { nodes: [], edges: [] });

// Create a metrics state
const metricsState = createMetricsState({ loading: true });

// Create a path agnostic decorations state
const decorationsState = createPathAgnosticDecorationsState({
  decoration1: { withOp: {}, withOpMax: 10 }
});

// Create a trace search state
const searchState = createTraceSearchState({ service: 'test' }, ['trace1', 'trace2']);
```

## Benefits

- Ensures tests use consistent state data that matches the actual Redux state shape
- Reduces code duplication across tests
- Makes tests more maintainable when the state shape changes
- Helps prevent regressions by ensuring all tests use the same state structure